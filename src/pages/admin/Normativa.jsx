// src/pages/admin/Normativa.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageHeader, StatCard } from '@/components/shared'
import {
    Upload, Cpu, RefreshCw, ChevronRight, Trash2,
    AlertCircle, BookOpen, Flag, Globe, Archive, Scale
} from 'lucide-react'

// ─── CONFIG TAB ITALIANA / UE ────────────────────────────────────
const CONFIG_IT = {
    key: 'it',
    labelStats: 'Codici caricati',
    tabella: 'norme',
    rpcStats: 'get_stats_per_codice',
    tabellaLabel: 'codici_norme',
    bucketStorage: 'normattiva',
    permetteImport: true,
    permetteEmbedding: true,
    permetteDelete: true,
    rotta: '/admin/normativa/it',
}

const CONFIG_UE = {
    key: 'ue',
    labelStats: 'Categorie presenti',
    tabella: 'norme_ue',
    rpcStats: 'get_stats_per_categoria_ue',
    tabellaLabel: 'codici_norme_ue',
    bucketStorage: null,
    permetteImport: false,
    permetteEmbedding: false,
    permetteDelete: false,
    rotta: '/admin/normativa/ue',
}

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────
export default function AdminNormativa() {
    const [tab, setTab] = useState('it')

    return (
        <div className="space-y-5">
            {/* Tab selector */}
            <div className="flex gap-1 bg-slate border border-white/5 p-1 w-fit flex-wrap">
                <button onClick={() => setTab('it')}
                    className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tab === 'it' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                    <Flag size={13} /> Normativa Italiana
                </button>
                <button onClick={() => setTab('ue')}
                    className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tab === 'ue' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                    <Globe size={13} /> Normativa UE
                </button>
                <button onClick={() => setTab('archivio')}
                    className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tab === 'archivio' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                    <Archive size={13} /> Archivio normativo
                </button>
                <button onClick={() => setTab('sentenze')}
                    className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tab === 'sentenze' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                    <Scale size={13} /> Giurisprudenza
                </button>
            </div>

            {tab === 'it' && <VistaCodici config={CONFIG_IT} titolo="Normativa Italiana" />}
            {tab === 'ue' && <VistaCodici config={CONFIG_UE} titolo="Normativa UE" />}
            {tab === 'archivio' && <VistaArchivio />}
            {tab === 'sentenze' && <VistaSentenze />}
        </div>
    )
}

