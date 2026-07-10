// src/components/commercialista/NuovaScadenzaMandato.jsx
//
// Modal per aggiungere una scadenza a un mandato (port dal fiduciario CH).
// Semplice: titolo + tipo + data + note. Nessun calcolo automatico
// (lo scadenzario fiscale precaricato è un'azione separata nel box).
//
// Props:
//   mandatoId  (string|null)  - mandato a cui legare la scadenza
//   clienteId  (string|null)  - cliente di riferimento
//   studioId   (string|null)  - studio (il trigger DB fa comunque da rete)
//   onClose()  - chiusura modal
//   onSaved()  - callback dopo salvataggio riuscito

import { useState, useEffect } from 'react'
import { X, Calendar, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function fmtDataLunga(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('it-IT', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
}

function isDataPassata(iso) {
    if (!iso) return false
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    return new Date(iso) < oggi
}

function giorniDifferenza(iso) {
    if (!iso) return 0
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    const target = new Date(iso); target.setHours(0, 0, 0, 0)
    return Math.round((oggi - target) / (1000 * 60 * 60 * 24))
}

export default function NuovaScadenzaMandato({ mandatoId = null, clienteId = null, studioId = null, onClose, onSaved }) {
    const [titolo, setTitolo] = useState('')
    const [tipo, setTipo] = useState('')
    const [dataScadenza, setDataScadenza] = useState('')
    const [note, setNote] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState(null)

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' && !salvando) onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose, salvando])

    const puoSalvare = titolo.trim().length > 0 && dataScadenza

    async function salva() {
        if (!puoSalvare) return
        setSalvando(true)
        setErrore(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setErrore('Sessione scaduta. Effettua nuovamente il login.')
            setSalvando(false)
            return
        }

        const { error } = await supabase.from('scadenze_mandato').insert({
            mandato_id: mandatoId,
            cliente_id: clienteId,
            avvocato_id: user.id,        // professionista proprietario
            studio_id: studioId,
            titolo: titolo.trim(),
            tipo: tipo.trim() || null,
            data_scadenza: dataScadenza,
            stato: 'aperta',
            note: note.trim() || null,
            creato_da: user.id,
        })

        setSalvando(false)
        if (error) { setErrore(error.message); return }
        onSaved()
    }

    const inputCls = "w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
    const labelCls = "font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block"

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm overflow-y-auto"
            onClick={() => { if (!salvando) onClose() }}
        >
            <div className="bg-slate border border-white/10 w-full max-w-xl my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div>
                        <p className="font-display text-lg text-nebbia">Nuova scadenza</p>
                        <p className="font-body text-xs text-nebbia/40 mt-0.5">
                            Aggiungi una scadenza a questo mandato
                        </p>
                    </div>
                    <button onClick={onClose} disabled={salvando}
                        className="p-1 hover:bg-white/5 transition-colors disabled:opacity-40">
                        <X size={18} className="text-nebbia/60" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className={labelCls}>Titolo *</label>
                        <input type="text" value={titolo} onChange={e => setTitolo(e.target.value)}
                            placeholder="es. Versamento IVA, Invio LIPE, F24 acconto..."
                            maxLength={150} className={inputCls} autoFocus />
                    </div>

                    <div>
                        <label className={labelCls}>Tipo <span className="text-nebbia/25 normal-case tracking-normal">(opzionale)</span></label>
                        <input type="text" value={tipo} onChange={e => setTipo(e.target.value)}
                            placeholder="es. IVA, LIPE, Dichiarativo, Acconti..."
                            maxLength={60} className={inputCls} />
                    </div>

                    <div>
                        <label className={labelCls}>Data scadenza *</label>
                        <input type="date" value={dataScadenza} onChange={e => setDataScadenza(e.target.value)} className={inputCls} />
                    </div>

                    {dataScadenza && (
                        <div className="bg-petrolio/50 border border-oro/20 p-4">
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-3">Anteprima</p>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Calendar size={18} className="text-oro mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-display text-xl font-semibold text-oro capitalize">{fmtDataLunga(dataScadenza)}</p>
                                        <p className="font-body text-xs text-nebbia/50 mt-0.5">{titolo.trim() || 'Scadenza'}</p>
                                    </div>
                                </div>
                                {isDataPassata(dataScadenza) && (
                                    <div className="flex items-start gap-3 pt-3 border-t border-white/5">
                                        <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                        <p className="font-body text-xs text-amber-400/90">
                                            Data già trascorsa da {giorniDifferenza(dataScadenza)} giorni.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className={labelCls}>Note <span className="text-nebbia/25 normal-case tracking-normal">(opzionale)</span></label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                            placeholder="Codici tributo, importi, riferimenti..."
                            className={`${inputCls} resize-none`} />
                    </div>

                    {errore && (
                        <div className="bg-red-500/10 border border-red-500/30 p-3">
                            <p className="font-body text-sm text-red-400">{errore}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
                    <button onClick={onClose} disabled={salvando}
                        className="font-body text-sm text-nebbia/60 hover:text-nebbia px-4 py-2 transition-colors disabled:opacity-40">
                        Annulla
                    </button>
                    <button onClick={salva} disabled={!puoSalvare || salvando}
                        className="flex items-center gap-2 px-5 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {salvando ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : 'Salva scadenza'}
                    </button>
                </div>
            </div>
        </div>
    )
}
