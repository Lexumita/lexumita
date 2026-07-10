// src/components/commercialista/BoxDocumentiMandato.jsx
//
// Documenti del mandato + estrazione OCR del movimento. Per ogni documento
// con testo estratto, i bottoni "Entrata/Uscita" chiamano l'edge estrai-movimento
// che legge il documento con l'AI e crea il movimento (origine='ocr', da verificare).
// Se l'AI non trova l'importo, si apre il form manuale precompilato.
//
// Props:
//   mandatoId  (string)
//   clienteId  (string|null)
//   onMovimentoChange()  - notifica ai box cassa (refresh)

import { useState, useEffect } from 'react'
import { FileText, TrendingUp, TrendingDown, Loader2, AlertCircle, ShieldAlert, Trash2, Paperclip } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtEUR } from '@/lib/cassa'
import FormMovimento from './FormMovimento'

function AssegnaMovimento({ doc, mandatoId, clienteId, onMovimentoChange }) {
    const [movimenti, setMovimenti] = useState([])
    const [elaborando, setElaborando] = useState(null)   // 'entrata' | 'uscita' | null
    const [errore, setErrore] = useState('')
    const [formPrefill, setFormPrefill] = useState(null)  // { tipo, valoriIniziali } | null

    useEffect(() => { caricaMovimenti() }, [doc.id])

    async function caricaMovimenti() {
        const { data } = await supabase.from('movimenti')
            .select('id, tipo, importo, verificato, origine')
            .eq('documento_id', doc.id)
        setMovimenti(data ?? [])
    }

    async function estrai(tipo) {
        setElaborando(tipo); setErrore('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/estrai-movimento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ documento_id: doc.id, tipo, mandato_id: mandatoId }),
            })
            const json = await res.json()
            if (json.ok) {
                await caricaMovimenti()
                onMovimentoChange?.()
            } else if (json.needs_manual) {
                // L'AI non ha trovato l'importo → form manuale precompilato
                setFormPrefill({ tipo, valoriIniziali: { documento_id: doc.id, descrizione: json.suggeriti?.descrizione ?? doc.titolo, data: json.suggeriti?.data ?? undefined } })
            } else {
                setErrore(json.error ?? 'Estrazione non riuscita')
            }
        } catch (e) {
            setErrore(e.message)
        } finally {
            setElaborando(null)
        }
    }

    async function scollega(movId) {
        await supabase.from('movimenti').delete().eq('id', movId)
        await caricaMovimenti()
        onMovimentoChange?.()
    }

    return (
        <div className="bg-petrolio border border-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                    <FileText size={14} className="text-oro/50 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="font-body text-sm text-nebbia truncate">{doc.titolo}</p>
                        <p className="font-body text-[10px] text-nebbia/30 mt-0.5">
                            {doc.testo_estratto ? 'Testo disponibile' : 'Nessun testo (OCR in corso o assente)'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => estrai('entrata')} disabled={!!elaborando}
                        className="flex items-center gap-1 px-2 py-1 border border-salvia/30 text-salvia font-body text-[11px] hover:bg-salvia/10 transition-colors disabled:opacity-40" title="Estrai come entrata">
                        {elaborando === 'entrata' ? <Loader2 size={11} className="animate-spin" /> : <TrendingUp size={11} />} Entrata
                    </button>
                    <button onClick={() => estrai('uscita')} disabled={!!elaborando}
                        className="flex items-center gap-1 px-2 py-1 border border-oro/30 text-oro font-body text-[11px] hover:bg-oro/10 transition-colors disabled:opacity-40" title="Estrai come uscita">
                        {elaborando === 'uscita' ? <Loader2 size={11} className="animate-spin" /> : <TrendingDown size={11} />} Uscita
                    </button>
                </div>
            </div>

            {/* Movimenti collegati */}
            {movimenti.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                    {movimenti.map(m => (
                        <div key={m.id} className="flex items-center gap-2 text-xs font-body">
                            {m.tipo === 'entrata' ? <TrendingUp size={10} className="text-salvia" /> : <TrendingDown size={10} className="text-oro" />}
                            <span className="text-nebbia/70">€ {fmtEUR(m.importo)}</span>
                            {m.origine === 'ocr' && !m.verificato && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border border-amber-400/30 text-amber-400"><ShieldAlert size={9} /> da verificare</span>
                            )}
                            <button onClick={() => scollega(m.id)} className="ml-auto text-nebbia/25 hover:text-red-400 transition-colors" title="Scollega ed elimina movimento"><Trash2 size={11} /></button>
                        </div>
                    ))}
                </div>
            )}

            {errore && <p className="mt-2 flex items-center gap-1 text-[11px] text-red-400 font-body"><AlertCircle size={11} /> {errore}</p>}

            {formPrefill && (
                <FormMovimento
                    tipo={formPrefill.tipo}
                    clienteId={clienteId}
                    mandatoId={mandatoId}
                    valoriIniziali={formPrefill.valoriIniziali}
                    onClose={() => setFormPrefill(null)}
                    onSaved={() => { setFormPrefill(null); caricaMovimenti(); onMovimentoChange?.() }}
                />
            )}
        </div>
    )
}

export default function BoxDocumentiMandato({ mandatoId, clienteId = null, onMovimentoChange, refreshTrigger = 0 }) {
    const [documenti, setDocumenti] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { carica() }, [mandatoId, refreshTrigger])

    async function carica() {
        setLoading(true)
        const { data } = await supabase.from('archivio_documenti')
            .select('id, titolo, testo_estratto, ocr_status, created_at')
            .eq('mandato_id', mandatoId)
            .order('created_at', { ascending: false })
        setDocumenti(data ?? [])
        setLoading(false)
    }

    return (
        <div className="bg-slate border border-white/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Paperclip size={15} className="text-oro/60" />
                <h2 className="font-display text-lg text-nebbia">Documenti del mandato</h2>
                {documenti.length > 0 && <span className="font-body text-xs text-nebbia/30">({documenti.length})</span>}
            </div>
            <p className="font-body text-[11px] text-nebbia/30 -mt-2">
                Estrai automaticamente entrate e uscite dai documenti: l'AI legge fatture e ricevute e crea il movimento (da verificare).
            </p>

            {loading ? (
                <div className="flex items-center justify-center py-8"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
            ) : documenti.length === 0 ? (
                <div className="bg-petrolio/40 border border-white/5 p-6 text-center">
                    <FileText size={22} className="text-nebbia/15 mx-auto mb-2" />
                    <p className="font-body text-xs text-nebbia/40">Nessun documento collegato al mandato</p>
                    <p className="font-body text-[11px] text-nebbia/25 mt-1">Carica fatture e ricevute nell'archivio e assegnale a questo mandato.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {documenti.map(doc => (
                        <AssegnaMovimento key={doc.id} doc={doc} mandatoId={mandatoId} clienteId={clienteId} onMovimentoChange={onMovimentoChange} />
                    ))}
                </div>
            )}
        </div>
    )
}