// ─── VISTA CODICI / CATEGORIE (IT e UE) ───────────────────────
function VistaCodici({ config, titolo }) {
    const navigate = useNavigate()

    const [codici, setCodici] = useState([])
    const [codiciLabel, setCodiciLabel] = useState({})
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ totale: 0, conEmbedding: 0 })

    const [importando, setImportando] = useState(false)
    const [embeddings, setEmbeddings] = useState(false)
    const [msgImport, setMsgImport] = useState(null)
    const [msgEmbed, setMsgEmbed] = useState(null)

    useEffect(() => { caricaDati() }, [config.key])

    async function caricaDati() {
        setLoading(true)
        try {
            if (config.tabellaLabel) {
                const { data: labelData } = await supabase
                    .from(config.tabellaLabel).select('codice, label')
                const mappa = {}
                for (const r of labelData ?? []) mappa[r.codice] = r.label
                setCodiciLabel(mappa)
            } else {
                setCodiciLabel({})
            }

            const { count: totale } = await supabase
                .from(config.tabella).select('*', { count: 'exact', head: true })
            const { count: conEmbedding } = await supabase
                .from(config.tabella).select('*', { count: 'exact', head: true })
                .not('embedding', 'is', null)
            setStats({ totale: totale ?? 0, conEmbedding: conEmbedding ?? 0 })

            const { data: codiciData } = await supabase.rpc(config.rpcStats)
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
            setMsgImport({ tipo: 'ok', testo: `Import completato — ${totOk} articoli, ${totErrori} errori` })
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
        if (!confirm(`Eliminare tutti gli articoli del codice "${codiciLabel[codice] ?? codice}"? Questa azione non e reversibile.`)) return
        await supabase.from(config.tabella).delete().eq('codice', codice)
        caricaDati()
    }

    const embedPct = stats.totale > 0
        ? Math.round((stats.conEmbedding / stats.totale) * 100)
        : 0

    return (
        <div className="space-y-5">
            <PageHeader label="Admin" title={titolo} subtitle={`${stats.totale.toLocaleString()} articoli nel database`} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Articoli totali" value={stats.totale.toLocaleString()} colorClass="text-oro" />
                <StatCard label={config.labelStats} value={codici.length} colorClass="text-salvia" />
                <StatCard label="Con embedding" value={stats.conEmbedding.toLocaleString()} colorClass="text-nebbia" />
                <StatCard label="Copertura AI" value={`${embedPct}%`} colorClass={embedPct === 100 ? 'text-salvia' : 'text-oro'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`bg-slate border border-white/5 p-5 space-y-4 ${!config.permetteImport ? 'opacity-40' : ''}`}>
                    <div className="flex items-start gap-3">
                        <Upload size={16} className="text-oro mt-0.5 shrink-0" />
                        <div>
                            <p className="font-body text-sm font-medium text-nebbia">Importa norme da Storage</p>
                            <p className="font-body text-xs text-nebbia/40 mt-1">
                                {config.permetteImport
                                    ? <>Legge tutti i JSON dal bucket <span className="text-oro/60">{config.bucketStorage}</span> e li inserisce nel database.</>
                                    : <>Import non disponibile per questa fonte — i dati sono caricati via script dedicato.</>
                                }
                            </p>
                        </div>
                    </div>
                    {msgImport && (
                        <p className={`font-body text-xs flex items-center gap-1.5 ${msgImport.tipo === 'ok' ? 'text-salvia' : 'text-red-400'}`}>
                            <AlertCircle size={11} />{msgImport.testo}
                        </p>
                    )}
                    <button onClick={avviaImport} disabled={importando || !config.permetteImport}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {importando
                            ? <><span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" /> Importazione...</>
                            : <><Upload size={14} /> Importa norme</>}
                    </button>
                </div>

                <div className={`bg-slate border border-white/5 p-5 space-y-4 ${!config.permetteEmbedding ? 'opacity-40' : ''}`}>
                    <div className="flex items-start gap-3">
                        <Cpu size={16} className="text-salvia mt-0.5 shrink-0" />
                        <div>
                            <p className="font-body text-sm font-medium text-nebbia">Genera embeddings AI</p>
                            <p className="font-body text-xs text-nebbia/40 mt-1">
                                {config.permetteEmbedding
                                    ? <>Genera i vettori OpenAI per gli articoli senza embedding.</>
                                    : <>Usa lo script Python locale — molto piu veloce dell edge function.</>
                                }
                            </p>
                        </div>
                    </div>
                    {msgEmbed && (
                        <p className={`font-body text-xs flex items-center gap-1.5 ${msgEmbed.tipo === 'ok' ? 'text-salvia' : 'text-red-400'}`}>
                            <AlertCircle size={11} />{msgEmbed.testo}
                        </p>
                    )}
                    <button onClick={avviaEmbeddings} disabled={embeddings || !config.permetteEmbedding}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {embeddings
                            ? <><span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> Generazione...</>
                            : <><Cpu size={14} /> Genera embeddings ({stats.totale - stats.conEmbedding} rimanenti)</>}
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="section-label">{config.key === 'ue' ? 'Categorie nel database' : 'Codici nel database'}</p>
                <button onClick={caricaDati} className="text-nebbia/30 hover:text-nebbia transition-colors">
                    <RefreshCw size={13} />
                </button>
            </div>

            <div className="bg-slate border border-white/5 overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">
                                {config.key === 'ue' ? 'Categoria' : 'Codice'}
                            </th>
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
                                <p className="font-body text-sm text-nebbia/30">
                                    {config.key === 'ue' ? 'Nessuna categoria trovata' : 'Nessun codice importato'}
                                </p>
                            </td></tr>
                        ) : codici.map(c => (
                            <tr key={c.codice} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                onClick={() => navigate(`${config.rotta}/${c.codice}`)}>
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
                                        <button onClick={() => navigate(`${config.rotta}/${c.codice}`)}
                                            className="text-nebbia/30 hover:text-oro transition-colors">
                                            <ChevronRight size={14} />
                                        </button>
                                        {config.permetteDelete && (
                                            <button onClick={() => eliminaCodice(c.codice)}
                                                className="text-nebbia/30 hover:text-red-400 transition-colors">
                                                <Trash2 size={13} />
                                            </button>
                                        )}
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

// ─── VISTA ARCHIVIO — lista per tipo_atto ───────────────
function VistaArchivio() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ totale: 0, conEmbedding: 0 })
    const [tipiAtto, setTipiAtto] = useState([])

    useEffect(() => { caricaStats() }, [])

    async function caricaStats() {
        setLoading(true)
        try {
            const { count: totale } = await supabase
                .from('norme_archivio').select('*', { count: 'exact', head: true })
            const { count: conEmbedding } = await supabase
                .from('norme_archivio').select('*', { count: 'exact', head: true })
                .not('embedding', 'is', null)
            setStats({ totale: totale ?? 0, conEmbedding: conEmbedding ?? 0 })

            // Raggruppa per tipo_atto via RPC se esiste, altrimenti fallback select
            const { data: tipiData, error: tipiErr } = await supabase
                .rpc('get_stats_per_tipo_atto_archivio')

            if (tipiErr || !tipiData) {
                // Fallback: query manuale con aggregazione lato client (limitata)
                const { data: rows } = await supabase
                    .from('norme_archivio')
                    .select('tipo_atto')
                    .limit(50000)
                const mappa = {}
                for (const r of rows ?? []) {
                    const k = r.tipo_atto ?? 'altro'
                    mappa[k] = (mappa[k] ?? 0) + 1
                }
                const lista = Object.entries(mappa)
                    .map(([tipo_atto, totale]) => ({ tipo_atto, totale }))
                    .sort((a, b) => b.totale - a.totale)
                setTipiAtto(lista)
            } else {
                setTipiAtto(tipiData)
            }
        } finally {
            setLoading(false)
        }
    }

    const embedPct = stats.totale > 0
        ? Math.round((stats.conEmbedding / stats.totale) * 100)
        : 0
    const senzaEmbedding = stats.totale - stats.conEmbedding

    return (
        <div className="space-y-5">
            <PageHeader
                label="Admin"
                title="Archivio normativo"
                subtitle="Fonte grezza non categorizzata — accessibile solo via ricerca Lex"
            />

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="Record totali" value={stats.totale.toLocaleString()} colorClass="text-oro" />
                        <StatCard label="Tipi di atto" value={tipiAtto.length} colorClass="text-salvia" />
                        <StatCard label="Con embedding" value={stats.conEmbedding.toLocaleString()} colorClass="text-nebbia" />
                        <StatCard label="Copertura AI" value={`${embedPct}%`} colorClass={embedPct === 100 ? 'text-salvia' : 'text-oro'} />
                    </div>

                    <div className="bg-slate border border-white/5 p-5">
                        <div className="flex items-start gap-3">
                            <Archive size={16} className="text-oro mt-0.5 shrink-0" />
                            <div>
                                <p className="font-body text-sm font-medium text-nebbia">Archivio non categorizzato</p>
                                <p className="font-body text-xs text-nebbia/40 mt-1 leading-relaxed">
                                    Raccolta estesa di norme italiane senza categorizzazione. Lex la usa come fallback quando la ricerca nei codici curati non basta.
                                    Embeddings via script Python locale (l'edge function è troppo lenta per ~400k record).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="section-label">Tipi di atto presenti</p>
                        <button onClick={caricaStats} className="text-nebbia/30 hover:text-nebbia transition-colors">
                            <RefreshCw size={13} />
                        </button>
                    </div>

                    <div className="bg-slate border border-white/5 overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Tipo atto</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Articoli</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {tipiAtto.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <p className="font-body text-sm text-nebbia/30">Nessun tipo atto trovato</p>
                                    </td></tr>
                                ) : tipiAtto.map(t => (
                                    <tr key={t.tipo_atto} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/admin/normativa/archivio/${encodeURIComponent(t.tipo_atto)}`)}>
                                        <td className="px-4 py-3 font-body text-sm font-medium text-nebbia capitalize">
                                            {t.tipo_atto?.replace(/_/g, ' ') ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 font-body text-sm text-oro font-medium">{t.totale?.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <ChevronRight size={14} className="text-nebbia/30 inline" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}

// ─── VISTA SENTENZE — lista per categoria_lex ───────────
function VistaSentenze() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ totale: 0 })
    const [categorie, setCategorie] = useState([])
    const [mappaLabel, setMappaLabel] = useState({})

    useEffect(() => { caricaDati() }, [])

    async function caricaDati() {
        setLoading(true)
        try {
            const { count: totale } = await supabase
                .from('giurisprudenza').select('*', { count: 'exact', head: true })
            setStats({ totale: totale ?? 0 })

            // Carica labels categorie_lex
            const { data: cat } = await supabase
                .from('codici_lex').select('codice, label, macro_label')
            const mappa = {}
            for (const c of cat ?? []) mappa[c.codice] = c.label
            setMappaLabel(mappa)

            // Conteggio per categoria via fetch lato client (giurisprudenza ha array categorie_lex)
            const { data: rows } = await supabase
                .from('giurisprudenza')
                .select('categorie_lex')
                .eq('vigente', true)
            const conteggi = {}
            for (const r of rows ?? []) {
                for (const c of r.categorie_lex ?? []) {
                    conteggi[c] = (conteggi[c] ?? 0) + 1
                }
            }
            const lista = Object.entries(conteggi)
                .map(([codice, totale]) => ({ codice, totale, label: mappa[codice] ?? codice }))
                .sort((a, b) => b.totale - a.totale)
            setCategorie(lista)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-5">
            <PageHeader
                label="Admin"
                title="Giurisprudenza"
                subtitle={`${stats.totale.toLocaleString()} sentenze pubbliche del corpus Lexum`}
            />

            <div className="bg-slate border border-white/5 p-5">
                <div className="flex items-start gap-3">
                    <Scale size={16} className="text-oro mt-0.5 shrink-0" />
                    <div>
                        <p className="font-body text-sm font-medium text-nebbia">Sentenze pubbliche (gratuite)</p>
                        <p className="font-body text-xs text-nebbia/40 mt-1 leading-relaxed">
                            Corpus di giurisprudenza pubblica accessibile a tutti gli avvocati senza pagamento.
                            Le sentenze caricate dagli avvocati con monetizzazione sono in <a href="/admin/sentenze" className="text-oro hover:text-oro/80">Admin / Sentenze</a>.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="section-label">Categorie con sentenze</p>
                <button onClick={caricaDati} className="text-nebbia/30 hover:text-nebbia transition-colors">
                    <RefreshCw size={13} />
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Categoria</th>
                                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Sentenze</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {categorie.length === 0 ? (
                                <tr><td colSpan={3} className="px-4 py-20 text-center">
                                    <p className="font-body text-sm text-nebbia/30">Nessuna categoria trovata</p>
                                </td></tr>
                            ) : categorie.map(c => (
                                <tr key={c.codice} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/admin/normativa/sentenze/${c.codice}`)}>
                                    <td className="px-4 py-3">
                                        <p className="font-body text-sm font-medium text-nebbia">{c.label}</p>
                                        <p className="font-body text-xs text-nebbia/30 mt-0.5">{c.codice}</p>
                                    </td>
                                    <td className="px-4 py-3 font-body text-sm text-oro font-medium">{c.totale.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        <ChevronRight size={14} className="text-nebbia/30 inline" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}