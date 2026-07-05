// src/pages/admin/NormativaAggiornamenti.jsx
// Sezione "Aggiornamenti" della normativa: registro di cosa è cambiato e quando
// (tabella norme_aggiornamenti) + pulsante per richiedere un aggiornamento manuale
// (tabella norme_update_richieste, presa in carico dall'orchestratore).
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, StatCard } from '@/components/shared'
import {
    RefreshCw, CheckCircle2, AlertCircle, MinusCircle, PlusCircle,
    Clock, Flag, Archive, Play, Loader2
} from 'lucide-react'

const ESITO_STYLE = {
    aggiornato: { icon: CheckCircle2, cls: 'text-salvia bg-salvia/10 border-salvia/30', label: 'Aggiornato' },
    invariato:  { icon: MinusCircle,  cls: 'text-nebbia/60 bg-white/5 border-white/10', label: 'Invariato' },
    nuovo:      { icon: PlusCircle,   cls: 'text-oro bg-oro/10 border-oro/30',          label: 'Nuovo' },
    rimosso:    { icon: MinusCircle,  cls: 'text-oro bg-oro/10 border-oro/30',          label: 'Rimosso' },
    errore:     { icon: AlertCircle,  cls: 'text-red-400 bg-red-400/10 border-red-400/30', label: 'Da rivedere' },
}

const PAGINA = 50

