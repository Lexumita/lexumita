// src/components/commercialista/NuovoMandato.jsx
//
// Modal per creare un mandato per un cliente (port dal fiduciario CH,
// già con il selettore cliente integrato quando manca il contesto).
//
// Props:
//   clienteId  (string?) - cliente a cui appartiene il mandato; se assente
//                          (es. apertura dal Banco Lavoro) compare il selettore
//   onClose()  - chiusura modal
//   onSaved(nuovoId) - callback dopo la creazione; riceve l'id del nuovo mandato

import { useState, useEffect } from 'react'
import { X, FolderOpen, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function NuovoMandato({ clienteId, onClose, onSaved }) {
    const [titolo, setTitolo] = useState('')
    const [tipo, setTipo] = useState('')
    const [annoRiferimento, setAnnoRiferimento] = useState('') // '' = nessuno
    const [note, setNote] = useState('')

    // Selettore cliente interno: serve quando il modal è aperto SENZA un cliente
    // predeterminato (es. dal Banco Lavoro generale).
    const serveSelettore = !clienteId
    const [clienteSel, setClienteSel] = useState('')
    const [clienti, setClienti] = useState([])

    // Range anni: da 2 anni fa a 1 avanti
    const annoCorr = new Date().getFullYear()
    const anniDisponibili = [annoCorr + 1, annoCorr, annoCorr - 1, annoCorr - 2]

    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState(null)

    // Chiudi con ESC
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' && !salvando) onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose, salvando])

    // Carica i clienti se non c'è un cliente predeterminato
    useEffect(() => {
        if (!serveSelettore) return
        let attivo = true
        ;(async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, nome, cognome, ragione_sociale, tipo_soggetto')
                .eq('role', 'cliente')
                .order('cognome')
            if (attivo) setClienti(data ?? [])
        })()
        return () => { attivo = false }
    }, [serveSelettore])

    const clienteIdEffettivo = clienteId ?? (clienteSel || null)
    const puoSalvare = titolo.trim().length > 0 && !!clienteIdEffettivo

    async function salva() {
        if (!titolo.trim()) { setErrore('Il titolo è obbligatorio.'); return }
        if (!clienteIdEffettivo) { setErrore('Seleziona un cliente.'); return }
        setSalvando(true)
        setErrore(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setErrore('Sessione scaduta. Effettua nuovamente il login.')
            setSalvando(false)
            return
        }

        // studio_id dal profilo dell'utente loggato (il trigger DB fa comunque da rete)
        const { data: profilo } = await supabase
            .from('profiles')
            .select('studio_id')
            .eq('id', user.id)
            .single()

        const txt = v => (v?.toString().trim() ? v.toString().trim() : null)

        const { data, error } = await supabase
            .from('mandati')
            .insert({
                cliente_id: clienteIdEffettivo,
                avvocato_id: user.id,
                studio_id: profilo?.studio_id ?? null,
                titolo: titolo.trim(),
                tipo: txt(tipo),
                anno_riferimento: annoRiferimento ? Number(annoRiferimento) : null,
                note: txt(note),
                stato: 'attivo',
                creato_da: user.id,
                aggiornato_da: user.id,
            })
            .select('id')
            .single()

        setSalvando(false)
        if (error) {
            setErrore(error.message)
            return
        }
        onSaved(data?.id ?? null)
    }

    const inputCls = "w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
    const labelCls = "block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2"

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
            onClick={() => { if (!salvando) onClose() }}
        >
            <div
                className="bg-slate border border-white/10 w-full max-w-lg shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <FolderOpen size={16} className="text-oro" />
                        <div>
                            <p className="font-display text-lg text-nebbia">Nuovo mandato</p>
                            <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                Organizza il lavoro e le scadenze per questo cliente
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={salvando}
                        className="p-1 hover:bg-white/5 transition-colors disabled:opacity-40">
                        <X size={18} className="text-nebbia/60" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {serveSelettore && (
                        <div>
                            <label className={labelCls}>Cliente *</label>
                            <select value={clienteSel} onChange={e => setClienteSel(e.target.value)} className={inputCls}>
                                <option value="">— Seleziona cliente —</option>
                                {clienti.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.tipo_soggetto === 'persona_giuridica' ? (c.ragione_sociale ?? '—') : `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className={labelCls}>Titolo *</label>
                        <input
                            value={titolo}
                            onChange={e => setTitolo(e.target.value)}
                            placeholder="es. Contabilità 2026, Dichiarazione dei redditi..."
                            className={inputCls}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Tipo <span className="text-nebbia/25 normal-case tracking-normal">(opzionale)</span></label>
                        <input
                            value={tipo}
                            onChange={e => setTipo(e.target.value)}
                            placeholder="es. Contabilità annuale, Consulenza IVA, Dichiarativi..."
                            className={inputCls}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Anno di riferimento <span className="text-nebbia/25 normal-case tracking-normal">(opzionale)</span></label>
                        <select
                            value={annoRiferimento}
                            onChange={e => setAnnoRiferimento(e.target.value)}
                            className={inputCls}
                        >
                            <option value="">Nessuno — mandato continuativo</option>
                            {anniDisponibili.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                        <p className="font-body text-xs text-nebbia/30 mt-1.5">
                            Se impostato, potrai generare lo scadenzario fiscale dell'anno con un click.
                        </p>
                    </div>

                    <div>
                        <label className={labelCls}>Note <span className="text-nebbia/25 normal-case tracking-normal">(opzionale)</span></label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={3}
                            placeholder="Annotazioni sul mandato..."
                            className={`${inputCls} resize-none`}
                        />
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 shrink-0">
                    <button onClick={onClose} disabled={salvando}
                        className="font-body text-sm text-nebbia/60 hover:text-nebbia px-4 py-2 transition-colors disabled:opacity-40">
                        Annulla
                    </button>
                    <button onClick={salva} disabled={!puoSalvare || salvando}
                        className="flex items-center gap-2 px-5 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {salvando
                            ? <><Loader2 size={14} className="animate-spin" /> Creazione...</>
                            : 'Crea mandato'}
                    </button>
                </div>
            </div>
        </div>
    )
}
