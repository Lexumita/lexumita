// src/components/commercialista/FormMovimento.jsx
//
// Modal per creare/modificare un movimento (entrata o uscita) del conto
// economico del cliente. Port dal fiduciario CH, adattato IT (EUR) e SENZA
// la contabilizzazione in partita doppia (Fase 3) e la generazione di
// scadenze dai previsti (extra rimandato).
//
// Props:
//   tipo            ('entrata'|'uscita')  - tipo iniziale
//   clienteId       (string)             - cliente-azienda (obbligatorio)
//   mandatoId       (string|null)        - mandato di appartenenza
//   movimento       (object|null)        - se presente → modifica
//   valoriIniziali  (object|null)        - prefill su nuovo movimento
//   onClose()                            - chiusura
//   onSaved()                            - callback dopo il salvataggio

import { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Loader2, AlertCircle, Paperclip } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CATEGORIE_SUGGERITE } from '@/lib/cassa'
import { contabilizzaMovimento } from '@/lib/generaScrittura'

const oggiISO = () => new Date().toISOString().slice(0, 10)

// Genera la scrittura in partita doppia se la categoria del movimento è imputata.
// Best-effort: se manca l'imputazione (o la contabilità non è attiva), il
// movimento resta salvato comunque e semplicemente non si contabilizza.
async function contabilizzaSeMappato(mov, user, studioId) {
    if (!mov || mov.stato !== 'effettivo' || !mov.categoria) return
    try {
        const { data: mapping } = await supabase.from('mapping_categorie').select('*')
            .eq('cliente_id', mov.cliente_id).eq('tipo', mov.tipo).eq('categoria', String(mov.categoria).trim()).maybeSingle()
        if (!mapping) return
        const { data: contiIva } = await supabase.from('piano_conti').select('id, numero')
            .eq('cliente_id', mov.cliente_id).in('numero', ['1170', '2200'])
        const byNum = {}; (contiIva ?? []).forEach(c => { byNum[c.numero] = c })
        await contabilizzaMovimento(supabase, mov, mapping, byNum, user, studioId)
    } catch { /* best-effort */ }
}

