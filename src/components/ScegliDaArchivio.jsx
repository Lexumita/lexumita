// src/components/ScegliDaArchivio.jsx
// ─────────────────────────────────────────────────────────────
// Banca Dati → «Allega un documento» → «Dal tuo archivio» (02-10-2026).
// Elenco dei documenti dell'archivio già letti: scegliendone uno, l'analisi
// usa il testo che l'archivio ha già estratto, senza ricaricare il file.
// La ricerca sul titolo la fa il DB (massimo 50 righe per volta).
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Search, FileText, Loader2, AlertCircle, FolderOpen } from 'lucide-react'
import {
    cercaDocumentiLetti, leggiCategorieArchivio, contaDocumentiInLettura, formattaSpazio,
} from '@/lib/archivio'

export default function ScegliDaArchivio({ aperto, onChiudi, onScegli, titolareId, userId, rottaArchivio }) {
    const [cerca, setCerca] = useState('')
    const [categoriaId, setCategoriaId] = useState('')
    const [categorie, setCategorie] = useState([])
    const [documenti, setDocumenti] = useState([])
    const [inLettura, setInLettura] = useState(0)
    const [caricando, setCaricando] = useState(true)
    const [errore, setErrore] = useState('')

    // Categorie e documenti in lettura: una volta all'apertura
    useEffect(() => {
        if (!aperto || !titolareId) return
        leggiCategorieArchivio(titolareId).then(setCategorie).catch(() => setCategorie([]))
        contaDocumentiInLettura({ titolareId, userId }).then(setInLettura).catch(() => setInLettura(0))
    }, [aperto, titolareId, userId])

    // Elenco: ricarica (con un attimo di attesa) quando cambiano ricerca o categoria
    useEffect(() => {
        if (!aperto || !titolareId) return
        let annullato = false
        setCaricando(true)
        setErrore('')
        const t = setTimeout(async () => {
            try {
                const righe = await cercaDocumentiLetti({ titolareId, userId, cerca, categoriaId })
                if (!annullato) setDocumenti(righe)
            } catch (err) {
                if (!annullato) setErrore(err.message)
            } finally {
                if (!annullato) setCaricando(false)
            }
        }, cerca ? 300 : 0)
        return () => { annullato = true; clearTimeout(t) }
    }, [aperto, titolareId, userId, cerca, categoriaId])

    // Esc chiude
    useEffect(() => {
        if (!aperto) return
        const onKey = e => { if (e.key === 'Escape') onChiudi() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [aperto, onChiudi])

    if (!aperto) return null

    const nomeCategoria = id => categorie.find(c => c.id === id)?.nome ?? 'Senza categoria'
    const filtrato = !!cerca.trim() || !!categoriaId

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-petrolio/80 backdrop-blur-sm"
            onClick={onChiudi}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="scegli-archivio-titolo"
                className="bg-slate border border-white/10 w-full sm:max-w-2xl max-h-[88vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <FolderOpen size={14} className="text-oro" />
                        <p id="scegli-archivio-titolo" className="font-body text-sm font-medium text-nebbia">
                            Scegli dal tuo archivio
                        </p>
                    </div>
                    <button
                        onClick={onChiudi}
                        className="flex items-center justify-center min-w-[40px] min-h-[40px] -mr-2 text-nebbia/40 hover:text-nebbia transition-colors"
                        title="Chiudi"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="px-5 pt-4 pb-3 space-y-2 border-b border-white/5">
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                        <input
                            autoFocus
                            value={cerca}
                            onChange={e => setCerca(e.target.value)}
                            placeholder="Cerca per titolo..."
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-3 py-2.5 outline-none focus:border-oro/40 placeholder:text-nebbia/25"
                        />
                    </div>
                    {categorie.length > 0 && (
                        <select
                            value={categoriaId}
                            onChange={e => setCategoriaId(e.target.value)}
                            className="w-full sm:w-auto bg-petrolio border border-white/10 text-nebbia/70 font-body text-xs px-3 py-2 outline-none focus:border-oro/40"
                        >
                            <option value="">Tutte le categorie</option>
                            <option value="senza">Senza categoria</option>
                            {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {caricando ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={18} className="animate-spin text-oro/60" />
                        </div>
                    ) : errore ? (
                        <p className="m-5 font-body text-xs text-red-400 flex items-center gap-1.5">
                            <AlertCircle size={12} className="shrink-0" /> {errore}
                        </p>
                    ) : documenti.length === 0 ? (
                        <div className="px-5 py-10 text-center space-y-2">
                            <p className="font-body text-sm text-nebbia/50">
                                {filtrato ? 'Nessun documento trovato.' : 'Nel tuo archivio non ci sono ancora documenti pronti da analizzare.'}
                            </p>
                            {inLettura > 0 && (
                                <p className="font-body text-xs text-nebbia/35">
                                    {inLettura === 1 ? '1 documento è' : `${inLettura} documenti sono`} ancora in lettura: tra poco saranno disponibili.
                                </p>
                            )}
                            {!filtrato && rottaArchivio && (
                                <Link to={rottaArchivio} className="inline-block font-body text-xs text-oro border border-oro/30 px-3 py-2 hover:bg-oro/10 transition-colors">
                                    Vai all'archivio →
                                </Link>
                            )}
                        </div>
                    ) : (
                        <ul className="divide-y divide-white/5">
                            {documenti.map(d => (
                                <li key={d.id}>
                                    <button
                                        onClick={() => onScegli(d)}
                                        className="w-full text-left px-5 py-3 min-h-[52px] hover:bg-petrolio/50 transition-colors flex items-start gap-3"
                                    >
                                        <FileText size={14} className="text-salvia/70 shrink-0 mt-0.5" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-body text-sm text-nebbia/85 truncate">{d.titolo}</span>
                                            <span className="block font-body text-xs text-nebbia/35 mt-0.5">
                                                {nomeCategoria(d.categoria_id)} · {new Date(d.created_at).toLocaleDateString('it-IT')}
                                                {d.dimensione ? ` · ${formattaSpazio(d.dimensione)}` : ''}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {documenti.length >= 50 && !caricando && (
                    <p className="px-5 py-2.5 border-t border-white/5 font-body text-xs text-nebbia/35">
                        Vedi i 50 più recenti: cerca per titolo per trovare gli altri.
                    </p>
                )}
            </div>
        </div>
    )
}