export default function NormativaAggiornamenti() {
    const [righe, setRighe] = useState([])
    const [stats, setStats] = useState({ ultimo: null, aggiornati: 0, invariati: 0, errori: 0 })
    const [ambito, setAmbito] = useState('tutti')
    const [pagina, setPagina] = useState(0)
    const [totale, setTotale] = useState(0)
    const [loading, setLoading] = useState(true)

    const [richiestaPendente, setRichiestaPendente] = useState(null)
    const [inviando, setInviando] = useState(false)
    const [msg, setMsg] = useState(null)

    useEffect(() => { caricaTutto() }, [ambito, pagina])

    // mentre un aggiornamento è in coda/in corso, ricarica ogni 5s per l'avanzamento in diretta
    useEffect(() => {
        if (!richiestaPendente) return
        const t = setInterval(() => { caricaTutto() }, 5000)
        return () => clearInterval(t)
    }, [richiestaPendente?.id])

    async function caricaTutto() {
        setLoading(true)
        try {
            // feed del registro (paginato + filtro ambito)
            let q = supabase.from('norme_aggiornamenti')
                .select('id, ambito, codice, urn, titolo, esito, n_nuovo, n_modificato, n_rimosso, n_invariato, messaggio, eseguito_il', { count: 'exact' })
                .order('eseguito_il', { ascending: false })
                .range(pagina * PAGINA, pagina * PAGINA + PAGINA - 1)
            if (ambito !== 'tutti') q = q.eq('ambito', ambito)
            const { data, count } = await q
            setRighe(data ?? [])
            setTotale(count ?? 0)

            // statistiche: aggiornati/invariati negli ultimi 30 giorni;
            // "da rivedere" = casi APERTI ORA (ultimo stato per legge = errore,
            // dalla vista norme_aggiornamenti_ultimo), non gli errori storici già risolti
            const da = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
            const conta = async (esito) => {
                const { count: c } = await supabase.from('norme_aggiornamenti')
                    .select('id', { count: 'exact', head: true })
                    .eq('esito', esito).gte('eseguito_il', da)
                return c ?? 0
            }
            const { count: apertiOra } = await supabase.from('norme_aggiornamenti_ultimo')
                .select('id', { count: 'exact', head: true }).eq('esito', 'errore')
            const { data: ultimoRow } = await supabase.from('norme_aggiornamenti')
                .select('eseguito_il').order('eseguito_il', { ascending: false }).limit(1)
            setStats({
                ultimo: ultimoRow?.[0]?.eseguito_il ?? null,
                aggiornati: await conta('aggiornato'),
                invariati: await conta('invariato'),
                errori: apertiOra ?? 0,
            })

            // c'è già una richiesta in coda / in corso? (con avanzamento in diretta)
            const { data: rich } = await supabase.from('norme_update_richieste')
                .select('id, stato, richiesta_il, fase, progresso, aggiornato_il')
                .in('stato', ['in_attesa', 'in_corso'])
                .order('richiesta_il', { ascending: false }).limit(1)
            setRichiestaPendente(rich?.[0] ?? null)
        } finally {
            setLoading(false)
        }
    }

    async function richiediAggiornamento() {
        setInviando(true); setMsg(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('norme_update_richieste')
                .insert({ richiesta_da: user?.id, nota: 'richiesta dal pannello admin' })
            if (error) throw error
            setMsg({ ok: true, testo: 'Richiesta inviata: l\'aggiornamento partirà al prossimo controllo (entro ~30 minuti).' })
            await caricaTutto()
        } catch (e) {
            setMsg({ ok: false, testo: `Errore: ${e.message}` })
        } finally {
            setInviando(false)
        }
    }

    const fmtData = (iso) => iso ? new Date(iso).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—'

    return (
        <div className="space-y-5">
            <PageHeader label="Admin" title="Aggiornamenti normativa"
                subtitle="Registro delle sincronizzazioni con Normattiva: cosa è cambiato e quando" />

            {/* Statistiche ultimi 30 giorni */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Ultimo aggiornamento" value={fmtData(stats.ultimo)} colorClass="text-oro" />
                <StatCard label="Leggi aggiornate (30gg)" value={stats.aggiornati} colorClass="text-salvia" />
                <StatCard label="Verificate invariate (30gg)" value={stats.invariati} colorClass="text-nebbia" />
                <StatCard label="Da rivedere (aperti ora)" value={stats.errori}
                    colorClass={stats.errori > 0 ? 'text-red-400' : 'text-salvia'} />
            </div>

            {/* Pulsante richiesta aggiornamento */}
            <div className="flex items-center gap-4 bg-slate border border-white/5 p-4">
                {richiestaPendente ? (
                    <div className="flex flex-col gap-1 text-oro font-body text-sm">
                        <div className="flex items-center gap-2">
                            <Loader2 size={15} className="animate-spin" />
                            Aggiornamento {richiestaPendente.stato === 'in_corso' ? 'in corso' : 'in coda'}
                            <span className="text-nebbia/40">(richiesto il {fmtData(richiestaPendente.richiesta_il)})</span>
                        </div>
                        {richiestaPendente.stato === 'in_corso' && richiestaPendente.fase && (
                            <div className="pl-6 text-xs text-nebbia/60">
                                {richiestaPendente.fase}
                                {richiestaPendente.progresso ? ` — ${richiestaPendente.progresso}` : ''}
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={richiediAggiornamento} disabled={inviando}
                        className="flex items-center gap-2 px-4 py-2 font-body text-sm bg-oro/10 text-oro border border-oro/30 hover:bg-oro/20 transition-colors disabled:opacity-50">
                        {inviando ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Lancia aggiornamento
                    </button>
                )}
                {msg && (
                    <span className={`font-body text-xs ${msg.ok ? 'text-salvia' : 'text-red-400'}`}>{msg.testo}</span>
                )}
            </div>

            {/* Filtro ambito */}
            <div className="flex gap-1 bg-slate border border-white/5 p-1 w-fit">
                {[['tutti', 'Tutti', Clock], ['codice', 'Codici', Flag], ['archivio', 'Archivio', Archive]].map(([k, label, Icon]) => (
                    <button key={k} onClick={() => { setAmbito(k); setPagina(0) }}
                        className={`flex items-center gap-2 px-3 py-1.5 font-body text-xs transition-colors ${ambito === k ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                        <Icon size={12} /> {label}
                    </button>
                ))}
            </div>

            {/* Registro */}
            <div className="bg-slate border border-white/5 overflow-x-auto">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 p-10 text-nebbia/40 font-body text-sm">
                        <RefreshCw size={14} className="animate-spin" /> Caricamento…
                    </div>
                ) : righe.length === 0 ? (
                    <div className="p-10 text-center text-nebbia/40 font-body text-sm">Nessun aggiornamento registrato.</div>
                ) : (
                    <table className="w-full text-left font-body text-sm">
                        <thead>
                            <tr className="border-b border-white/5 text-nebbia/40 text-xs">
                                <th className="px-4 py-3 font-normal">Quando</th>
                                <th className="px-4 py-3 font-normal">Legge</th>
                                <th className="px-4 py-3 font-normal">Esito</th>
                                <th className="px-4 py-3 font-normal text-right">Nuovi</th>
                                <th className="px-4 py-3 font-normal text-right">Modificati</th>
                                <th className="px-4 py-3 font-normal text-right">Rimossi</th>
                                <th className="px-4 py-3 font-normal">Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {righe.map(r => {
                                const st = ESITO_STYLE[r.esito] ?? ESITO_STYLE.invariato
                                const Icon = st.icon
                                return (
                                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                        <td className="px-4 py-2.5 text-nebbia/60 whitespace-nowrap text-xs">{fmtData(r.eseguito_il)}</td>
                                        <td className="px-4 py-2.5 text-nebbia">
                                            <div className="flex items-center gap-2">
                                                {r.ambito === 'archivio'
                                                    ? <Archive size={12} className="text-nebbia/30 shrink-0" />
                                                    : <Flag size={12} className="text-nebbia/30 shrink-0" />}
                                                <span className="truncate max-w-[260px]" title={r.titolo ?? r.urn ?? r.codice}>
                                                    {r.titolo || r.codice || r.urn}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-xs ${st.cls}`}>
                                                <Icon size={11} /> {st.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-oro">{r.n_nuovo || ''}</td>
                                        <td className="px-4 py-2.5 text-right text-salvia">{r.n_modificato || ''}</td>
                                        <td className="px-4 py-2.5 text-right text-nebbia/60">{r.n_rimosso || ''}</td>
                                        <td className="px-4 py-2.5 text-nebbia/40 text-xs truncate max-w-[280px]" title={r.messaggio}>
                                            {r.messaggio}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Paginazione */}
            {totale > PAGINA && (
                <div className="flex items-center gap-3 font-body text-xs text-nebbia/40">
                    <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}
                        className="px-3 py-1.5 border border-white/10 hover:text-nebbia disabled:opacity-30">← Precedenti</button>
                    <span>{pagina * PAGINA + 1}–{Math.min((pagina + 1) * PAGINA, totale)} di {totale}</span>
                    <button disabled={(pagina + 1) * PAGINA >= totale} onClick={() => setPagina(p => p + 1)}
                        className="px-3 py-1.5 border border-white/10 hover:text-nebbia disabled:opacity-30">Successivi →</button>
                </div>
            )}
        </div>
    )
}
