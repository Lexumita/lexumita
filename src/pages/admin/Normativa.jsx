// src/pages/admin/Normativa.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageHeader, StatCard, Badge } from '@/components/shared'
import { Upload, Cpu, RefreshCw, ChevronRight, Trash2, AlertCircle, BookOpen } from 'lucide-react'

export default function AdminNormativa() {
    const navigate = useNavigate()

    const [codici, setCodici] = useState([])
    const [codiciLabel, setCodiciLabel] = useState({})
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ totale: 0, conEmbedding: 0 })

    const [importando, setImportando] = useState(false)
    const [embeddings, setEmbeddings] = useState(false)
    const [msgImport, setMsgImport] = useState(null)
    const [msgEmbed, setMsgEmbed] = useState(null)

    useEffect(() => { caricaDati() }, [])

    async function caricaDati() {
        setLoading(true)
        try {
            // Label
            const { data: labelData } = await supabase
                .from('codici_norme').select('codice, label')
            const mappa = {}
            for (const r of labelData ?? []) mappa[r.codice] = r.label
            setCodiciLabel(mappa)

            // Stats globali
            const { count: totale } = await supabase
                .from('norme').select('*', { count: 'exact', head: true })
            const { count: conEmbedding } = await supabase
                .from('norme').select('*', { count: 'exact', head: true })
                .not('embedding', 'is', null)
            setStats({ totale: totale ?? 0, conEmbedding: conEmbedding ?? 0 })

            // Codici con conteggio
            const { data: codiciData } = await supabase
                .rpc('get_stats_per_codice')
            setCodici(codiciData ?? [])
        } finally {
            setLoading(false)
        }
    }

    async function avviaImport() {
        setImportando(true); setMsgImport(null)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const listRes = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-norme`,
                { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list' }) }
            )
            const listJson = await listRes.json()
            if (!listJson.ok || !listJson.files?.length) {
                setMsgImport({ tipo: 'err', testo: 'Nessun file trovato nel bucket normattiva' }); return
            }
            let totOk = 0; let totErrori = 0
            for (const fileName of listJson.files) {
                setMsgImport({ tipo: 'ok', testo: `Importando ${fileName}...` })
                const res = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-norme`,
                    { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ file: fileName }) }
                )
                const json = await res.json()
                if (json.ok) { totOk += json.totale_articoli; totErrori += json.errori }
                else totErrori++
            }
            setMsgImport({ tipo: 'ok', testo: `✅ Import completato — ${totOk} articoli, ${totErrori} errori` })
            caricaDati()
        } catch (e) {
            setMsgImport({ tipo: 'err', testo: e.message })
        } finally { setImportando(false) }
    }

    async function avviaEmbeddings() {
        setEmbeddings(true); setMsgEmbed(null)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            let rimanenti = stats.totale - stats.conEmbedding

            while (rimanenti > 0) {
                // Lancia 5 chiamate in parallelo
                const chiamate = Array(5).fill(null).map(() =>
                    fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embeddings`,
                        { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } }
                    ).then(r => r.json()).catch(() => ({ ok: false, processate: 0, errori: 0, rimanenti: rimanenti }))
                )

                const risultati = await Promise.all(chiamate)

                let processateTotali = 0
                let erroriTotali = 0
                risultati.forEach(json => {
                    if (json.ok) {
                        processateTotali += json.processate ?? 0
                        erroriTotali += json.errori ?? 0
                        rimanenti = json.rimanenti ?? rimanenti
                    }
                })

                // Aggiorna UI
                setStats(prev => ({ ...prev, conEmbedding: prev.totale - rimanenti }))
                setMsgEmbed({ tipo: 'ok', testo: `Processati ${processateTotali} in questo round — rimanenti: ${rimanenti}` })

                if (rimanenti <= 0) break
                await new Promise(r => setTimeout(r, 1000))
            }

            caricaDati()
        } catch (e) {
            setMsgEmbed({ tipo: 'err', testo: e.message })
        } finally { setEmbeddings(false) }
    }

    async function eliminaCodice(codice) {
        if (!confirm(`Eliminare tutti gli articoli del codice "${codiciLabel[codice] ?? codice}"? Questa azione non è reversibile.`)) return
        await supabase.from('norme').delete().eq('codice', codice)
        caricaDati()
    }

    const embedPct = stats.totale > 0
        ? Math.round((stats.conEmbedding / stats.totale) * 100)
        : 0

    return (
        <div className="space-y-5">
            <PageHeader label="Admin" title="Normativa" subtitle={`${stats.totale.toLocaleString()} articoli nel database`} />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Articoli totali" value={stats.totale.toLocaleString()} colorClass="text-oro" />
                <StatCard label="Codici caricati" value={codici.length} colorClass="text-salvia" />
                <StatCard label="Con embedding" value={stats.conEmbedding.toLocaleString()} colorClass="text-nebbia" />
                <StatCard label="Copertura AI" value={`${embedPct}%`} colorClass={embedPct === 100 ? 'text-salvia' : 'text-oro'} />
            </div>

            {/* Azioni */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate border border-white/5 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                        <Upload size={16} className="text-oro mt-0.5 shrink-0" />
                        <div>
                            <p className="font-body text-sm font-medium text-nebbia">Importa norme da Storage</p>
                            <p className="font-body text-xs text-nebbia/40 mt-1">Legge tutti i JSON dal bucket <span className="text-oro/60">normattiva</span> e li inserisce nel database.</p>
                        </div>
                    </div>
                    {msgImport && (
                        <p className={`font-body text-xs flex items-center gap-1.5 ${msgImport.tipo === 'ok' ? 'text-salvia' : 'text-red-400'}`}>
                            <AlertCircle size={11} />{msgImport.testo}
                        </p>
                    )}
                    <button onClick={avviaImport} disabled={importando}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40">
                        {importando
                            ? <><span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" /> Importazione...</>
                            : <><Upload size={14} /> Importa norme</>}
                    </button>
                </div>

                <div className="bg-slate border border-white/5 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                        <Cpu size={16} className="text-salvia mt-0.5 shrink-0" />
                        <div>
                            <p className="font-body text-sm font-medium text-nebbia">Genera embeddings AI</p>
                            <p className="font-body text-xs text-nebbia/40 mt-1">Genera i vettori OpenAI per gli articoli senza embedding.</p>
                        </div>
                    </div>
                    {msgEmbed && (
                        <p className={`font-body text-xs flex items-center gap-1.5 ${msgEmbed.tipo === 'ok' ? 'text-salvia' : 'text-red-400'}`}>
                            <AlertCircle size={11} />{msgEmbed.testo}
                        </p>
                    )}
                    <button onClick={avviaEmbeddings} disabled={embeddings}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40">
                        {embeddings
                            ? <><span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> Generazione...</>
                            : <><Cpu size={14} /> Genera embeddings ({stats.totale - stats.conEmbedding} rimanenti)</>}
                    </button>
                </div>
            </div>

            {/* Lista codici */}
            <div className="flex items-center justify-between">
                <p className="section-label">Codici nel database</p>
                <button onClick={caricaDati} className="text-nebbia/30 hover:text-nebbia transition-colors">
                    <RefreshCw size={13} />
                </button>
            </div>

            <div className="bg-slate border border-white/5 overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Codice</th>
                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Articoli</th>
                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Embedding</th>
                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Aggiornato</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-20 text-center">
                                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                            </td></tr>
                        ) : codici.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-20 text-center">
                                <BookOpen size={24} className="text-nebbia/20 mx-auto mb-3" />
                                <p className="font-body text-sm text-nebbia/30">Nessun codice importato</p>
                            </td></tr>
                        ) : codici.map(c => (
                            <tr key={c.codice} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                onClick={() => navigate(`/admin/normativa/${c.codice}`)}>
                                <td className="px-4 py-3">
                                    <p className="font-body text-sm font-medium text-nebbia">{codiciLabel[c.codice] ?? c.codice}</p>
                                    <p className="font-body text-xs text-nebbia/30 mt-0.5">{c.codice}</p>
                                </td>
                                <td className="px-4 py-3 font-body text-sm text-oro font-medium">{c.totale?.toLocaleString()}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-white/5 h-1.5 rounded-full max-w-24">
                                            <div className="bg-salvia h-1.5 rounded-full transition-all"
                                                style={{ width: `${c.totale > 0 ? Math.round((c.con_embedding / c.totale) * 100) : 0}%` }} />
                                        </div>
                                        <span className="font-body text-xs text-nebbia/40">
                                            {c.totale > 0 ? Math.round((c.con_embedding / c.totale) * 100) : 0}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-body text-xs text-nebbia/30">
                                    {c.aggiornato_al ? new Date(c.aggiornato_al).toLocaleDateString('it-IT') : '—'}
                                </td>
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => navigate(`/admin/normativa/${c.codice}`)}
                                            className="text-nebbia/30 hover:text-oro transition-colors">
                                            <ChevronRight size={14} />
                                        </button>
                                        <button onClick={() => eliminaCodice(c.codice)}
                                            className="text-nebbia/30 hover:text-red-400 transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}