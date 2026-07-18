// src/pages/avvocato/FatturazioneNuova.jsx
//
// Wizard creazione fattura:
// - Step unico, layout 2 colonne (form a sinistra, preview live a destra)
// - Cliente obbligatorio, pratica opzionale (filtrata sul cliente selezionato)
// - Righe multiple, totali calcolati LIVE in browser (stessa formula del DB)
// - 2 bottoni in fondo: "Salva bozza" e "Salva e genera PDF"

import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, BackButton, InputField } from '@/components/shared'
import {
    Plus, Trash2, AlertCircle, FileText, Building2, User,
    Loader2, Save, FileSignature, ChevronDown, Info, Scale
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CalcolaParcellaModal from '@/components/avvocato/CalcolaParcellaModal'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function nomeCliente(c) {
    if (!c) return ''
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

function fmtEUR(n) {
    const v = Number(n ?? 0)
    return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Stessa formula del trigger Postgres ricalcola_totali_fattura
// cpa     = imponibile * cpa%
// iva     = (imponibile + cpa) * iva%
// ritenuta = imponibile * ritenuta%  (se applica_ritenuta)
// lordo   = imponibile + cpa + iva
// netto   = lordo - ritenuta
function calcolaTotali({ righe, ivaPct, cpaPct, applicaRitenuta, ritenutaPct }) {
    const imponibile = righe.reduce((s, r) => {
        const q = parseFloat(r.quantita) || 0
        const p = parseFloat(r.prezzo_unitario) || 0
        return s + q * p
    }, 0)
    const cpa = Math.round(imponibile * cpaPct) / 100
    const iva = Math.round((imponibile + cpa) * ivaPct) / 100
    const ritenuta = applicaRitenuta ? Math.round(imponibile * ritenutaPct) / 100 : 0
    const lordo = imponibile + cpa + iva
    const netto = lordo - ritenuta
    return {
        imponibile: Math.round(imponibile * 100) / 100,
        cpa, iva, ritenuta,
        lordo: Math.round(lordo * 100) / 100,
        netto: Math.round(netto * 100) / 100,
    }
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PREVIEW (colonna destra, sticky)
// ─────────────────────────────────────────────────────────────
function PreviewFattura({ form, righe, totali, cliente, pratica }) {
    const oggi = new Date().toLocaleDateString('it-IT')

    return (
        <div className="bg-slate border border-white/5 p-5 space-y-4 sticky top-4">
            <p className="section-label">Anteprima fattura</p>

            <div className="space-y-1">
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Destinatario</p>
                {cliente ? (
                    <>
                        <p className="font-body text-sm font-medium text-nebbia">{nomeCliente(cliente)}</p>
                        {cliente.cf && <p className="font-body text-xs text-nebbia/40">C.F. {cliente.cf}</p>}
                        {cliente.partita_iva && <p className="font-body text-xs text-nebbia/40">P.IVA {cliente.partita_iva}</p>}
                    </>
                ) : (
                    <p className="font-body text-sm text-nebbia/25 italic">Seleziona un cliente</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                    <p className="font-body text-nebbia/30 uppercase tracking-widest mb-1">Data emissione</p>
                    <p className="font-body text-nebbia/70">{form.data_emissione ? new Date(form.data_emissione).toLocaleDateString('it-IT') : oggi}</p>
                </div>
                <div>
                    <p className="font-body text-nebbia/30 uppercase tracking-widest mb-1">Scadenza</p>
                    <p className="font-body text-nebbia/70">{form.data_scadenza ? new Date(form.data_scadenza).toLocaleDateString('it-IT') : '—'}</p>
                </div>
            </div>

            {pratica && (
                <div>
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Pratica collegata</p>
                    <p className="font-body text-xs text-nebbia/60 truncate">{pratica.titolo}</p>
                </div>
            )}

            <div className="border-t border-white/5 pt-3">
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-2">Prestazioni</p>
                {righe.length === 0 || righe.every(r => !r.descrizione?.trim()) ? (
                    <p className="font-body text-sm text-nebbia/25 italic">Aggiungi almeno una riga</p>
                ) : (
                    <div className="space-y-1.5">
                        {righe.filter(r => r.descrizione?.trim()).map((r, i) => {
                            const q = parseFloat(r.quantita) || 0
                            const p = parseFloat(r.prezzo_unitario) || 0
                            return (
                                <div key={i} className="flex justify-between gap-2 text-xs">
                                    <span className="font-body text-nebbia/70 truncate flex-1">{r.descrizione}</span>
                                    <span className="font-body text-nebbia/40 whitespace-nowrap">{q} x EUR {fmtEUR(p)}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="border-t border-white/5 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs font-body text-nebbia/60">
                    <span>Imponibile</span>
                    <span>EUR {fmtEUR(totali.imponibile)}</span>
                </div>
                {totali.cpa > 0 && (
                    <div className="flex justify-between text-xs font-body text-nebbia/60">
                        <span>CPA {form.cpa_percentuale}%</span>
                        <span>EUR {fmtEUR(totali.cpa)}</span>
                    </div>
                )}
                <div className="flex justify-between text-xs font-body text-nebbia/60">
                    <span>IVA {form.iva_percentuale}%</span>
                    <span>EUR {fmtEUR(totali.iva)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="font-body text-sm font-medium text-nebbia">Totale fattura</span>
                    <span className="font-body text-base font-semibold text-oro">EUR {fmtEUR(totali.lordo)}</span>
                </div>
                {form.applica_ritenuta && (
                    <>
                        <div className="flex justify-between text-xs font-body text-red-400/80 pt-1">
                            <span>Ritenuta {form.ritenuta_percentuale}%</span>
                            <span>- EUR {fmtEUR(totali.ritenuta)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10">
                            <span className="font-body text-sm font-medium text-nebbia">Netto a pagare</span>
                            <span className="font-body text-base font-semibold text-salvia">EUR {fmtEUR(totali.netto)}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// PAGINA NUOVA FATTURA
// ─────────────────────────────────────────────────────────────
export default function AvvocatoFatturazioneNuova() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const clientePreselezionato = searchParams.get('cliente_id')
    const praticaPreselezionata = searchParams.get('pratica_id')

    const [clienti, setClienti] = useState([])
    const [pratiche, setPratiche] = useState([]) // tutte le pratiche dello studio
    const [profiloAvv, setProfiloAvv] = useState(null)
    const [loading, setLoading] = useState(true)

    const [salvando, setSalvando] = useState(null) // null | 'bozza' | 'pdf'
    const [errore, setErrore] = useState('')

    const oggi = new Date().toISOString().slice(0, 10)
    const tra30giorni = (() => {
        const d = new Date(); d.setDate(d.getDate() + 30)
        return d.toISOString().slice(0, 10)
    })()

    const [form, setForm] = useState({
        cliente_id: clientePreselezionato ?? '',
        pratica_id: praticaPreselezionata ?? '',
        data_emissione: oggi,
        data_scadenza: tra30giorni,
        iva_percentuale: 22,
        cpa_percentuale: 4,
        applica_ritenuta: false,
        ritenuta_percentuale: 20,
        note_pubbliche: '',
        note_interne: '',
        metodo_pagamento: 'Bonifico bancario',
        iban_pagamento: '',
    })

    const [righe, setRighe] = useState([
        { descrizione: '', quantita: 1, prezzo_unitario: '' }
    ])
    const [mostraCalcolatore, setMostraCalcolatore] = useState(false)

    // Caricamento iniziale
    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: prof } = await supabase
                .from('profiles')
                .select('id, titolare_id, iban')
                .eq('id', user.id).single()

            const titolareId = prof?.titolare_id ?? user.id
            setProfiloAvv(prof)

            // Pre-popola IBAN dal profilo se presente
            if (prof?.iban) setForm(p => ({ ...p, iban_pagamento: prof.iban }))

            const { data: collabIds } = await supabase
                .from('profiles').select('id').eq('titolare_id', titolareId)
            const idsAvvocati = [titolareId, ...(collabIds ?? []).map(c => c.id)]

            const [{ data: cli }, { data: prat }] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, nome, cognome, ragione_sociale, tipo_soggetto, cf, partita_iva, email')
                    .eq('role', 'cliente')
                    .in('avvocato_id', idsAvvocati)
                    .order('cognome'),
                supabase
                    .from('pratiche')
                    .select('id, titolo, cliente_id, stato')
                    .in('avvocato_id', idsAvvocati)
                    .order('created_at', { ascending: false }),
            ])

            setClienti(cli ?? [])
            setPratiche(prat ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    // Quando cambia il cliente, resetta pratica se non appartiene a quel cliente
    useEffect(() => {
        if (!form.pratica_id) return
        const p = pratiche.find(p => p.id === form.pratica_id)
        if (p && p.cliente_id !== form.cliente_id) {
            setForm(prev => ({ ...prev, pratica_id: '' }))
        }
    }, [form.cliente_id, pratiche])

    const clienteSelezionato = useMemo(
        () => clienti.find(c => c.id === form.cliente_id) ?? null,
        [clienti, form.cliente_id]
    )

    const praticheCliente = useMemo(
        () => pratiche.filter(p => p.cliente_id === form.cliente_id && p.stato !== 'annullata'),
        [pratiche, form.cliente_id]
    )

    const praticaSelezionata = useMemo(
        () => pratiche.find(p => p.id === form.pratica_id) ?? null,
        [pratiche, form.pratica_id]
    )

    // Totali calcolati live
    const totali = useMemo(() => calcolaTotali({
        righe,
        ivaPct: Number(form.iva_percentuale) || 0,
        cpaPct: Number(form.cpa_percentuale) || 0,
        applicaRitenuta: form.applica_ritenuta,
        ritenutaPct: Number(form.ritenuta_percentuale) || 0,
    }), [righe, form.iva_percentuale, form.cpa_percentuale, form.applica_ritenuta, form.ritenuta_percentuale])

    // ─── Manipolazione righe ────────────────────────────────────
    function aggiornaRiga(i, campo, valore) {
        setRighe(prev => prev.map((r, idx) => idx === i ? { ...r, [campo]: valore } : r))
    }

    function aggiungiRiga() {
        setRighe(prev => [...prev, { descrizione: '', quantita: 1, prezzo_unitario: '' }])
    }

    function rimuoviRiga(i) {
        setRighe(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)
    }

    // Righe prodotte dal calcolatore parametri forensi (fasi + aumenti/riduzioni
    // + spese generali). 'sostituisci' rimpiazza tutto; 'aggiungi' appende dopo
    // aver scartato le righe vuote.
    function inserisciRigheParcella(nuove, modalita) {
        const mapped = nuove.map(r => ({
            descrizione: r.descrizione,
            quantita: r.quantita ?? 1,
            prezzo_unitario: r.prezzo_unitario,
        }))
        setRighe(prev => {
            if (modalita === 'sostituisci') return mapped
            const nonVuote = prev.filter(r => r.descrizione?.trim())
            return [...nonVuote, ...mapped]
        })
    }

    // ─── Validazione ────────────────────────────────────────────
    function valida() {
        if (!form.cliente_id) return 'Seleziona un cliente'
        if (!form.data_emissione) return 'Data emissione obbligatoria'
        const righeValide = righe.filter(r => r.descrizione?.trim() && Number(r.quantita) > 0)
        if (righeValide.length === 0) return 'Almeno una riga con descrizione e quantita > 0'
        for (const r of righeValide) {
            if (isNaN(Number(r.prezzo_unitario))) return 'Tutti i prezzi devono essere numerici'
        }
        return null
    }

    // ─── Submit ────────────────────────────────────────────────
    async function salva(genePdf) {
        const err = valida()
        if (err) { setErrore(err); return }
        setErrore('')
        setSalvando(genePdf ? 'pdf' : 'bozza')

        try {
            const righeValide = righe
                .filter(r => r.descrizione?.trim())
                .map((r, idx) => ({
                    descrizione: r.descrizione.trim(),
                    quantita: Number(r.quantita),
                    prezzo_unitario: Number(r.prezzo_unitario) || 0,
                    ordine: idx,
                }))

            // 1. Crea fattura
            const { data: creaRes, error: creaErr } = await supabase.functions.invoke('crea-fattura', {
                body: {
                    cliente_id: form.cliente_id,
                    pratica_id: form.pratica_id || null,
                    data_emissione: form.data_emissione,
                    data_scadenza: form.data_scadenza || null,
                    iva_percentuale: Number(form.iva_percentuale),
                    cpa_percentuale: Number(form.cpa_percentuale),
                    applica_ritenuta: form.applica_ritenuta,
                    ritenuta_percentuale: Number(form.ritenuta_percentuale),
                    note_pubbliche: form.note_pubbliche?.trim() || null,
                    note_interne: form.note_interne?.trim() || null,
                    metodo_pagamento: form.metodo_pagamento?.trim() || null,
                    iban_pagamento: form.iban_pagamento?.trim() || null,
                    righe: righeValide,
                }
            })

            if (creaErr) throw new Error(creaErr.message)
            if (!creaRes?.ok) throw new Error(creaRes?.error ?? 'Errore creazione fattura')

            const fatturaId = creaRes.fattura.id

            // 2. Se richiesto, genera PDF (= archivia automaticamente)
            if (genePdf) {
                const { data: pdfRes, error: pdfErr } = await supabase.functions.invoke('genera-fattura-pdf', {
                    body: { fattura_id: fatturaId }
                })
                if (pdfErr) throw new Error(`Fattura creata ma errore PDF: ${pdfErr.message}`)
                if (!pdfRes?.ok) throw new Error(`Fattura creata ma errore PDF: ${pdfRes?.error}`)
            }

            // 3. Naviga al dettaglio
            navigate(`/fatturazione/${fatturaId}`)
        } catch (err) {
            setErrore(err.message)
            setSalvando(null)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={24} className="animate-spin text-oro" />
        </div>
    )

    return (
        <div className="space-y-5">
            <BackButton to="/fatturazione" label="Fatturazione" />
            <PageHeader label="Fatturazione" title="Nuova fattura" />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
                {/* COLONNA FORM */}
                <div className="space-y-5">

                    {/* Step 1: Cliente + pratica */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">Destinatario</p>

                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Cliente *</label>
                            <select
                                value={form.cliente_id}
                                onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                            >
                                <option value="">Seleziona cliente...</option>
                                {clienti.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {nomeCliente(c)}
                                        {c.tipo_soggetto === 'persona_giuridica' && c.partita_iva ? ` (P.IVA ${c.partita_iva})` : ''}
                                    </option>
                                ))}
                            </select>
                            {clienti.length === 0 && (
                                <p className="font-body text-xs text-amber-400/70 mt-2 flex items-center gap-1.5">
                                    <Info size={11} /> Nessun cliente trovato. <Link to="/clienti/nuovo" className="underline">Crea il primo cliente</Link>.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                Pratica collegata <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span>
                            </label>
                            <select
                                value={form.pratica_id}
                                onChange={e => setForm(p => ({ ...p, pratica_id: e.target.value }))}
                                disabled={!form.cliente_id}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 disabled:opacity-40"
                            >
                                <option value="">Nessuna pratica</option>
                                {praticheCliente.map(p => (
                                    <option key={p.id} value={p.id}>{p.titolo}</option>
                                ))}
                            </select>
                            {form.cliente_id && praticheCliente.length === 0 && (
                                <p className="font-body text-xs text-nebbia/40 mt-2">Questo cliente non ha pratiche aperte.</p>
                            )}
                        </div>
                    </div>

                    {/* Step 2: Date */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">Date</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Data emissione *</label>
                                <input
                                    type="date"
                                    value={form.data_emissione}
                                    onChange={e => setForm(p => ({ ...p, data_emissione: e.target.value }))}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                />
                            </div>
                            <div>
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                    Scadenza pagamento <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span>
                                </label>
                                <input
                                    type="date"
                                    value={form.data_scadenza}
                                    onChange={e => setForm(p => ({ ...p, data_scadenza: e.target.value }))}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Righe prestazioni */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="section-label !m-0">Prestazioni</p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setMostraCalcolatore(true)}
                                    className="flex items-center gap-1.5 font-body text-xs text-petrolio bg-oro border border-oro px-3 py-1.5 hover:bg-oro/85 transition-colors"
                                    title="Calcola il compenso sui parametri forensi (DM 55/2014)"
                                >
                                    <Scale size={12} /> Calcola parcella
                                </button>
                                <button
                                    onClick={aggiungiRiga}
                                    className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                                >
                                    <Plus size={12} /> Aggiungi riga
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {righe.map((r, i) => {
                                const q = parseFloat(r.quantita) || 0
                                const p = parseFloat(r.prezzo_unitario) || 0
                                const tot = q * p
                                return (
                                    <div key={i} className="bg-petrolio/40 border border-white/5 p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Riga {i + 1}</span>
                                            {righe.length > 1 && (
                                                <button
                                                    onClick={() => rimuoviRiga(i)}
                                                    className="text-nebbia/30 hover:text-red-400 transition-colors p-1"
                                                    title="Rimuovi riga"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <input
                                            placeholder="Descrizione prestazione (es. Consulenza preliminare causa civile c/Bianchi)"
                                            value={r.descrizione}
                                            onChange={e => aggiornaRiga(i, 'descrizione', e.target.value)}
                                            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                        />

                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1">Quantita</label>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={r.quantita}
                                                    onChange={e => aggiornaRiga(i, 'quantita', e.target.value)}
                                                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1">Prezzo unit. (EUR)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={r.prezzo_unitario}
                                                    onChange={e => aggiornaRiga(i, 'prezzo_unitario', e.target.value)}
                                                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1">Totale riga</label>
                                                <div className="bg-slate border border-white/5 px-3 py-2 font-body text-sm text-oro">
                                                    EUR {fmtEUR(tot)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Step 4: Parametri fiscali */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">Parametri fiscali</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">IVA %</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={form.iva_percentuale}
                                    onChange={e => setForm(p => ({ ...p, iva_percentuale: e.target.value }))}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                />
                            </div>
                            <div>
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">CPA %</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={form.cpa_percentuale}
                                    onChange={e => setForm(p => ({ ...p, cpa_percentuale: e.target.value }))}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                />
                            </div>
                        </div>

                        <div className="border-t border-white/5 pt-4">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={form.applica_ritenuta}
                                    onChange={e => setForm(p => ({ ...p, applica_ritenuta: e.target.checked }))}
                                    className="w-4 h-4 accent-oro"
                                />
                                <div className="flex-1">
                                    <p className="font-body text-sm text-nebbia group-hover:text-oro transition-colors">Applica ritenuta d'acconto</p>
                                    <p className="font-body text-xs text-nebbia/40 mt-0.5">Spunta se il cliente e' sostituto d'imposta (azienda, professionista). Per privati lascia disattivato.</p>
                                </div>
                            </label>

                            {form.applica_ritenuta && (
                                <div className="mt-3 pl-7">
                                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Ritenuta %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={form.ritenuta_percentuale}
                                        onChange={e => setForm(p => ({ ...p, ritenuta_percentuale: e.target.value }))}
                                        className="w-full max-w-[200px] bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 5: Pagamento */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">Modalita di pagamento</p>

                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Metodo</label>
                            <select
                                value={form.metodo_pagamento}
                                onChange={e => setForm(p => ({ ...p, metodo_pagamento: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                            >
                                <option value="Bonifico bancario">Bonifico bancario</option>
                                <option value="Bonifico SEPA">Bonifico SEPA</option>
                                <option value="Contanti">Contanti</option>
                                <option value="Assegno">Assegno</option>
                                <option value="POS / Carta">POS / Carta</option>
                                <option value="">Altro / Non specificato</option>
                            </select>
                        </div>

                        <InputField
                            label="IBAN per pagamento"
                            placeholder="IT60X0542811101000000123456"
                            value={form.iban_pagamento}
                            onChange={e => setForm(p => ({ ...p, iban_pagamento: e.target.value }))}
                        />
                        {profiloAvv?.iban && form.iban_pagamento !== profiloAvv.iban && (
                            <button
                                type="button"
                                onClick={() => setForm(p => ({ ...p, iban_pagamento: profiloAvv.iban }))}
                                className="font-body text-xs text-oro/60 hover:text-oro"
                            >
                                Usa IBAN del profilo
                            </button>
                        )}
                    </div>

                    {/* Step 6: Note */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">Note</p>

                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                Note pubbliche <span className="text-nebbia/25 normal-case tracking-normal">— compariranno sul PDF</span>
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Es. Pagamento entro 30 giorni dalla data di emissione."
                                value={form.note_pubbliche}
                                onChange={e => setForm(p => ({ ...p, note_pubbliche: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                        </div>

                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                Note interne <span className="text-nebbia/25 normal-case tracking-normal">— visibili solo a te</span>
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Promemoria personale, non compare in fattura."
                                value={form.note_interne}
                                onChange={e => setForm(p => ({ ...p, note_interne: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                        </div>
                    </div>

                    {/* Errore */}
                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    {/* Azioni */}
                    <div className="flex flex-wrap gap-3 sticky bottom-4 bg-petrolio/95 backdrop-blur-sm border border-white/10 p-4 shadow-2xl">
                        <button
                            onClick={() => navigate('/fatturazione')}
                            disabled={salvando !== null}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40"
                        >
                            Annulla
                        </button>

                        <div className="flex-1" />

                        <button
                            onClick={() => salva(false)}
                            disabled={salvando !== null}
                            className="flex items-center gap-2 px-4 py-2.5 border border-white/15 text-nebbia/80 hover:border-oro/30 hover:text-oro transition-colors font-body text-sm disabled:opacity-40"
                        >
                            {salvando === 'bozza'
                                ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                                : <><Save size={14} /> Salva bozza</>
                            }
                        </button>

                        <button
                            onClick={() => salva(true)}
                            disabled={salvando !== null}
                            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
                        >
                            {salvando === 'pdf'
                                ? <><Loader2 size={14} className="animate-spin" /> Generando PDF...</>
                                : <><FileSignature size={14} /> Salva e genera PDF</>
                            }
                        </button>
                    </div>

                    {/* Info workflow */}
                    <div className="bg-petrolio/40 border border-white/5 p-4 flex items-start gap-3">
                        <Info size={14} className="text-salvia/70 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-body text-xs text-nebbia/60">
                                <span className="font-medium text-nebbia/80">Salva bozza</span> — la fattura viene creata con un numero progressivo definitivo, ma il PDF non viene generato. Puoi modificarla in seguito.
                            </p>
                            <p className="font-body text-xs text-nebbia/60">
                                <span className="font-medium text-nebbia/80">Salva e genera PDF</span> — la fattura viene archiviata anche nell'archivio dello studio e il PDF e' pronto per essere inviato al cliente.
                            </p>
                        </div>
                    </div>
                </div>

                {/* COLONNA PREVIEW */}
                <div>
                    <PreviewFattura
                        form={form}
                        righe={righe}
                        totali={totali}
                        cliente={clienteSelezionato}
                        pratica={praticaSelezionata}
                    />
                </div>
            </div>

            {/* Calcolatore parcella (parametri forensi DM 55/2014) */}
            {mostraCalcolatore && (
                <CalcolaParcellaModal
                    onClose={() => setMostraCalcolatore(false)}
                    onInserisci={inserisciRigheParcella}
                />
            )}
        </div>
    )
}