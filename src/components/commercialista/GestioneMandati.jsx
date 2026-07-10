// src/components/commercialista/GestioneMandati.jsx
//
// Tab "Mandati" della scheda cliente (port dal fiduciario CH).
// Lista i mandati del cliente + crea (via modal NuovoMandato).
// Il click su una riga porta al dettaglio mandato (/banco-lavoro/:id).
//
// Props:
//   clienteId (string) - cliente di cui mostrare i mandati

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, AlertCircle, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NuovoMandato from './NuovoMandato'

const STATO_CONFIG = {
    attivo: { label: 'Attivo', cls: 'border-salvia/40 text-salvia' },
    sospeso: { label: 'Sospeso', cls: 'border-amber-400/40 text-amber-400' },
    concluso: { label: 'Concluso', cls: 'border-white/15 text-nebbia/40' },
    archiviato: { label: 'Archiviato', cls: 'border-white/15 text-nebbia/40' },
}

export default function GestioneMandati({ clienteId }) {
    const navigate = useNavigate()
    const [mandati, setMandati] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [modalAperto, setModalAperto] = useState(false)

    useEffect(() => { carica() }, [clienteId])

    async function carica() {
        setLoading(true); setErrore('')
        const { data, error } = await supabase
            .from('mandati')
            .select('id, titolo, tipo, stato, note, created_at')
            .eq('cliente_id', clienteId)
            .order('created_at', { ascending: false })
        if (error) setErrore(error.message)
        setMandati(data ?? [])
        setLoading(false)
    }

    const nAttivi = mandati.filter(m => m.stato === 'attivo').length

    return (
        <div className="space-y-4">
            {/* Intestazione + azione */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="font-body text-sm text-nebbia/40">
                    {mandati.length} {mandati.length === 1 ? 'mandato' : 'mandati'}
                    {mandati.length > 0 && <span className="ml-2 text-nebbia/25">· {nAttivi} attivi</span>}
                </p>
                <button onClick={() => setModalAperto(true)} className="btn-primary text-sm flex items-center gap-2">
                    <Plus size={14} /> Nuovo mandato
                </button>
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : mandati.length === 0 ? (
                <div className="bg-slate border border-white/5 p-12 flex flex-col items-center text-center gap-3">
                    <FolderOpen size={32} className="text-nebbia/15" />
                    <div>
                        <p className="font-body text-sm text-nebbia/40">Nessun mandato per questo cliente</p>
                        <p className="font-body text-xs text-nebbia/25 mt-1">Crea un mandato per organizzare lavoro e scadenze.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {mandati.map(m => {
                        const sc = STATO_CONFIG[m.stato] ?? STATO_CONFIG.attivo
                        return (
                            <button key={m.id} onClick={() => navigate(`/banco-lavoro/${m.id}`)}
                                className="w-full text-left bg-slate border border-white/5 hover:border-oro/30 hover:bg-petrolio/40 transition-colors p-4 flex items-center gap-3 group">
                                <div className="w-9 h-9 flex items-center justify-center border border-oro/20 bg-oro/5 shrink-0">
                                    <FolderOpen size={15} className="text-oro" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-body text-sm font-medium text-nebbia truncate">{m.titolo}</span>
                                        <span className={`font-body text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${sc.cls}`}>{sc.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {m.tipo && <span className="font-body text-xs text-nebbia/40">{m.tipo}</span>}
                                        <span className="font-body text-xs text-nebbia/25">dal {new Date(m.created_at).toLocaleDateString('it-IT')}</span>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0" />
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Modal nuovo mandato */}
            {modalAperto && (
                <NuovoMandato
                    clienteId={clienteId}
                    onClose={() => setModalAperto(false)}
                    onSaved={(nuovoId) => {
                        setModalAperto(false)
                        if (nuovoId) navigate(`/banco-lavoro/${nuovoId}`)
                        else carica()
                    }}
                />
            )}
        </div>
    )
}