export default function FormMovimento({ tipo = 'entrata', clienteId, mandatoId = null, movimento = null, valoriIniziali = null, onClose, onSaved }) {
    const modifica = !!movimento
    const vi = valoriIniziali ?? {}

    const [tipoSel, setTipoSel] = useState(movimento?.tipo ?? tipo)
    const [descrizione, setDescrizione] = useState(movimento?.descrizione ?? vi.descrizione ?? '')
    const [importo, setImporto] = useState(
        movimento?.importo != null ? String(movimento.importo)
            : vi.importo != null ? String(vi.importo) : ''
    )
    const [data, setData] = useState(movimento?.data ?? vi.data ?? oggiISO())
    const [categoria, setCategoria] = useState(movimento?.categoria ?? '')
    const [documentoId, setDocumentoId] = useState(movimento?.documento_id ?? vi.documento_id ?? '')
    const [stato, setStato] = useState(movimento?.stato ?? vi.stato ?? 'effettivo')
    const [ricorrenza, setRicorrenza] = useState(movimento?.ricorrenza ?? 'una_tantum')
    const [ricorrenzaFine, setRicorrenzaFine] = useState(movimento?.ricorrenza_fine ?? '')

    const [documenti, setDocumenti] = useState([])
    const [categorieUsate, setCategorieUsate] = useState([])
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState(null)

    // Categorie già usate (autocompletamento → coerenza per budget/scostamenti)
    useEffect(() => {
        let attivo = true
        async function caricaCategorie() {
            let q = supabase.from('movimenti').select('categoria').not('categoria', 'is', null)
            q = mandatoId ? q.eq('mandato_id', mandatoId) : q.eq('cliente_id', clienteId)
            const { data } = await q
            if (attivo && data) {
                const uniche = [...new Set(data.map(r => (r.categoria ?? '').trim()).filter(Boolean))].sort()
                setCategorieUsate(uniche)
            }
        }
        caricaCategorie()
        return () => { attivo = false }
    }, [mandatoId, clienteId])

    // Documenti selezionabili dall'archivio (del mandato o del cliente)
    useEffect(() => {
        let attivo = true
        async function caricaDoc() {
            let q = supabase
                .from('archivio_documenti')
                .select('id, titolo')
                .not('storage_path', 'is', null)
                .order('created_at', { ascending: false })
                .limit(100)
            q = mandatoId ? q.eq('mandato_id', mandatoId) : q.eq('cliente_id', clienteId)
            const { data } = await q
            if (attivo) setDocumenti(data ?? [])
        }
        caricaDoc()
        return () => { attivo = false }
    }, [mandatoId, clienteId])

    // Chiudi con ESC
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' && !salvando) onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose, salvando])

    const importoNum = Number(String(importo).replace(',', '.'))
    const puoSalvare = descrizione.trim().length > 0 && importo !== '' && !isNaN(importoNum) && importoNum >= 0 && !!data

    // Suggerimenti categoria = quelle già usate + le predefinite del tipo scelto
    const categorieSuggerite = [...new Set([...categorieUsate, ...(CATEGORIE_SUGGERITE[tipoSel] ?? [])])]

    async function salva() {
        if (!puoSalvare) { setErrore('Compila descrizione, importo e data.'); return }
        setSalvando(true)
        setErrore(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setErrore('Sessione scaduta. Effettua nuovamente il login.'); setSalvando(false); return }

        const { data: profilo } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()

        const txt = v => (v?.toString().trim() ? v.toString().trim() : null)
        const payload = {
            tipo: tipoSel,
            importo: importoNum,
            data,
            descrizione: descrizione.trim(),
            categoria: txt(categoria),
            documento_id: documentoId || null,
            stato,
            ricorrenza: stato === 'previsto' ? ricorrenza : 'una_tantum',
            ricorrenza_fine: stato === 'previsto' && ricorrenza !== 'una_tantum' && ricorrenzaFine ? ricorrenzaFine : null,
            aggiornato_da: user.id,
        }

        let error
        if (modifica) {
            // Una modifica umana conferma il movimento (anche se nato da OCR).
            ({ error } = await supabase.from('movimenti').update({ ...payload, verificato: true }).eq('id', movimento.id))
        } else {
            const ins = await supabase.from('movimenti').insert({
                ...payload,
                cliente_id: clienteId,
                mandato_id: mandatoId ?? null,
                avvocato_id: user.id,
                studio_id: profilo?.studio_id ?? null,
                origine: 'manuale',
                verificato: true,
                creato_da: user.id,
            }).select('id, cliente_id, mandato_id, data, descrizione, documento_id, tipo, importo, categoria, stato').single()
            error = ins.error
            // Effettivo con categoria imputata → genera la scrittura in partita doppia.
            if (!ins.error && ins.data) await contabilizzaSeMappato(ins.data, user, profilo?.studio_id ?? null)
        }

        setSalvando(false)
        if (error) { setErrore(error.message); return }
        onSaved()
    }

    const inputCls = "w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
    const labelCls = "block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2"
    const eEntrata = tipoSel === 'entrata'
    const ePrevisto = stato === 'previsto'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
            onClick={() => { if (!salvando) onClose() }}>
            <div className="bg-slate border border-white/10 w-full max-w-lg shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        {eEntrata ? <TrendingUp size={16} className="text-salvia" /> : <TrendingDown size={16} className="text-oro" />}
                        <div>
                            <p className="font-display text-lg text-nebbia">
                                {modifica ? 'Modifica movimento'
                                    : ePrevisto ? (eEntrata ? 'Entrata prevista' : 'Costo previsto')
                                        : (eEntrata ? 'Nuova entrata' : 'Nuovo costo')}
                            </p>
                            <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                {mandatoId ? 'Conto economico del mandato' : 'Conto economico del cliente'}
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
                    {/* Toggle tipo */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { v: 'entrata', label: 'Entrata', Icona: TrendingUp, attivoCls: 'bg-salvia/15 border-salvia/40 text-salvia' },
                            { v: 'uscita', label: 'Uscita', Icona: TrendingDown, attivoCls: 'bg-oro/15 border-oro/40 text-oro' },
                        ].map(({ v, label, Icona, attivoCls }) => (
                            <button key={v} type="button" onClick={() => setTipoSel(v)}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 border font-body text-sm transition-colors ${tipoSel === v ? attivoCls : 'border-white/10 text-nebbia/40 hover:text-nebbia/70'}`}>
                                <Icona size={14} /> {label}
                            </button>
                        ))}
                    </div>

                    {/* Toggle stato: effettivo vs previsto */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { v: 'effettivo', label: 'Effettivo', hint: 'già avvenuto' },
                            { v: 'previsto', label: 'Previsto', hint: 'pianificato' },
                        ].map(({ v, label, hint }) => (
                            <button key={v} type="button" onClick={() => setStato(v)}
                                className={`flex flex-col items-center justify-center px-3 py-1.5 border font-body text-sm transition-colors ${stato === v ? 'bg-oro/15 border-oro/40 text-oro' : 'border-white/10 text-nebbia/40 hover:text-nebbia/70'}`}>
                                {label}
                                <span className="font-body text-[10px] text-nebbia/30 normal-case tracking-normal">{hint}</span>
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className={labelCls}>Descrizione</label>
                        <input value={descrizione} onChange={e => setDescrizione(e.target.value)}
                            placeholder={eEntrata ? 'es. Fattura n. 12 cliente Alfa' : 'es. Canone affitto ufficio'}
                            className={inputCls} autoFocus />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Importo (€)</label>
                            <input value={importo} onChange={e => setImporto(e.target.value)}
                                inputMode="decimal" placeholder="0,00" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>{ePrevisto ? 'Data prevista' : 'Data'}</label>
                            <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    {/* Ricorrenza — solo per i movimenti previsti (budget/liquidità) */}
                    {ePrevisto && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Ricorrenza</label>
                                <select value={ricorrenza} onChange={e => setRicorrenza(e.target.value)} className={inputCls}>
                                    <option value="una_tantum">Una tantum</option>
                                    <option value="mensile">Mensile</option>
                                    <option value="trimestrale">Trimestrale</option>
                                    <option value="annuale">Annuale</option>
                                </select>
                            </div>
                            {ricorrenza !== 'una_tantum' && (
                                <div>
                                    <label className={labelCls}>Fine ricorrenza <span className="text-nebbia/25 normal-case tracking-normal">(opz.)</span></label>
                                    <input type="date" value={ricorrenzaFine} onChange={e => setRicorrenzaFine(e.target.value)} className={inputCls} />
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className={labelCls}>Categoria <span className="text-nebbia/25 normal-case tracking-normal">(opzionale)</span></label>
                        <input value={categoria} onChange={e => setCategoria(e.target.value)}
                            placeholder={eEntrata ? 'es. Corrispettivi' : 'es. Fornitori'}
                            className={inputCls} list="categorie-movimento" />
                        <datalist id="categorie-movimento">
                            {categorieSuggerite.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>

                    <div>
                        <label className={labelCls}>
                            <span className="inline-flex items-center gap-1.5"><Paperclip size={11} /> Documento collegato</span>
                            <span className="text-nebbia/25 normal-case tracking-normal ml-1">(opzionale)</span>
                        </label>
                        <select value={documentoId} onChange={e => setDocumentoId(e.target.value)} className={inputCls}>
                            <option value="">Nessun documento</option>
                            {documenti.map(d => <option key={d.id} value={d.id}>{d.titolo}</option>)}
                        </select>
                        <p className="font-body text-xs text-nebbia/30 mt-1.5">
                            Collega una fattura o ricevuta già presente nell'archivio.
                        </p>
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
                        {salvando ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : (modifica ? 'Salva modifiche' : 'Registra')}
                    </button>
                </div>
            </div>
        </div>
    )
}
