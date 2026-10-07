// src/pages/admin/NormativaReport.jsx
// Sezione "Report" della normativa: cosa ha portato il giro settimanale.
//   · il giro ha funzionato? (atti controllati, aggiornati, errori ancora aperti)
//   · gli articoli nuovi, modificati e abrogati, col testo PRIMA e DOPO
//     (tabella norme_modifiche, scritta dagli script del giro)
//   · le sentenze e la prassi entrate, per fonte
// Nessuna AI: sono dati, costano zero. Da ogni atto si crea una bozza in Novità
// già impostata (titolo, cosa cambia, testi, fonti): il commento lo scrive l'admin.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { StatCard } from '@/components/shared'
import { slugDa } from '@/lib/novita'
import {
    ChevronLeft, ChevronRight, Loader2, AlertCircle, CheckCircle2, FileText,
    ExternalLink, PenLine, ChevronDown, ChevronUp, Scale, Landmark,
} from 'lucide-react'

const BOTTONE = 'inline-flex items-center justify-center gap-2 min-h-[38px] px-3 border border-white/10 text-nebbia/60 font-body text-xs hover:text-oro hover:border-oro/30 transition-colors disabled:opacity-40'

// Fonti del giro sentenze/prassi con un nome leggibile; le altre restano col codice
const NOMI_FONTI = {
    ga: 'TAR e Consiglio di Stato', corteconti: 'Corte dei Conti', consulta: 'Corte costituzionale',
    cassazione: 'Cassazione', cgue: 'Corte di giustizia UE', cedu: 'Corte EDU', ade: 'Agenzia delle Entrate',
    garante: 'Garante Privacy', garante_privacy: 'Garante Privacy', inps: 'INPS', inail: 'INAIL',
    agcm: 'AGCM', agcom: 'AGCOM', arera: 'ARERA', anac: 'ANAC', ivass: 'IVASS', abf: 'Arbitro Bancario Finanziario',
    lavoro: 'Ministero del Lavoro', ministero_lavoro: 'Ministero del Lavoro', inl: 'INL', dogane: 'Dogane',
    mef: 'MEF', min_finanze: 'Ministero delle Finanze', agenzia_entrate: 'Agenzia delle Entrate',
    corte_conti_controllo: 'Corte dei Conti (controllo)', corteconti_controllo: 'Corte dei Conti (controllo)',
    norme_ue: 'Norme UE', bdgt: 'Giustizia tributaria (MEF)',
}
// Lavori interni del giro (arricchimenti, PDF): non sono documenti nuovi
const INTERNI = /^(arricchimento|completa_pdf)/

const nomeFonte = f => NOMI_FONTI[f] || f
const isoGiorno = d => d.toISOString().slice(0, 10)
const lunedi = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const piuGiorni = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const fmt = d => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
const fmtOra = d => new Date(d).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const normattiva = urn => urn ? `https://www.normattiva.it/uri-res/N2Ls?${urn}` : null
const etichettaArt = a => (a || '').replace(/\s*\[[^\]]*_[^\]]*\]/g, '').trim()   // toglie i nomi di sezione tecnici

