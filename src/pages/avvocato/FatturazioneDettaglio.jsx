// src/pages/avvocato/FatturazioneDettaglio.jsx

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { BackButton, Badge } from '@/components/shared'
import {
    FileText, Download, Trash2, Plus, Check, AlertCircle, X,
    Building2, User, Calendar, CreditCard, Edit2, Loader2,
    FileSignature, Wallet, Archive
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STATO_CONFIG = {
    pagata: { label: 'Pagata', variant: 'salvia' },
    in_attesa: { label: 'In attesa', variant: 'warning' },
    scaduta: { label: 'Scaduta', variant: 'red' },
    annullata: { label: 'Annullata', variant: 'gray' },
}

const METODI_PAGAMENTO = [
    { value: 'bonifico', label: 'Bonifico bancario' },
    { value: 'contanti', label: 'Contanti' },
    { value: 'assegno', label: 'Assegno' },
    { value: 'pos', label: 'POS / Carta' },
    { value: 'altro', label: 'Altro' },
]

function fmtEUR(n) {
    const v = Number(n ?? 0)
    return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function nomeCliente(c) {
    if (!c) return '—'
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

// ─────────────────────────────────────────────────────────────
// MODAL REGISTRA PAGAMENTO
// ─────────────────────────────────────────────────────────────
function ModalRegistraPagamento({ fattura, residuo, onClose, onSuccess }) {
    const [form, setForm] = useState({
        data_pagamento: new Date().toISOString().slice(0, 10),
        importo: residuo.toFixed(2),
        metodo: 'bonifico',
        riferimento: '',
        note: '',
    })
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')

    async function handleSalva() {
        setErrore('')
        const imp = Number(form.importo)
        if (isNaN(imp) || imp <= 0) { setErrore('Importo non valido'); return }
        if (!form.data_pagamento) { setErrore('Data pagamento obbligatoria'); return }

        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('pagamenti_fattura').insert({
                fattura_id: fattura.id,
                data_pagamento: form.data_pagamento,
                importo: imp,
                metodo: form.metodo,
                riferimento: form.riferimento?.trim() || null,
                note: form.note?.trim() || null,
                registrato_da: user.id,
            })
            if (error) throw new Error(error.message)
            onSuccess()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-white/10 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-salvia" />
                        <h2 className="font-display text-lg text-nebbia">Registra pagamento</h2>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-petrolio/40 border border-white/5 p-3 space-y-1">
                        <p className="font-body text-xs text-nebbia/40">
                            Fattura <span className="text-nebbia/70">{fattura.numero}</span>
                        </p>
                        <p className="font-body text-xs text-nebbia/40">
                            Residuo da incassare: <span className="text-oro font-medium">EUR {fmtEUR(residuo)}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Data *</label>
                            <input
                                type="date"
                                value={form.data_pagamento}
                                onChange={e => setForm(p => ({ ...p, data_pagamento: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Importo (EUR) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={form.importo}
                                onChange={e => setForm(p => ({ ...p, importo: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Metodo *</label>
                        <select
                            value={form.metodo}
                            onChange={e => setForm(p => ({ ...p, metodo: e.target.value }))}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                        >
                            {METODI_PAGAMENTO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                            Riferimento <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span>
                        </label>
                        <input
                            placeholder="Es. CRO bonifico, N. assegno..."
                            value={form.riferimento}
                            onChange={e => setForm(p => ({ ...p, riferimento: e.target.value }))}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                            Note <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span>
                        </label>
                        <textarea
                            rows={2}
                            value={form.note}
                            onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none"
                        />
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button onClick={onClose} disabled={salvando}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                            Annulla
                        </button>
                        <button onClick={handleSalva} disabled={salvando}
                            className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">
                            {salvando
                                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                : <><Check size={14} /> Registra pagamento</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MODAL CONFERMA ELIMINAZIONE
// ─────────────────────────────────────────────────────────────
export function ModalEliminaFattura({ fattura, onClose, onEliminata }) {
    const [conferma, setConferma] = useState('')
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')
    const matchEsatto = conferma.trim() === fattura.numero

    async function elimina() {
        if (!matchEsatto) return
        setErrore(''); setInviando(true)
        try {
            const { data, error } = await supabase.functions.invoke('elimina-fattura', {
                body: { fattura_id: fattura.id }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore')
            onEliminata()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-red-500/30 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <Trash2 size={16} className="text-red-400" />
                        <h2 className="font-display text-lg text-nebbia">Elimina fattura</h2>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-red-900/15 border border-red-500/30 p-4">
                        <p className="font-body text-sm text-red-400 leading-relaxed mb-2">
                            <span className="font-semibold">Operazione irreversibile.</span>
                        </p>
                        <p className="font-body text-xs text-red-400/80 leading-relaxed">
                            Saranno cancellati: la fattura, le righe, i pagamenti registrati,
                            il PDF generato e il record nell'archivio dello studio.
                            Il numero <strong>{fattura.numero}</strong> resta consumato nel
                            registro fiscale (non puo' essere riutilizzato).
                        </p>
                    </div>

                    <p className="font-body text-sm text-nebbia/60">
                        Per confermare digita il numero esatto della fattura:
                    </p>
                    <p className="font-body text-base font-semibold text-oro">{fattura.numero}</p>

                    <input
                        value={conferma}
                        onChange={e => setConferma(e.target.value)}
                        placeholder={fattura.numero}
                        autoFocus
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={onClose} disabled={inviando}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                            Annulla
                        </button>
                        <button onClick={elimina} disabled={!matchEsatto || inviando}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            {inviando
                                ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                                : <><Trash2 size={14} /> Elimina definitivamente</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MODAL SCOLLEGA PRATICA
// ─────────────────────────────────────────────────────────────
function ModalScollegaPratica({ fattura, onClose, onSuccess }) {
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')

    async function scollega() {
        setErrore(''); setInviando(true)
        try {
            const { error } = await supabase
                .from('fatture')
                .update({ pratica_id: null })
                .eq('id', fattura.id)
            if (error) throw new Error(error.message)
            onSuccess()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-white/10 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <h2 className="font-display text-lg text-nebbia">Scollega pratica</h2>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <p className="font-body text-sm text-nebbia/70 leading-relaxed">
                        Vuoi scollegare la fattura <span className="text-oro">{fattura.numero}</span> dalla
                        pratica <span className="text-oro">"{fattura.pratica?.titolo}"</span>?
                    </p>
                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                        La fattura resterà invariata nel registro, ma non sarà più collegata a questa pratica.
                        Potrai ricollegarla in qualsiasi momento.
                    </p>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={onClose} disabled={inviando}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                            Annulla
                        </button>
                        <button onClick={scollega} disabled={inviando}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors disabled:opacity-40">
                            {inviando
                                ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                                : 'Scollega'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MODAL COLLEGA PRATICA
// ─────────────────────────────────────────────────────────────
function ModalCollegaPratica({ fattura, onClose, onSuccess }) {
    const [pratiche, setPratiche] = useState([])
    const [caricando, setCaricando] = useState(true)
    const [filtro, setFiltro] = useState('')
    const [selezionata, setSelezionata] = useState(null)
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        async function carica() {
            // Pratiche dello stesso cliente, ordinate per recenti
            let query = supabase
                .from('pratiche')
                .select('id, titolo, tipo, stato, cliente_id, cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto)')
                .eq('avvocato_id', fattura.avvocato_id)
                .order('updated_at', { ascending: false })

            // Priorità: stesso cliente della fattura
            if (fattura.cliente_id) {
                query = query.eq('cliente_id', fattura.cliente_id)
            }

            const { data, error } = await query.limit(50)

            if (error) {
                setErrore(error.message)
            } else if ((!data || data.length === 0) && fattura.cliente_id) {
                // Fallback: tutte le pratiche se nessuna per quel cliente
                const { data: tutte } = await supabase
                    .from('pratiche')
                    .select('id, titolo, tipo, stato, cliente_id, cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto)')
                    .eq('avvocato_id', fattura.avvocato_id)
                    .order('updated_at', { ascending: false })
                    .limit(50)
                setPratiche(tutte ?? [])
            } else {
                setPratiche(data ?? [])
            }
            setCaricando(false)
        }
        carica()
    }, [fattura.cliente_id, fattura.avvocato_id])

    async function collega() {
        if (!selezionata) return
        setErrore(''); setInviando(true)
        try {
            const { error } = await supabase
                .from('fatture')
                .update({ pratica_id: selezionata.id })
                .eq('id', fattura.id)
            if (error) throw new Error(error.message)
            onSuccess()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    const pratFiltrate = pratiche.filter(p => {
        if (!filtro.trim()) return true
        const q = filtro.trim().toLowerCase()
        return p.titolo?.toLowerCase().includes(q) || p.tipo?.toLowerCase().includes(q)
    })

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-white/10 w-full max-w-lg max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-white/8 shrink-0">
                    <h2 className="font-display text-lg text-nebbia">Collega a una pratica</h2>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    <p className="font-body text-xs text-nebbia/40">
                        Seleziona la pratica a cui collegare la fattura <span className="text-oro">{fattura.numero}</span>
                    </p>

                    <input
                        autoFocus
                        placeholder="Cerca pratica..."
                        value={filtro}
                        onChange={e => setFiltro(e.target.value)}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />

                    {caricando ? (
                        <div className="flex justify-center py-8">
                            <Loader2 size={20} className="animate-spin text-oro" />
                        </div>
                    ) : pratFiltrate.length === 0 ? (
                        <p className="font-body text-sm text-nebbia/30 text-center py-6">
                            {pratiche.length === 0 ? 'Nessuna pratica disponibile' : 'Nessuna pratica corrisponde alla ricerca'}
                        </p>
                    ) : (
                        <div className="space-y-1.5">
                            {pratFiltrate.map(p => {
                                const isSelected = selezionata?.id === p.id
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelezionata(p)}
                                        className={`w-full text-left p-3 border transition-colors ${isSelected
                                            ? 'border-oro/50 bg-oro/5'
                                            : 'border-white/5 bg-petrolio/40 hover:border-white/15'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className={`font-body text-sm truncate ${isSelected ? 'text-oro' : 'text-nebbia'}`}>
                                                    {p.titolo}
                                                </p>
                                                <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                                    {p.tipo ?? '—'}
                                                    {p.stato === 'chiusa' && ' · Chiusa'}
                                                </p>
                                            </div>
                                            {isSelected && <Check size={14} className="text-oro shrink-0" />}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 p-5 border-t border-white/8 shrink-0">
                    <button onClick={onClose} disabled={inviando}
                        className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                        Annulla
                    </button>
                    <button onClick={collega} disabled={!selezionata || inviando}
                        className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">
                        {inviando
                            ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                            : <><Check size={14} /> Collega</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// PAGINA DETTAGLIO
// ─────────────────────────────────────────────────────────────
export default function AvvocatoFatturazioneDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [fattura, setFattura] = useState(null)
    const [righe, setRighe] = useState([])
    const [pagamenti, setPagamenti] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')

    const [generandoPdf, setGenerandoPdf] = useState(false)
    const [scaricandoPdf, setScaricandoPdf] = useState(false)
    const [modalPagamento, setModalPagamento] = useState(false)
    const [modalElimina, setModalElimina] = useState(false)
    const [modalScollega, setModalScollega] = useState(false)
    const [modalCollega, setModalCollega] = useState(false)

    async function carica() {
        setLoading(true); setErrore('')
        const [{ data: f }, { data: rig }, { data: pag }] = await Promise.all([
            supabase.from('fatture')
                .select(`
          *,
          cliente:cliente_id(id, nome, cognome, ragione_sociale, tipo_soggetto, cf, partita_iva, email, telefono, indirizzo, comune, provincia, cap, pec),
          pratica:pratica_id(id, titolo)
        `)
                .eq('id', id).single(),
            supabase.from('righe_fattura').select('*').eq('fattura_id', id).order('ordine'),
            supabase.from('pagamenti_fattura').select('*').eq('fattura_id', id).order('data_pagamento', { ascending: false }),
        ])
        if (!f) { setErrore('Fattura non trovata'); setLoading(false); return }
        setFattura(f)
        setRighe(rig ?? [])
        setPagamenti(pag ?? [])
        setLoading(false)
    }

    useEffect(() => { carica() }, [id])

    async function generaPdf() {
        setGenerandoPdf(true); setErrore('')
        try {
            const { data, error } = await supabase.functions.invoke('genera-fattura-pdf', {
                body: { fattura_id: id }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore')
            // Apri il PDF generato in nuova scheda
            if (data.url) window.open(data.url, '_blank')
            // Ricarica fattura per avere pdf_generato_at aggiornato
            await carica()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setGenerandoPdf(false)
        }
    }

    async function scaricaPdf() {
        if (!fattura?.pdf_storage_path) { generaPdf(); return }
        setScaricandoPdf(true)
        try {
            const { data, error } = await supabase.storage
                .from('fatture')
                .createSignedUrl(fattura.pdf_storage_path, 3600)
            if (error || !data?.signedUrl) throw new Error('Errore download')
            window.open(data.signedUrl, '_blank')
        } catch (err) {
            setErrore(err.message)
        } finally {
            setScaricandoPdf(false)
        }
    }

    async function annullaFattura() {
        if (!confirm('Annullare questa fattura? Lo stato passa a "annullata" ma la fattura non viene cancellata (per motivi fiscali).')) return
        await supabase.from('fatture').update({ stato: 'annullata' }).eq('id', id)
        await carica()
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={24} className="animate-spin text-oro" />
        </div>
    )

    if (errore && !fattura) return (
        <div className="space-y-5">
            <BackButton to="/fatturazione" label="Fatturazione" />
            <div className="flex items-center gap-2 text-red-400 text-xs font-body p-4 bg-red-900/10 border border-red-500/20">
                <AlertCircle size={14} /> {errore}
            </div>
        </div>
    )

    const totaleLordo = Number(fattura.totale_lordo ?? fattura.importo ?? 0)
    const totalePagato = pagamenti.reduce((s, p) => s + Number(p.importo ?? 0), 0)
    const residuo = totaleLordo - totalePagato
    const isScaduta = fattura.stato === 'in_attesa' && fattura.data_scadenza && new Date(fattura.data_scadenza) < new Date()
    const statoEff = isScaduta ? 'scaduta' : fattura.stato
    const sc = STATO_CONFIG[statoEff] ?? STATO_CONFIG.in_attesa

    const ha_pdf = !!fattura.pdf_storage_path
    const archiviata = ha_pdf

    return (
        <div className="space-y-5">
            <BackButton to="/fatturazione" label="Fatturazione" />

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <p className="section-label mb-2 flex items-center gap-2">
                        <FileText size={11} /> Fattura
                    </p>
                    <h1 className="font-display text-4xl font-light text-nebbia">{fattura.numero}</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-1">
                        Emessa il {new Date(fattura.data_emissione).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {fattura.data_scadenza && (
                            <> · Scadenza {new Date(fattura.data_scadenza).toLocaleDateString('it-IT')}</>
                        )}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge label={sc.label} variant={sc.variant} />
                    {archiviata && (
                        <span className="flex items-center gap-1 font-body text-xs text-salvia/70 border border-salvia/20 px-2 py-0.5 bg-salvia/5">
                            <Archive size={10} /> Archiviata
                        </span>
                    )}
                </div>
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {/* Azioni rapide */}
            <div className="flex flex-wrap gap-2">
                {residuo > 0 && fattura.stato !== 'annullata' && (
                    <button
                        onClick={() => setModalPagamento(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors"
                    >
                        <Wallet size={14} /> Registra pagamento
                    </button>
                )}

                {!ha_pdf ? (
                    <button
                        onClick={generaPdf}
                        disabled={generandoPdf}
                        className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
                    >
                        {generandoPdf
                            ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
                            : <><FileSignature size={14} /> Genera PDF e archivia</>
                        }
                    </button>
                ) : (
                    <>
                        <button
                            onClick={scaricaPdf}
                            disabled={scaricandoPdf}
                            className="flex items-center gap-2 px-4 py-2 border border-oro/30 text-oro font-body text-sm hover:bg-oro/10 transition-colors disabled:opacity-40"
                        >
                            {scaricandoPdf
                                ? <><Loader2 size={14} className="animate-spin" /> Apertura...</>
                                : <><Download size={14} /> Scarica PDF</>
                            }
                        </button>
                        <button
                            onClick={generaPdf}
                            disabled={generandoPdf}
                            className="flex items-center gap-2 px-4 py-2 border border-white/10 text-nebbia/60 hover:border-oro/30 hover:text-oro font-body text-sm transition-colors disabled:opacity-40"
                            title="Rigenera il PDF e aggiorna l'archivio"
                        >
                            {generandoPdf
                                ? <Loader2 size={14} className="animate-spin" />
                                : <><FileSignature size={14} /> Rigenera PDF</>
                            }
                        </button>
                    </>
                )}

                <div className="flex-1" />

                {fattura.stato !== 'annullata' && fattura.stato !== 'pagata' && (
                    <button
                        onClick={annullaFattura}
                        className="flex items-center gap-2 px-4 py-2 border border-white/10 text-nebbia/40 hover:text-amber-400 hover:border-amber-400/30 transition-colors font-body text-sm"
                    >
                        <X size={14} /> Annulla
                    </button>
                )}

                <button
                    onClick={() => setModalElimina(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-white/10 text-nebbia/40 hover:text-red-400 hover:border-red-500/30 transition-colors font-body text-sm"
                >
                    <Trash2 size={14} /> Elimina
                </button>
            </div>

            {/* Layout 2 colonne: dati + riepilogo */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
                {/* COLONNA SX */}
                <div className="space-y-5">

                    {/* Cliente */}
                    <div className="bg-slate border border-white/5 p-5 space-y-3">
                        <p className="section-label">Destinatario</p>
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 flex items-center justify-center bg-petrolio border border-white/10 shrink-0">
                                {fattura.cliente?.tipo_soggetto === 'persona_giuridica'
                                    ? <Building2 size={15} className="text-oro/60" />
                                    : <User size={15} className="text-oro/60" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <Link to={`/clienti/${fattura.cliente?.id}`} className="font-body text-sm font-medium text-nebbia hover:text-oro transition-colors">
                                    {nomeCliente(fattura.cliente)}
                                </Link>
                                <div className="font-body text-xs text-nebbia/40 mt-1 space-y-0.5">
                                    {fattura.cliente?.cf && <p>C.F. {fattura.cliente.cf}</p>}
                                    {fattura.cliente?.partita_iva && <p>P.IVA {fattura.cliente.partita_iva}</p>}
                                    {(fattura.cliente?.indirizzo || fattura.cliente?.comune) && (
                                        <p>
                                            {[fattura.cliente.indirizzo, fattura.cliente.cap, fattura.cliente.comune, fattura.cliente.provincia].filter(Boolean).join(' ')}
                                        </p>
                                    )}
                                    {fattura.cliente?.email && <p>{fattura.cliente.email}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-white/5">
                            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-2">Pratica collegata</p>
                            {fattura.pratica ? (
                                <div className="flex items-center justify-between gap-3">
                                    <Link
                                        to={`/pratiche/${fattura.pratica.id}`}
                                        className="font-body text-sm text-oro/80 hover:text-oro transition-colors truncate"
                                    >
                                        {fattura.pratica.titolo}
                                    </Link>
                                    <button
                                        onClick={() => setModalScollega(true)}
                                        className="font-body text-xs text-nebbia/40 hover:text-red-400 border border-white/10 hover:border-red-500/30 px-2.5 py-1 transition-colors shrink-0"
                                    >
                                        Scollega
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-body text-sm text-nebbia/40 italic">Nessuna pratica collegata</p>
                                    <button
                                        onClick={() => setModalCollega(true)}
                                        className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-2.5 py-1 hover:bg-oro/10 transition-colors shrink-0"
                                    >
                                        <Plus size={11} /> Collega
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Righe */}
                    <div className="bg-slate border border-white/5 overflow-hidden">
                        <div className="p-5 pb-3">
                            <p className="section-label">Prestazioni</p>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5 bg-petrolio/40">
                                    {['Descrizione', 'Qt.', 'Prezzo', 'Totale'].map(h => (
                                        <th key={h} className="px-4 py-2 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {righe.map(r => (
                                    <tr key={r.id} className="border-b border-white/5">
                                        <td className="px-4 py-3 font-body text-sm text-nebbia">{r.descrizione}</td>
                                        <td className="px-4 py-3 font-body text-sm text-nebbia/60 whitespace-nowrap">{Number(r.quantita).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-body text-sm text-nebbia/60 whitespace-nowrap">EUR {fmtEUR(r.prezzo_unitario)}</td>
                                        <td className="px-4 py-3 font-body text-sm font-medium text-oro whitespace-nowrap">EUR {fmtEUR(r.totale)}</td>
                                    </tr>
                                ))}
                                {righe.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-8 text-center font-body text-sm text-nebbia/30">Nessuna riga</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagamenti */}
                    <div className="bg-slate border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="section-label !m-0">Pagamenti ricevuti</p>
                            {residuo > 0 && fattura.stato !== 'annullata' && (
                                <button
                                    onClick={() => setModalPagamento(true)}
                                    className="flex items-center gap-1.5 font-body text-xs text-salvia border border-salvia/30 px-3 py-1.5 hover:bg-salvia/10 transition-colors"
                                >
                                    <Plus size={12} /> Aggiungi
                                </button>
                            )}
                        </div>

                        {pagamenti.length === 0 ? (
                            <p className="font-body text-sm text-nebbia/30 text-center py-6">Nessun pagamento registrato</p>
                        ) : (
                            <div className="space-y-2">
                                {pagamenti.map(p => (
                                    <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-petrolio/40 border border-white/5">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <Check size={13} className="text-salvia shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-body text-sm text-nebbia">
                                                    {new Date(p.data_pagamento).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </p>
                                                <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                                    {METODI_PAGAMENTO.find(m => m.value === p.metodo)?.label ?? p.metodo}
                                                    {p.riferimento && ` · ${p.riferimento}`}
                                                </p>
                                                {p.note && <p className="font-body text-xs text-nebbia/40 mt-0.5 italic">{p.note}</p>}
                                            </div>
                                        </div>
                                        <p className="font-body text-sm font-semibold text-salvia whitespace-nowrap">EUR {fmtEUR(p.importo)}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {residuo > 0.01 && pagamenti.length > 0 && (
                            <div className="mt-3 flex items-center justify-between p-3 bg-amber-400/5 border border-amber-400/20">
                                <p className="font-body text-sm text-amber-400">Residuo da incassare</p>
                                <p className="font-body text-sm font-semibold text-amber-400">EUR {fmtEUR(residuo)}</p>
                            </div>
                        )}
                    </div>

                    {/* Note */}
                    {(fattura.note_pubbliche || fattura.note_interne) && (
                        <div className="bg-slate border border-white/5 p-5 space-y-4">
                            <p className="section-label">Note</p>
                            {fattura.note_pubbliche && (
                                <div>
                                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Pubbliche (sul PDF)</p>
                                    <p className="font-body text-sm text-nebbia/70 leading-relaxed whitespace-pre-line">{fattura.note_pubbliche}</p>
                                </div>
                            )}
                            {fattura.note_interne && (
                                <div className={fattura.note_pubbliche ? 'pt-3 border-t border-white/5' : ''}>
                                    <p className="font-body text-xs text-amber-400/70 uppercase tracking-widest mb-1">Interne (solo te)</p>
                                    <p className="font-body text-sm text-nebbia/70 leading-relaxed whitespace-pre-line">{fattura.note_interne}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* COLONNA DX: riepilogo */}
                <div>
                    <div className="bg-slate border border-white/5 p-5 space-y-3 sticky top-4">
                        <p className="section-label">Riepilogo</p>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-body text-nebbia/60">
                                <span>Imponibile</span>
                                <span>EUR {fmtEUR(fattura.imponibile)}</span>
                            </div>
                            {Number(fattura.cpa_importo ?? 0) > 0 && (
                                <div className="flex justify-between text-xs font-body text-nebbia/60">
                                    <span>CPA {fattura.cpa_percentuale}%</span>
                                    <span>EUR {fmtEUR(fattura.cpa_importo)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs font-body text-nebbia/60">
                                <span>IVA {fattura.iva_percentuale}%</span>
                                <span>EUR {fmtEUR(fattura.iva_importo)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-white/10">
                                <span className="font-body text-sm font-medium text-nebbia">Totale fattura</span>
                                <span className="font-body text-base font-semibold text-oro">EUR {fmtEUR(fattura.totale_lordo)}</span>
                            </div>
                            {fattura.applica_ritenuta && Number(fattura.ritenuta_importo ?? 0) > 0 && (
                                <>
                                    <div className="flex justify-between text-xs font-body text-red-400/80 pt-1">
                                        <span>Ritenuta {fattura.ritenuta_percentuale}%</span>
                                        <span>- EUR {fmtEUR(fattura.ritenuta_importo)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-white/10">
                                        <span className="font-body text-sm font-medium text-nebbia">Netto a pagare</span>
                                        <span className="font-body text-base font-semibold text-salvia">EUR {fmtEUR(fattura.totale_netto)}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {totalePagato > 0 && (
                            <div className="pt-3 border-t border-white/10 space-y-1">
                                <div className="flex justify-between text-xs font-body">
                                    <span className="text-nebbia/60">Incassato</span>
                                    <span className="text-salvia">EUR {fmtEUR(totalePagato)}</span>
                                </div>
                                {residuo > 0.01 && (
                                    <div className="flex justify-between text-xs font-body">
                                        <span className="text-nebbia/60">Residuo</span>
                                        <span className="text-amber-400">EUR {fmtEUR(residuo)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {(fattura.metodo_pagamento || fattura.iban_pagamento) && (
                            <div className="pt-3 border-t border-white/10 space-y-1">
                                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Pagamento</p>
                                {fattura.metodo_pagamento && (
                                    <p className="font-body text-xs text-nebbia/60">{fattura.metodo_pagamento}</p>
                                )}
                                {fattura.iban_pagamento && (
                                    <p className="font-body text-xs text-nebbia/60 break-all">IBAN: {fattura.iban_pagamento}</p>
                                )}
                            </div>
                        )}

                        {archiviata && (
                            <div className="pt-3 border-t border-white/10 flex items-start gap-2">
                                <Archive size={12} className="text-salvia/70 shrink-0 mt-0.5" />
                                <p className="font-body text-xs text-salvia/70">
                                    Questa fattura e' visibile in archivio nella categoria "Fatture".
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modali */}
            {modalPagamento && (
                <ModalRegistraPagamento
                    fattura={fattura}
                    residuo={residuo}
                    onClose={() => setModalPagamento(false)}
                    onSuccess={() => { setModalPagamento(false); carica() }}
                />
            )}

            {modalElimina && (
                <ModalEliminaFattura
                    fattura={fattura}
                    onClose={() => setModalElimina(false)}
                    onEliminata={() => navigate('/fatturazione')}
                />
            )}

            {modalScollega && (
                <ModalScollegaPratica
                    fattura={fattura}
                    onClose={() => setModalScollega(false)}
                    onSuccess={() => { setModalScollega(false); carica() }}
                />
            )}

            {modalCollega && (
                <ModalCollegaPratica
                    fattura={fattura}
                    onClose={() => setModalCollega(false)}
                    onSuccess={() => { setModalCollega(false); carica() }}
                />
            )}
        </div>
    )
}