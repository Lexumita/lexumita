// src/components/admin/ModalGeneraAcquisto.jsx
//
// Modal multi-step per attivazione manuale di un prodotto da parte dell'admin.
// Sostituisce il flusso Stripe per casi di emergenza (es. pagamento ricevuto ma
// webhook non scattato, omaggio, compensazione errore).
//
// STEP 1: Selezione utente destinatario (search dropdown tra user + avvocato)
// STEP 2: Selezione prodotto + importo + sentenza (se accesso_singolo)
// STEP 3: Motivo + conferma riepilogo + invio
//
// Chiama edge function 'admin-attiva-prodotto'.

import { useState, useEffect, useRef } from 'react'
import { X, Search, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, User, Package, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const TIPO_PRODOTTO_LABEL = {
    abbonamento: 'Abbonamento',
    seat_addon: 'Seat add-on',
    accesso_singolo: 'Accesso singolo sentenza',
    crediti_ai: 'Crediti AI',
    spazio_archiviazione: 'Spazio archiviazione',
    gratuito: 'Prova gratuita',
}

export default function ModalGeneraAcquisto({ onClose, onSuccess }) {
    const [step, setStep] = useState(1)

    // STEP 1 — utente
    const [searchUtente, setSearchUtente] = useState('')
    const [utenti, setUtenti] = useState([])
    const [utenteSelezionato, setUtenteSelezionato] = useState(null)
    const [loadingUtenti, setLoadingUtenti] = useState(false)
    const debounceRef = useRef(null)

    // STEP 2 — prodotto
    const [prodotti, setProdotti] = useState([])
    const [loadingProdotti, setLoadingProdotti] = useState(true)
    const [filtroTipo, setFiltroTipo] = useState('')
    const [prodottoSelezionato, setProdottoSelezionato] = useState(null)
    const [importo, setImporto] = useState('')

    // STEP 2 — sentenza (solo per accesso_singolo)
    const [searchSentenza, setSearchSentenza] = useState('')
    const [sentenze, setSentenze] = useState([])
    const [sentenzaSelezionata, setSentenzaSelezionata] = useState(null)
    const [loadingSentenze, setLoadingSentenze] = useState(false)
    const debounceSentenzaRef = useRef(null)

    // STEP 3 — motivo + invio
    const [motivo, setMotivo] = useState('')
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')
    const [successo, setSuccesso] = useState(false)

    // ─── STEP 1: search utenti con debounce ────────────────
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!searchUtente.trim()) {
            setUtenti([])
            return
        }
        debounceRef.current = setTimeout(async () => {
            setLoadingUtenti(true)
            const q = searchUtente.trim()
            const { data } = await supabase
                .from('profiles')
                .select('id, nome, cognome, email, role, studio')
                .in('role', ['user', 'avvocato'])
                .or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,email.ilike.%${q}%`)
                .limit(15)
            setUtenti(data ?? [])
            setLoadingUtenti(false)
        }, 250)
        return () => debounceRef.current && clearTimeout(debounceRef.current)
    }, [searchUtente])

    // ─── STEP 2: carica prodotti attivi ────────────────────
    useEffect(() => {
        async function caricaProdotti() {
            const { data } = await supabase
                .from('prodotti')
                .select('id, nome, tipo, prezzo, posti, crediti_ai_mensili, spazio_gb, durata_mesi, include_banca_dati, include_monetizzazione')
                .eq('attivo', true)
                .order('tipo')
                .order('prezzo')
            setProdotti(data ?? [])
            setLoadingProdotti(false)
        }
        caricaProdotti()
    }, [])

    // ─── STEP 2: search sentenze (solo per accesso_singolo) ─
    useEffect(() => {
        if (prodottoSelezionato?.tipo !== 'accesso_singolo') return
        if (debounceSentenzaRef.current) clearTimeout(debounceSentenzaRef.current)
        if (!searchSentenza.trim()) {
            setSentenze([])
            return
        }
        debounceSentenzaRef.current = setTimeout(async () => {
            setLoadingSentenze(true)
            const q = searchSentenza.trim()
            const { data } = await supabase
                .from('sentenze')
                .select('id, numero, anno, organo, oggetto, autore:autore_id(nome, cognome)')
                .or(`numero.ilike.%${q}%,oggetto.ilike.%${q}%,organo.ilike.%${q}%`)
                .eq('stato', 'pubblica')
                .limit(15)
            setSentenze(data ?? [])
            setLoadingSentenze(false)
        }, 250)
        return () => debounceSentenzaRef.current && clearTimeout(debounceSentenzaRef.current)
    }, [searchSentenza, prodottoSelezionato])

    // ─── Quando seleziono prodotto, precompila importo ────
    function handleSelezionaProdotto(p) {
        setProdottoSelezionato(p)
        setImporto(String(p.prezzo ?? 0))
        setSentenzaSelezionata(null)
        setSearchSentenza('')
    }

    // ─── Reset prodotto se cambia il tipo filtro ──────────
    function handleCambiaFiltroTipo(t) {
        setFiltroTipo(t)
        setProdottoSelezionato(null)
        setImporto('')
        setSentenzaSelezionata(null)
    }

    // ─── INVIO ────────────────────────────────────────────
    async function handleInvia() {
        setErrore(''); setInviando(true)
        try {
            if (!utenteSelezionato) throw new Error('Seleziona un utente')
            if (!prodottoSelezionato) throw new Error('Seleziona un prodotto')
            if (importo === '' || importo === null || isNaN(Number(importo))) throw new Error('Importo non valido')
            if (Number(importo) < 0) throw new Error('Importo non puo essere negativo')
            if (!motivo.trim()) throw new Error('Motivo obbligatorio')
            if (prodottoSelezionato.tipo === 'accesso_singolo' && !sentenzaSelezionata) {
                throw new Error('Seleziona una sentenza per accesso singolo')
            }

            const body = {
                user_id: utenteSelezionato.id,
                prodotto_id: prodottoSelezionato.id,
                importo: Number(importo),
                motivo: motivo.trim(),
            }
            if (prodottoSelezionato.tipo === 'accesso_singolo') {
                body.sentenza_id = sentenzaSelezionata.id
            }

            const { data, error } = await supabase.functions.invoke('admin-attiva-prodotto', { body })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore attivazione')

            setSuccesso(true)
            setTimeout(() => {
                onSuccess?.()
                onClose()
            }, 1500)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    // ─── HELPER UI ────────────────────────────────────────
    const canProceedStep1 = !!utenteSelezionato
    const canProceedStep2 = !!prodottoSelezionato
        && importo !== ''
        && !isNaN(Number(importo))
        && Number(importo) >= 0
        && (prodottoSelezionato.tipo !== 'accesso_singolo' || !!sentenzaSelezionata)
    const isOmaggio = Number(importo) === 0

    const prodottiFiltrati = filtroTipo
        ? prodotti.filter(p => p.tipo === filtroTipo)
        : prodotti

    // ─── SUCCESS SCREEN ────────────────────────────────────
    if (successo) {
        return (
            <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate border border-salvia/30 w-full max-w-md p-8 space-y-4 text-center">
                    <div className="w-12 h-12 bg-salvia/10 border border-salvia/30 flex items-center justify-center mx-auto">
                        <CheckCircle size={24} className="text-salvia" />
                    </div>
                    <h2 className="font-display text-xl text-nebbia">Attivazione completata</h2>
                    <p className="font-body text-sm text-nebbia/60">
                        Il prodotto {prodottoSelezionato?.nome} e stato attivato su {utenteSelezionato?.nome} {utenteSelezionato?.cognome}.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* HEADER */}
                <div className="flex items-center justify-between p-5 border-b border-white/8 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-oro/10 border border-oro/30 flex items-center justify-center">
                            <Package size={14} className="text-oro" />
                        </div>
                        <div>
                            <h2 className="font-display text-lg text-nebbia">Genera acquisto manuale</h2>
                            <p className="font-body text-xs text-nebbia/40">Step {step} di 3</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                {/* PROGRESS BAR */}
                <div className="flex h-1 shrink-0">
                    <div className={`flex-1 ${step >= 1 ? 'bg-oro' : 'bg-white/5'}`} />
                    <div className={`flex-1 ${step >= 2 ? 'bg-oro' : 'bg-white/5'}`} />
                    <div className={`flex-1 ${step >= 3 ? 'bg-oro' : 'bg-white/5'}`} />
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* ═══════════════════════════════════════════════════
                        STEP 1 — Selezione utente
                        ═══════════════════════════════════════════════════ */}
                    {step === 1 && (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <User size={14} className="text-oro/60" />
                                <p className="font-body text-sm text-nebbia">Seleziona destinatario</p>
                            </div>
                            <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                                L'attivazione si applica solo a utenti gia registrati (user o avvocato).
                                Cerca per nome, cognome o email.
                            </p>

                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                <input
                                    placeholder="Cerca per nome, cognome o email..."
                                    value={searchUtente}
                                    onChange={e => setSearchUtente(e.target.value)}
                                    autoFocus
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                />
                            </div>

                            {/* RISULTATI */}
                            <div className="max-h-64 overflow-y-auto space-y-1">
                                {loadingUtenti ? (
                                    <div className="flex items-center justify-center py-6">
                                        <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                                    </div>
                                ) : searchUtente.trim() && utenti.length === 0 ? (
                                    <p className="font-body text-xs text-nebbia/30 italic text-center py-6">
                                        Nessun utente trovato
                                    </p>
                                ) : utenti.map(u => {
                                    const selezionato = utenteSelezionato?.id === u.id
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => setUtenteSelezionato(u)}
                                            className={`w-full text-left p-3 border transition-colors ${selezionato
                                                ? 'border-oro bg-oro/10'
                                                : 'border-white/8 hover:border-white/20 hover:bg-petrolio/40'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-body text-sm text-nebbia font-medium truncate">
                                                        {u.nome} {u.cognome}
                                                    </p>
                                                    <p className="font-body text-xs text-nebbia/40 truncate">{u.email}</p>
                                                    {u.studio && (
                                                        <p className="font-body text-xs text-nebbia/30 truncate">{u.studio}</p>
                                                    )}
                                                </div>
                                                <span className={`font-body text-[10px] px-2 py-0.5 uppercase tracking-wider whitespace-nowrap ${u.role === 'avvocato'
                                                    ? 'text-oro border border-oro/30 bg-oro/5'
                                                    : 'text-salvia border border-salvia/30 bg-salvia/5'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════════
                        STEP 2 — Selezione prodotto + importo
                        ═══════════════════════════════════════════════════ */}
                    {step === 2 && (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <Package size={14} className="text-oro/60" />
                                <p className="font-body text-sm text-nebbia">Seleziona prodotto</p>
                            </div>

                            {/* Filtro tipo */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleCambiaFiltroTipo('')}
                                    className={`font-body text-xs px-3 py-1.5 border ${!filtroTipo
                                        ? 'border-oro text-oro bg-oro/5'
                                        : 'border-white/10 text-nebbia/40 hover:text-nebbia hover:border-white/20'
                                        }`}
                                >
                                    Tutti
                                </button>
                                {Object.entries(TIPO_PRODOTTO_LABEL).map(([k, v]) => (
                                    <button
                                        key={k}
                                        onClick={() => handleCambiaFiltroTipo(k)}
                                        className={`font-body text-xs px-3 py-1.5 border ${filtroTipo === k
                                            ? 'border-oro text-oro bg-oro/5'
                                            : 'border-white/10 text-nebbia/40 hover:text-nebbia hover:border-white/20'
                                            }`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>

                            {/* Lista prodotti */}
                            <div className="max-h-56 overflow-y-auto space-y-1">
                                {loadingProdotti ? (
                                    <div className="flex items-center justify-center py-6">
                                        <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                                    </div>
                                ) : prodottiFiltrati.length === 0 ? (
                                    <p className="font-body text-xs text-nebbia/30 italic text-center py-6">
                                        Nessun prodotto disponibile
                                    </p>
                                ) : prodottiFiltrati.map(p => {
                                    const selezionato = prodottoSelezionato?.id === p.id
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelezionaProdotto(p)}
                                            className={`w-full text-left p-3 border transition-colors ${selezionato
                                                ? 'border-oro bg-oro/10'
                                                : 'border-white/8 hover:border-white/20 hover:bg-petrolio/40'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-body text-sm text-nebbia font-medium truncate">{p.nome}</p>
                                                    <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                                        {TIPO_PRODOTTO_LABEL[p.tipo] ?? p.tipo}
                                                        {p.crediti_ai_mensili > 0 && ` · ${p.crediti_ai_mensili} crediti`}
                                                        {p.spazio_gb > 0 && ` · ${p.spazio_gb} GB`}
                                                        {p.posti > 1 && ` · ${p.posti} posti`}
                                                        {p.durata_mesi && ` · ${p.durata_mesi} ${p.durata_mesi === 1 ? 'mese' : 'mesi'}`}
                                                    </p>
                                                </div>
                                                <span className="font-body text-sm text-oro font-medium whitespace-nowrap">
                                                    € {parseFloat(p.prezzo ?? 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* IMPORTO (solo se prodotto selezionato) */}
                            {prodottoSelezionato && (
                                <div className="pt-4 border-t border-white/8 space-y-3">
                                    <div>
                                        <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                                            Importo (EUR)
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={importo}
                                                onChange={e => setImporto(e.target.value)}
                                                className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                            />
                                            <button
                                                onClick={() => setImporto('0')}
                                                className="font-body text-xs text-nebbia/60 hover:text-oro border border-white/10 hover:border-oro/30 px-3 py-2.5 whitespace-nowrap"
                                            >
                                                Omaggio (0 €)
                                            </button>
                                            <button
                                                onClick={() => setImporto(String(prodottoSelezionato.prezzo ?? 0))}
                                                className="font-body text-xs text-nebbia/60 hover:text-oro border border-white/10 hover:border-oro/30 px-3 py-2.5 whitespace-nowrap"
                                            >
                                                Prezzo pieno
                                            </button>
                                        </div>
                                        {isOmaggio && (
                                            <p className="font-body text-xs text-amber-400 mt-2">
                                                Importo a 0 €: l'acquisto sara registrato come omaggio.
                                            </p>
                                        )}
                                    </div>

                                    {/* SENTENZA — solo per accesso_singolo */}
                                    {prodottoSelezionato.tipo === 'accesso_singolo' && (
                                        <div className="space-y-2">
                                            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase">
                                                Sentenza da sbloccare
                                            </label>
                                            <div className="relative">
                                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                                <input
                                                    placeholder="Cerca per numero, oggetto, organo..."
                                                    value={searchSentenza}
                                                    onChange={e => setSearchSentenza(e.target.value)}
                                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                                />
                                            </div>
                                            <div className="max-h-40 overflow-y-auto space-y-1">
                                                {loadingSentenze ? (
                                                    <div className="flex items-center justify-center py-4">
                                                        <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                                                    </div>
                                                ) : sentenze.map(s => {
                                                    const sel = sentenzaSelezionata?.id === s.id
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => setSentenzaSelezionata(s)}
                                                            className={`w-full text-left p-2 border text-xs ${sel
                                                                ? 'border-oro bg-oro/10'
                                                                : 'border-white/8 hover:border-white/20 hover:bg-petrolio/40'
                                                                }`}
                                                        >
                                                            <p className="font-body text-nebbia truncate">
                                                                {s.organo} {s.numero}/{s.anno}
                                                            </p>
                                                            {s.oggetto && (
                                                                <p className="font-body text-nebbia/40 truncate mt-0.5">{s.oggetto}</p>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════════
                        STEP 3 — Motivo + conferma
                        ═══════════════════════════════════════════════════ */}
                    {step === 3 && (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText size={14} className="text-oro/60" />
                                <p className="font-body text-sm text-nebbia">Riepilogo e motivo</p>
                            </div>

                            {/* Riepilogo */}
                            <div className="bg-petrolio border border-white/8 p-4 space-y-2">
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Destinatario</span>
                                    <span className="font-body text-sm text-nebbia text-right">
                                        {utenteSelezionato?.nome} {utenteSelezionato?.cognome}<br />
                                        <span className="text-xs text-nebbia/40">{utenteSelezionato?.email}</span>
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Prodotto</span>
                                    <span className="font-body text-sm text-nebbia text-right">
                                        {prodottoSelezionato?.nome}<br />
                                        <span className="text-xs text-nebbia/40">
                                            {TIPO_PRODOTTO_LABEL[prodottoSelezionato?.tipo] ?? prodottoSelezionato?.tipo}
                                        </span>
                                    </span>
                                </div>
                                {sentenzaSelezionata && (
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Sentenza</span>
                                        <span className="font-body text-sm text-nebbia text-right">
                                            {sentenzaSelezionata.organo} {sentenzaSelezionata.numero}/{sentenzaSelezionata.anno}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Importo</span>
                                    <span className={`font-body text-sm font-medium ${isOmaggio ? 'text-amber-400' : 'text-oro'}`}>
                                        € {parseFloat(importo ?? 0).toFixed(2)}
                                        {isOmaggio && <span className="text-xs ml-2">(omaggio)</span>}
                                    </span>
                                </div>
                            </div>

                            {/* Motivo */}
                            <div>
                                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                                    Motivo dell'attivazione manuale *
                                </label>
                                <textarea
                                    rows={4}
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    placeholder="Es. Pagamento ricevuto via bonifico il 12/05, webhook non scattato per timeout"
                                    autoFocus
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                                />
                                <p className="font-body text-xs text-nebbia/30 mt-1">
                                    Verra salvato nei metadati transazione e nell'audit log.
                                </p>
                            </div>

                            {errore && (
                                <div className="flex items-start gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {errore}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* FOOTER — navigazione */}
                <div className="flex items-center justify-between gap-2 p-5 border-t border-white/8 shrink-0">
                    {step > 1 ? (
                        <button
                            onClick={() => { setStep(s => s - 1); setErrore('') }}
                            disabled={inviando}
                            className="flex items-center gap-2 font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40"
                        >
                            <ArrowLeft size={14} /> Indietro
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5"
                        >
                            Annulla
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
                            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
                        >
                            Avanti <ArrowRight size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={handleInvia}
                            disabled={inviando || !motivo.trim()}
                            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
                        >
                            {inviando
                                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                : <><CheckCircle size={14} /> Conferma attivazione</>
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}