export default function NormativaReport() {
    const [inizio, setInizio] = useState(null)        // lunedì della settimana mostrata
    const [dati, setDati] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')

    // All'apertura: la settimana dell'ultimo giro
    useEffect(() => {
        supabase.from('norme_aggiornamenti').select('eseguito_il').order('eseguito_il', { ascending: false }).limit(1)
            .then(({ data }) => setInizio(lunedi(data?.[0]?.eseguito_il ?? new Date())))
    }, [])

    useEffect(() => {
        if (!inizio) return
        setLoading(true); setErrore('')
        supabase.rpc('report_normativa', { p_da: isoGiorno(inizio), p_a: isoGiorno(piuGiorni(inizio, 6)) })
            .then(({ data, error }) => {
                setLoading(false)
                if (error) { setErrore(error.message); return }
                setDati(data)
            })
    }, [inizio])

    if (!inizio) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-oro" /></div>

    const fine = piuGiorni(inizio, 6)
    const giro = dati?.giro ?? {}
    const sentenze = (dati?.giurisprudenza ?? []).filter(g => !INTERNI.test(g.fonte))
    const interni = (dati?.giurisprudenza ?? []).filter(g => INTERNI.test(g.fonte))
    const nuoveSentenze = sentenze.reduce((s, g) => s + Number(g.nuovi || 0), 0)
    const nuovaPrassi = (dati?.prassi ?? []).reduce((s, p) => s + Number(p.nuovi || 0), 0)

    return (
        <div className="space-y-6">
            {/* Settimana */}
            <div className="flex items-center justify-between gap-3 bg-slate border border-white/5 p-3">
                <button onClick={() => setInizio(piuGiorni(inizio, -7))} className={BOTTONE}><ChevronLeft size={14} /> Prima</button>
                <p className="font-body text-sm text-nebbia text-center">
                    Settimana dal <span className="text-oro">{fmt(inizio)}</span> al <span className="text-oro">{fmt(fine)}</span>
                </p>
                <button onClick={() => setInizio(piuGiorni(inizio, 7))} disabled={piuGiorni(inizio, 7) > new Date()} className={BOTTONE}>Dopo <ChevronRight size={14} /></button>
            </div>

            {errore && <p className="flex items-center gap-2 font-body text-sm text-red-400"><AlertCircle size={14} /> {errore}</p>}

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-oro" /></div>
            ) : dati && (
                <>
                    {/* 1 · Il giro ha funzionato? */}
                    <section className="space-y-3">
                        <p className="section-label">Il giro delle norme</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <StatCard label="Ultimo giro" value={giro.ultimo ? fmtOra(giro.ultimo) : '—'} />
                            <StatCard label="Atti controllati" value={giro.controlli ?? 0} colorClass="text-nebbia" />
                            <StatCard label="Atti aggiornati" value={giro.aggiornati ?? 0} colorClass="text-salvia" />
                            <StatCard label="Errori aperti" value={giro.errori ?? 0} colorClass={giro.errori ? 'text-red-400' : 'text-salvia'}
                                sub={giro.errori_risolti ? `${giro.errori_risolti} risolti al secondo tentativo` : undefined} />
                        </div>
                        {!giro.ultimo && (
                            <p className="font-body text-sm text-amber-400 flex items-center gap-2"><AlertCircle size={14} /> In questa settimana il giro non risulta partito.</p>
                        )}
                        {(giro.elenco_errori ?? []).length > 0 && (
                            <div className="bg-red-500/5 border border-red-500/20 divide-y divide-red-500/10">
                                {giro.elenco_errori.map((e, i) => (
                                    <div key={i} className="p-3 font-body text-xs">
                                        <p className="text-nebbia">{e.titolo || e.codice}</p>
                                        <p className="text-red-400/80 mt-0.5">{e.messaggio} · {fmtOra(e.eseguito_il)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {giro.ue_atti > 0 && (
                            <p className="font-body text-xs text-nebbia/40">Diritto UE: {giro.ue_atti} atti riallineati al testo consolidato.</p>
                        )}
                    </section>

                    {/* 2 · Norme cambiate */}
                    <section className="space-y-3">
                        <p className="section-label">Norme cambiate · {(dati.norme ?? []).length} atti</p>
                        {(dati.norme ?? []).length === 0 ? (
                            <div className="bg-slate border border-white/5 p-6 text-center font-body text-sm text-nebbia/40">
                                Nessun articolo cambiato nel testo questa settimana.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dati.norme.map(n => <AttoCambiato key={`${n.ambito}-${n.codice ?? n.urn}`} atto={n} da={isoGiorno(inizio)} a={isoGiorno(fine)} />)}
                            </div>
                        )}
                    </section>

                    {/* 3 · Sentenze e prassi */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <TabellaFonti titolo="Sentenze nuove" icona={Scale} totale={nuoveSentenze}
                            righe={sentenze.map(g => ({ fonte: g.fonte, nuovi: g.nuovi, errori: g.errori, esito: g.esito }))} />
                        <TabellaFonti titolo="Prassi nuova" icona={Landmark} totale={nuovaPrassi}
                            righe={(dati.prassi ?? []).map(p => ({ fonte: p.fonte, nuovi: p.nuovi }))} />
                    </div>
                    {interni.length > 0 && (
                        <p className="font-body text-xs text-nebbia/30">
                            Lavori interni del giro: {interni.map(g => `${g.fonte} ${g.nuovi}`).join(' · ')}
                        </p>
                    )}
                </>
            )}
        </div>
    )
}

function TabellaFonti({ titolo, icona: Icona, totale, righe }) {
    return (
        <section className="bg-slate border border-white/5">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <p className="flex items-center gap-2 font-body text-sm text-nebbia"><Icona size={14} className="text-oro" /> {titolo}</p>
                <p className="font-display text-2xl text-oro">{Number(totale).toLocaleString('it-IT')}</p>
            </div>
            {righe.length === 0 ? (
                <p className="p-4 font-body text-xs text-nebbia/30">Niente di nuovo questa settimana.</p>
            ) : (
                <div className="divide-y divide-white/5">
                    {righe.map(r => (
                        <div key={r.fonte} className="flex items-center justify-between px-4 py-2 font-body text-xs">
                            <span className="text-nebbia/70">{nomeFonte(r.fonte)}</span>
                            <span className="flex items-center gap-3">
                                {Number(r.errori) > 0 && <span className="text-amber-400/80">{r.errori} errori</span>}
                                {r.esito && r.esito !== 'ok' && <span className="text-red-400">{r.esito}</span>}
                                <span className="text-nebbia tabular-nums">{Number(r.nuovi).toLocaleString('it-IT')}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}

function AttoCambiato({ atto, da, a }) {
    const navigate = useNavigate()
    const { profile } = useAuth()
    const [aperto, setAperto] = useState(false)
    const [articoli, setArticoli] = useState(null)
    const [creando, setCreando] = useState(false)
    const [errore, setErrore] = useState('')

    async function caricaArticoli() {
        if (articoli) return articoli
        let q = supabase.from('norme_modifiche')
            .select('articolo, tipo, rubrica, testo_prima, testo_dopo, giro_il')
            .eq('ambito', atto.ambito).gte('giro_il', da).lte('giro_il', a)
            .order('tipo').order('id')
        q = atto.codice ? q.eq('codice', atto.codice) : q.eq('urn', atto.urn)
        const { data } = await q
        setArticoli(data ?? [])
        return data ?? []
    }

    async function apri() {
        if (!aperto) await caricaArticoli()
        setAperto(v => !v)
    }

    async function creaBozza() {
        setCreando(true); setErrore('')
        const righe = await caricaArticoli()
        const bozza = bozzaArticolo(atto, righe)
        const { data, error } = await supabase.from('novita')
            .insert({ ...bozza, stato: 'bozza', creato_da: profile?.id })
            .select('id').single()
        setCreando(false)
        if (error) { setErrore(error.code === '23505' ? 'Esiste già una bozza con questo indirizzo: aprila da Novità.' : error.message); return }
        navigate(`/admin/novita?apri=${data.id}`)
    }

    const tot = atto.nuovi + atto.modificati + atto.abrogati
    return (
        <div className="bg-slate border border-white/5">
            <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-nebbia break-words">{atto.titolo_atto || atto.codice || atto.urn}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {atto.atto_nuovo && <span className="font-body text-[11px] px-2 py-0.5 border border-oro/30 text-oro bg-oro/10">Atto nuovo</span>}
                        {atto.nuovi > 0 && <span className="font-body text-[11px] px-2 py-0.5 border border-salvia/30 text-salvia">{atto.nuovi} nuovi</span>}
                        {atto.modificati > 0 && <span className="font-body text-[11px] px-2 py-0.5 border border-white/10 text-nebbia/60">{atto.modificati} modificati</span>}
                        {atto.abrogati > 0 && <span className="font-body text-[11px] px-2 py-0.5 border border-red-500/30 text-red-400/80">{atto.abrogati} abrogati</span>}
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:flex gap-2">
                    <button onClick={apri} className={BOTTONE}>
                        {aperto ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {tot} articoli
                    </button>
                    {atto.codice && (
                        <button onClick={() => navigate(`/admin/normativa/it/${atto.codice}`)} className={BOTTONE}>
                            <FileText size={14} /> Banca Dati
                        </button>
                    )}
                    {normattiva(atto.urn) && (
                        <a href={normattiva(atto.urn)} target="_blank" rel="noreferrer" className={BOTTONE}>
                            <ExternalLink size={14} /> Normattiva
                        </a>
                    )}
                    <button onClick={creaBozza} disabled={creando} className={`${BOTTONE} !text-oro !border-oro/30`}>
                        {creando ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />} Crea bozza
                    </button>
                </div>
            </div>
            {errore && <p className="px-4 pb-3 font-body text-xs text-red-400">{errore}</p>}

            {aperto && articoli && (
                <div className="border-t border-white/5 divide-y divide-white/5">
                    {articoli.map((r, i) => (
                        <div key={i} className="p-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="font-body text-sm text-oro">{etichettaArt(r.articolo)}</p>
                                {r.rubrica && <p className="font-body text-xs text-nebbia/50">— {r.rubrica}</p>}
                                <span className={`font-body text-[11px] px-2 py-0.5 border ${r.tipo === 'nuovo' ? 'border-salvia/30 text-salvia' : r.tipo === 'abrogato' ? 'border-red-500/30 text-red-400/80' : 'border-white/10 text-nebbia/50'}`}>{r.tipo}</span>
                            </div>
                            <div className={`grid gap-3 ${r.tipo === 'modificato' ? 'lg:grid-cols-2' : ''}`}>
                                {r.tipo !== 'nuovo' && (
                                    <Testo etichetta={r.tipo === 'abrogato' ? 'Testo abrogato' : 'Prima'}
                                        testo={r.testo_prima} vuoto="Testo precedente non registrato (cambio rilevato prima del 7 ottobre 2026)." />
                                )}
                                {r.tipo !== 'abrogato' && <Testo etichetta={r.tipo === 'nuovo' ? 'Testo' : 'Ora'} testo={r.testo_dopo} />}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function Testo({ etichetta, testo, vuoto }) {
    return (
        <div className="bg-petrolio border border-white/5 p-3">
            <p className="font-body text-[11px] tracking-widest uppercase text-nebbia/30 mb-2">{etichetta}</p>
            {testo
                ? <p className="font-body text-xs text-nebbia/70 leading-relaxed whitespace-pre-line max-h-72 overflow-y-auto">{testo}</p>
                : <p className="font-body text-xs text-nebbia/30 italic">{vuoto}</p>}
        </div>
    )
}

// ─── La bozza per Novità: la struttura, il commento lo scrive l'admin ─────────
const MAX_ARTICOLI = 10
const MAX_TESTO = 1500
const citazione = t => {
    const s = (t || '').trim()
    const corto = s.length > MAX_TESTO ? s.slice(0, MAX_TESTO).trimEnd() + ' […]' : s
    // una riga vuota di citazione tra i commi: in Markdown restano paragrafi separati
    return corto.split('\n').filter(r => r.trim()).map(r => `> ${r}`).join('\n>\n')
}

function bozzaArticolo(atto, righe) {
    const titoloAtto = atto.titolo_atto || atto.codice || 'norma'
    const nuovi = righe.filter(r => r.tipo === 'nuovo')
    const titolo = nuovi.length === 1 && righe.length === 1
        ? `${titoloAtto}: nuovo ${etichettaArt(nuovi[0].articolo)}`
        : `${titoloAtto}: cosa cambia`
    const conteggio = [
        atto.nuovi && `${atto.nuovi} ${atto.nuovi === 1 ? 'articolo nuovo' : 'articoli nuovi'}`,
        atto.modificati && `${atto.modificati} ${atto.modificati === 1 ? 'articolo modificato' : 'articoli modificati'}`,
        atto.abrogati && `${atto.abrogati} ${atto.abrogati === 1 ? 'articolo abrogato' : 'articoli abrogati'}`,
    ].filter(Boolean).join(', ')

    const blocchi = righe.slice(0, MAX_ARTICOLI).map(r => {
        const testa = `### ${etichettaArt(r.articolo)}${r.rubrica ? ` — ${r.rubrica}` : ''} (${r.tipo})`
        if (r.tipo === 'nuovo') return `${testa}\n\n**Testo:**\n\n${citazione(r.testo_dopo)}`
        if (r.tipo === 'abrogato') return `${testa}\n\n**Testo abrogato:**\n\n${citazione(r.testo_prima)}`
        return `${testa}\n\n` + (r.testo_prima ? `**Prima:**\n\n${citazione(r.testo_prima)}\n\n` : '') + `**Ora:**\n\n${citazione(r.testo_dopo)}`
    })
    if (righe.length > MAX_ARTICOLI) blocchi.push(`*[Altri ${righe.length - MAX_ARTICOLI} articoli: vedi il report in admin → Normativa → Report.]*`)

    const fonti = [
        normattiva(atto.urn) && `- [Testo vigente su Normattiva](${normattiva(atto.urn)})`,
        '- Tutte le norme, le sentenze e la prassi collegate nella [Banca Dati di Lexum](https://www.lexum.it/registrati)',
    ].filter(Boolean).join('\n')

    const contenuto = [
        '## In breve',
        '[Scrivi qui, in due o tre righe, cosa cambia e per chi.]',
        '## Cosa cambia',
        ...blocchi,
        '## Cosa significa in pratica',
        '[Scrivi qui le conseguenze pratiche: chi è coinvolto, da quando, cosa fare.]',
        '## Fonti',
        fonti,
    ].join('\n\n')

    const giro = righe[0]?.giro_il ?? new Date().toISOString().slice(0, 10)
    return {
        titolo,
        slug: `${slugDa(titolo)}-${giro}`,
        sommario: `${titoloAtto}: ${conteggio}. [Completa il sommario.]`,
        categoria: 'Novità normativa',
        contenuto,
    }
}
