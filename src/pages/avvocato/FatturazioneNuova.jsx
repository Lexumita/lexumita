// src/pages/avvocato/FatturazioneNuova.jsx
//
// Wizard creazione fattura:
// - Step unico, layout 2 colonne (form a sinistra, preview live a destra)
// - Cliente obbligatorio, pratica opzionale (filtrata sul cliente selezionato)
// - Righe multiple, totali calcolati LIVE in browser (stessa formula del DB)
// - 2 bottoni in fondo: "Salva senza PDF" e "Salva e genera PDF"
//
// 04-10-2026:
// - Nota di credito: /fatturazione/nuova?storno=<id fattura> → righe e parametri
//   fiscali copiati dalla fattura, cliente fisso, niente scadenza.
// - Regime e cassa li decide il profilo di chi emette (il titolare dello studio):
//   forfettario = niente IVA (natura N2.2) e niente ritenuta; IVA 0 in ordinario
//   chiede la natura; la riga della cassa ha il nome giusto.
// - Righe «spesa esente art. 15» (natura N1): fuori da cassa, IVA e ritenuta.
// - Imposta di bollo da 2 euro, proposta da sola sopra 77,47 euro senza IVA.
// - «Calcola parcella» (DM 55/2014) solo per gli avvocati.

import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, BackButton, InputField } from '@/components/shared'
import {
    Plus, Trash2, AlertCircle, Loader2, Save, FileSignature, Info, Scale, Undo2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CalcolaParcellaModal from '@/components/avvocato/CalcolaParcellaModal'
import { formatImporto } from '@/lib/prezzi'
import {
    NATURE_FATTURA, NATURA_SPESE_ESENTI, cassaPredefinita, etichettaCassa, etichettaNatura,
    calcolaTotali, bolloDovuto, messaggioErroreFunzione,
} from '@/lib/fatturazione'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function nomeCliente(c) {
    if (!c) return ''
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PREVIEW (colonna destra, sticky)
// ─────────────────────────────────────────────────────────────
function PreviewFattura({ form, righe, totali, cliente, pratica, fiscale, origine }) {
    const oggi = new Date().toLocaleDateString('it-IT')
    const nc = !!origine

    return (
        <div className="bg-slate border border-white/5 p-5 space-y-4 sticky top-4">
            <p className="section-label">{nc ? 'Anteprima nota di credito' : 'Anteprima fattura'}</p>

            {nc && (
                <p className="font-body text-xs text-nebbia/50">
                    A storno della fattura <span className="text-nebbia/80">{origine.numero}</span> del {new Date(origine.data_emissione).toLocaleDateString('it-IT')}
                </p>
            )}

            <div className="space-y-1">
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Destinatario</p>
                {cliente ? (
                    <>
                        <p className="font-body text-sm font-medium text-nebbia">{nomeCliente(cliente)}</p>
                        {cliente.cf && <p className="font-body text-xs text-nebbia/40">C.F. {cliente.cf}</p>}
                        {cliente.partita_iva && <p className="font-body text-xs text-nebbia/40">P.IVA {cliente.partita_iva}</p>}
                        {(cliente.codice_destinatario_sdi || cliente.pec_fatturazione) && (
                            <p className="font-body text-xs text-nebbia/40">
                                {[cliente.codice_destinatario_sdi && `SDI ${cliente.codice_destinatario_sdi}`, cliente.pec_fatturazione && `PEC ${cliente.pec_fatturazione}`].filter(Boolean).join(' · ')}
                            </p>
                        )}
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
                {!nc && (
                    <div>
                        <p className="font-body text-nebbia/30 uppercase tracking-widest mb-1">Scadenza</p>
                        <p className="font-body text-nebbia/70">{form.data_scadenza ? new Date(form.data_scadenza).toLocaleDateString('it-IT') : '—'}</p>
                    </div>
                )}
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
                                    <span className="font-body text-nebbia/70 truncate flex-1">
                                        {r.descrizione}{r.natura_iva ? <span className="text-nebbia/35"> · esente</span> : null}
                                    </span>
                                    <span className="font-body text-nebbia/40 whitespace-nowrap">{q} x {formatImporto(p)}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="border-t border-white/5 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs font-body text-nebbia/60">
                    <span>Imponibile</span>
                    <span>{formatImporto(totali.imponibile)}</span>
                </div>
                {totali.cpa > 0 && (
                    <div className="flex justify-between gap-2 text-xs font-body text-nebbia/60">
                        <span>{fiscale.etichettaCassa ?? 'Cassa'} {form.cpa_percentuale}%</span>
                        <span>{formatImporto(totali.cpa)}</span>
                    </div>
                )}
                {fiscale.forfettario || Number(form.iva_percentuale) === 0 ? (
                    <div className="flex justify-between gap-2 text-xs font-body text-nebbia/60">
                        <span>IVA 0%{fiscale.natura ? ` · ${fiscale.natura} ${etichettaNatura(fiscale.natura)}` : ''}</span>
                        <span>{formatImporto(0)}</span>
                    </div>
                ) : (
                    <div className="flex justify-between text-xs font-body text-nebbia/60">
                        <span>IVA {form.iva_percentuale}%</span>
                        <span>{formatImporto(totali.iva)}</span>
                    </div>
                )}
                {totali.esenti > 0 && (
                    <div className="flex justify-between gap-2 text-xs font-body text-nebbia/60">
                        <span>Spese esenti art. 15</span>
                        <span>{formatImporto(totali.esenti)}</span>
                    </div>
                )}
                {totali.bollo > 0 && (
                    <div className="flex justify-between text-xs font-body text-nebbia/60">
                        <span>Imposta di bollo</span>
                        <span>{formatImporto(totali.bollo)}</span>
                    </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="font-body text-sm font-medium text-nebbia">{nc ? 'Totale nota di credito' : 'Totale documento'}</span>
                    <span className="font-body text-base font-semibold text-oro">{formatImporto(totali.lordo)}</span>
                </div>
                {totali.ritenuta > 0 && (
                    <>
                        <div className="flex justify-between text-xs font-body text-red-400/80 pt-1">
                            <span>Ritenuta {form.ritenuta_percentuale}%</span>
                            <span>- {formatImporto(totali.ritenuta)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10">
                            <span className="font-body text-sm font-medium text-nebbia">Netto a pagare</span>
                            <span className="font-body text-base font-semibold text-salvia">{formatImporto(totali.netto)}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// PAGINA NUOVA FATTURA / NOTA DI CREDITO
// ─────────────────────────────────────────────────────────────
export default function AvvocatoFatturazioneNuova() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const clientePreselezionato = searchParams.get('cliente_id')
    const praticaPreselezionata = searchParams.get('pratica_id')
    const stornoId = searchParams.get('storno')

    const [clienti, setClienti] = useState([])
    const [pratiche, setPratiche] = useState([]) // tutte le pratiche dello studio
    const [profiloAvv, setProfiloAvv] = useState(null)
    const [emittente, setEmittente] = useState(null) // titolare dello studio: regime, cassa, dati fiscali
    const [origine, setOrigine] = useState(null)     // fattura da stornare (nota di credito)
    const [loading, setLoading] = useState(true)
    const [erroreCarica, setErroreCarica] = useState('')

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
        natura_iva: '',
        riferimento_normativo: '',
        cpa_percentuale: 4,
        applica_ritenuta: false,
        ritenuta_percentuale: 20,
        bollo: false,
        bollo_a_carico_cliente: true,
        note_pubbliche: '',
        note_interne: '',
        metodo_pagamento: 'Bonifico bancario',
        iban_pagamento: '',
    })

    const [righe, setRighe] = useState([
        { descrizione: '', quantita: 1, prezzo_unitario: '', natura_iva: null }
    ])
    const [mostraCalcolatore, setMostraCalcolatore] = useState(false)
    // Il bollo lo propone la pagina finché l'utente non lo tocca a mano
    const bolloToccato = useRef(false)

    // Caricamento iniziale
    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: prof } = await supabase
                .from('profiles')
                .select('id, titolare_id, iban, role')
                .eq('id', user.id).single()

            const titolareId = prof?.titolare_id ?? user.id
            setProfiloAvv(prof)

            // Chi emette la fattura: il titolare (regime, cassa, dati fiscali)
            const { data: emit } = await supabase
                .from('profiles')
                .select('id, role, regime_fiscale, cassa_previdenza, partita_iva, cf, indirizzo, cap, comune, iban')
                .eq('id', titolareId).maybeSingle()
            setEmittente(emit ?? prof)

            // Pre-popola IBAN: quello di chi emette, altrimenti il proprio
            const ibanProfilo = emit?.iban ?? prof?.iban
            if (ibanProfilo) setForm(p => ({ ...p, iban_pagamento: ibanProfilo }))
            if ((emit?.cassa_previdenza ?? cassaPredefinita(emit?.role ?? prof?.role)) === 'nessuna') {
                setForm(p => ({ ...p, cpa_percentuale: 0 }))
            }

            const { data: collabIds } = await supabase
                .from('profiles').select('id').eq('titolare_id', titolareId)
            const idsAvvocati = [titolareId, ...(collabIds ?? []).map(c => c.id)]

            const [{ data: cli }, { data: prat }] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, nome, cognome, ragione_sociale, tipo_soggetto, cf, partita_iva, email, codice_destinatario_sdi, pec_fatturazione')
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

            // Nota di credito: copia la fattura da stornare
            if (stornoId) {
                const [{ data: orig }, { data: righeOrig }] = await Promise.all([
                    supabase.from('fatture').select('*').eq('id', stornoId).maybeSingle(),
                    supabase.from('righe_fattura').select('descrizione, quantita, prezzo_unitario, natura_iva, ordine').eq('fattura_id', stornoId).order('ordine'),
                ])
                if (!orig || orig.tipo_documento === 'TD04') {
                    setErroreCarica('Fattura da stornare non trovata.')
                } else if (orig.stato === 'annullata') {
                    setErroreCarica('Questa fattura è già stornata per intero.')
                } else {
                    setOrigine(orig)
                    setForm(p => ({
                        ...p,
                        cliente_id: orig.cliente_id,
                        pratica_id: orig.pratica_id ?? '',
                        data_scadenza: '',
                        iva_percentuale: Number(orig.iva_percentuale ?? 22),
                        natura_iva: orig.natura_iva ?? '',
                        riferimento_normativo: orig.riferimento_normativo ?? '',
                        cpa_percentuale: Number(orig.cpa_percentuale ?? 0),
                        applica_ritenuta: !!orig.applica_ritenuta,
                        ritenuta_percentuale: Number(orig.ritenuta_percentuale ?? 20),
                        bollo: Number(orig.bollo_importo ?? 0) > 0,
                        bollo_a_carico_cliente: orig.bollo_a_carico_cliente ?? true,
                        note_pubbliche: `A storno della fattura n. ${orig.numero} del ${new Date(orig.data_emissione).toLocaleDateString('it-IT')}.`,
                        metodo_pagamento: '',
                        iban_pagamento: '',
                    }))
                    bolloToccato.current = true
                    setRighe((righeOrig ?? []).map(r => ({
                        descrizione: r.descrizione,
                        quantita: r.quantita,
                        prezzo_unitario: r.prezzo_unitario,
                        natura_iva: r.natura_iva ?? null,
                    })))
                }
            }
            setLoading(false)
        }
        carica()
    }, [stornoId])

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

    // Regime e cassa di chi emette (per la nota di credito: quelli dell'originale)
    const fiscale = useMemo(() => {
        const ruolo = emittente?.role ?? profiloAvv?.role
        const cassa = origine?.cassa_previdenza ?? emittente?.cassa_previdenza ?? cassaPredefinita(ruolo)
        const regime = origine?.regime_fiscale ?? emittente?.regime_fiscale ?? 'RF01'
        const forfettario = regime === 'RF19'
        return {
            regime,
            forfettario,
            cassa,
            etichettaCassa: etichettaCassa(cassa, ruolo),
            natura: forfettario ? 'N2.2' : (Number(form.iva_percentuale) === 0 ? form.natura_iva || null : null),
        }
    }, [emittente, profiloAvv, origine, form.iva_percentuale, form.natura_iva])

    const datiEmittenteMancanti = useMemo(() => {
        if (!emittente) return []
        const m = []
        if (!emittente.partita_iva) m.push('partita IVA')
        if (!emittente.cf) m.push('codice fiscale')
        if (!emittente.indirizzo || !emittente.cap || !emittente.comune) m.push('indirizzo')
        return m
    }, [emittente])
    const sonoTitolare = !profiloAvv?.titolare_id

    // Totali calcolati live (stessa formula del DB)
    const totali = useMemo(() => calcolaTotali({
        righe,
        ivaPct: fiscale.forfettario ? 0 : Number(form.iva_percentuale) || 0,
        cpaPct: Number(form.cpa_percentuale) || 0,
        applicaRitenuta: !fiscale.forfettario && form.applica_ritenuta,
        ritenutaPct: Number(form.ritenuta_percentuale) || 0,
        bollo: form.bollo,
        bolloACaricoCliente: form.bollo_a_carico_cliente,
    }), [righe, form.iva_percentuale, form.cpa_percentuale, form.applica_ritenuta, form.ritenuta_percentuale,
        form.bollo, form.bollo_a_carico_cliente, fiscale.forfettario])

    // Bollo proposto da solo sopra 77,47 euro senza IVA (finché non lo si tocca)
    const serveBollo = bolloDovuto(totali, fiscale.forfettario ? 0 : form.iva_percentuale)
    useEffect(() => {
        if (bolloToccato.current) return
        setForm(p => (p.bollo === serveBollo ? p : { ...p, bollo: serveBollo }))
    }, [serveBollo])

    // ─── Manipolazione righe ────────────────────────────────────
    function aggiornaRiga(i, campo, valore) {
        setRighe(prev => prev.map((r, idx) => idx === i ? { ...r, [campo]: valore } : r))
    }

    function aggiungiRiga() {
        setRighe(prev => [...prev, { descrizione: '', quantita: 1, prezzo_unitario: '', natura_iva: null }])
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
            natura_iva: null,
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
        if (!origine && !fiscale.forfettario && Number(form.iva_percentuale) === 0 && !form.natura_iva) {
            return "Con IVA 0% indica la natura dell'operazione"
        }
        if (origine) {
            const daStornare = Number(origine.totale_netto ?? origine.totale_lordo ?? 0)
            if (totali.netto > daStornare + 0.01) {
                return `La nota di credito non può superare la fattura (${formatImporto(daStornare)})`
            }
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
                    natura_iva: r.natura_iva || null,
                }))

            // 1. Crea fattura (i parametri fiscali di una nota di credito li copia il server)
            const { data: creaRes, error: creaErr } = await supabase.functions.invoke('crea-fattura', {
                body: {
                    tipo_documento: origine ? 'TD04' : 'TD01',
                    fattura_origine_id: origine?.id ?? null,
                    cliente_id: form.cliente_id,
                    pratica_id: form.pratica_id || null,
                    data_emissione: form.data_emissione,
                    data_scadenza: origine ? null : (form.data_scadenza || null),
                    iva_percentuale: Number(form.iva_percentuale),
                    natura_iva: form.natura_iva || null,
                    riferimento_normativo: form.riferimento_normativo?.trim() || null,
                    cpa_percentuale: Number(form.cpa_percentuale),
                    applica_ritenuta: form.applica_ritenuta,
                    ritenuta_percentuale: Number(form.ritenuta_percentuale),
                    bollo: form.bollo,
                    bollo_a_carico_cliente: form.bollo_a_carico_cliente,
                    note_pubbliche: form.note_pubbliche?.trim() || null,
                    note_interne: form.note_interne?.trim() || null,
                    metodo_pagamento: form.metodo_pagamento?.trim() || null,
                    iban_pagamento: form.iban_pagamento?.trim() || null,
                    righe: righeValide,
                }
            })

            if (creaErr || !creaRes?.ok) {
                throw new Error(await messaggioErroreFunzione(creaErr, creaRes, 'Errore creazione fattura'))
            }

            const fatturaId = creaRes.fattura.id

            // 2. Se richiesto, genera PDF (= archivia automaticamente)
            if (genePdf) {
                const { data: pdfRes, error: pdfErr } = await supabase.functions.invoke('genera-fattura-pdf', {
                    body: { fattura_id: fatturaId }
                })
                if (pdfErr || !pdfRes?.ok) {
                    throw new Error(`Documento creato ma errore PDF: ${await messaggioErroreFunzione(pdfErr, pdfRes)}`)
                }
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

    if (erroreCarica) return (
        <div className="space-y-5">
            <BackButton to="/fatturazione" label="Fatturazione" />
            <div className="flex items-center gap-2 text-red-400 text-sm font-body p-4 bg-red-900/10 border border-red-500/20">
                <AlertCircle size={16} /> {erroreCarica}
            </div>
        </div>
    )

    const nc = !!origine
    const isAvvocato = (profiloAvv?.role ?? emittente?.role) === 'avvocato'

    return (
        <div className="space-y-5">
            <BackButton to={nc ? `/fatturazione/${origine.id}` : '/fatturazione'} label={nc ? `Fattura ${origine.numero}` : 'Fatturazione'} />
            <PageHeader label="Fatturazione" title={nc ? 'Nuova nota di credito' : 'Nuova fattura'} />

            {/* Dati di chi emette incompleti */}
            {datiEmittenteMancanti.length > 0 && (
                <div className="bg-amber-900/10 border border-amber-500/30 p-4 flex items-start gap-3">
                    <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="font-body text-xs text-amber-400/80 leading-relaxed">
                        In fattura mancherebbero: <span className="font-medium">{datiEmittenteMancanti.join(', ')}</span>.{' '}
                        {sonoTitolare
                            ? <>Completa i <Link to="/profilo" className="underline">dati di fatturazione nel profilo</Link>.</>
                            : <>Chiedi al titolare dello studio di completare i dati di fatturazione nel suo profilo.</>}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
                {/* COLONNA FORM */}
                <div className="space-y-5">

                    {/* Step 1: Cliente + pratica */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">Destinatario</p>

                        {nc ? (
                            <div className="space-y-1">
                                <p className="font-body text-sm text-nebbia">{nomeCliente(clienteSelezionato) || '—'}</p>
                                <p className="font-body text-xs text-nebbia/40">
                                    La nota di credito va allo stesso cliente della fattura {origine.numero}.
                                </p>
                            </div>
                        ) : (
                            <>
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
                                                {c.partita_iva ? ` (P.IVA ${c.partita_iva})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {clienti.length === 0 && (
                                        <p className="font-body text-xs text-amber-400/70 mt-2 flex items-center gap-1.5">
                                            <Info size={11} /> Nessun cliente trovato. <Link to="/clienti/nuovo" className="underline">Crea il primo cliente</Link>.
                                        </p>
                                    )}
                                    {clienteSelezionato && clienteSelezionato.partita_iva && !clienteSelezionato.codice_destinatario_sdi && !clienteSelezionato.pec_fatturazione && (
                                        <p className="font-body text-xs text-amber-400/70 mt-2 flex items-center gap-1.5">
                                            <Info size={11} /> Il cliente ha la partita IVA ma non il codice destinatario SDI né la PEC di fatturazione: li aggiungi dalla sua scheda.
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
                            </>
                        )}
                    </div>

                    {/* Step 2: Date */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <p className="section-label">Date</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Data emissione *</label>
                                <input
                                    type="date"
                                    value={form.data_emissione}
                                    onChange={e => setForm(p => ({ ...p, data_emissione: e.target.value }))}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                />
                            </div>
                            {!nc && (
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
                            )}
                        </div>
                    </div>

                    {/* Step 3: Righe prestazioni */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="section-label !m-0">{nc ? 'Righe da stornare' : 'Prestazioni'}</p>
                            <div className="flex items-center gap-2">
                                {isAvvocato && !nc && (
                                    <button
                                        onClick={() => setMostraCalcolatore(true)}
                                        className="flex items-center gap-1.5 font-body text-xs text-petrolio bg-oro border border-oro px-3 py-1.5 hover:bg-oro/85 transition-colors"
                                        title="Calcola il compenso sui parametri forensi (DM 55/2014)"
                                    >
                                        <Scale size={12} /> Calcola parcella
                                    </button>
                                )}
                                <button
                                    onClick={aggiungiRiga}
                                    className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                                >
                                    <Plus size={12} /> Aggiungi riga
                                </button>
                            </div>
                        </div>

                        {nc && (
                            <p className="font-body text-xs text-nebbia/45 leading-relaxed">
                                Per uno storno totale lascia le righe come sono; per uno storno parziale correggi importi o quantità.
                            </p>
                        )}

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

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div>
                                                <label className="block font-body text-xs lg:text-[10px] text-nebbia/40 tracking-widest uppercase mb-1">Quantita</label>
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
                                                <label className="block font-body text-xs lg:text-[10px] text-nebbia/40 tracking-widest uppercase mb-1">Prezzo unit. (EUR)</label>
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
                                                <label className="block font-body text-xs lg:text-[10px] text-nebbia/40 tracking-widest uppercase mb-1">Totale riga</label>
                                                <div className="bg-slate border border-white/5 px-3 py-2 font-body text-sm text-oro">
                                                    {formatImporto(tot)}
                                                </div>
                                            </div>
                                        </div>

                                        <label className="flex items-start gap-2 cursor-pointer pt-1">
                                            <input
                                                type="checkbox"
                                                checked={!!r.natura_iva}
                                                disabled={nc}
                                                onChange={e => aggiornaRiga(i, 'natura_iva', e.target.checked ? NATURA_SPESE_ESENTI : null)}
                                                className="w-4 h-4 accent-oro mt-0.5"
                                            />
                                            <span className="font-body text-xs text-nebbia/50">
                                                Spesa anticipata per conto del cliente (esente art. 15: niente cassa, IVA e ritenuta)
                                            </span>
                                        </label>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Step 4: Parametri fiscali */}
                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="section-label !m-0">Parametri fiscali</p>
                            <span className="font-body text-xs text-nebbia/40">
                                Regime {fiscale.forfettario ? 'forfettario' : 'ordinario'}
                                {sonoTitolare && !nc && <> · <Link to="/profilo" className="text-oro/70 hover:text-oro">cambia nel profilo</Link></>}
                            </span>
                        </div>

                        {nc && (
                            <p className="font-body text-xs text-nebbia/45 leading-relaxed">
                                La nota di credito ripete IVA, cassa e ritenuta della fattura {origine.numero}.
                            </p>
                        )}

                        {fiscale.forfettario ? (
                            <div className="bg-petrolio/40 border border-white/5 p-3 flex items-start gap-2">
                                <Info size={13} className="text-salvia/70 shrink-0 mt-0.5" />
                                <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                                    Regime forfettario: niente IVA (natura N2.2) e niente ritenuta d'acconto. In fattura compaiono le diciture di legge (art. 1, commi 54-89 e comma 67, L. 190/2014).
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">IVA %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={form.iva_percentuale}
                                        disabled={nc}
                                        onChange={e => setForm(p => ({ ...p, iva_percentuale: e.target.value }))}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 disabled:opacity-50"
                                    />
                                </div>
                                {fiscale.etichettaCassa && (
                                    <div>
                                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{fiscale.etichettaCassa} %</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={form.cpa_percentuale}
                                            disabled={nc}
                                            onChange={e => setForm(p => ({ ...p, cpa_percentuale: e.target.value }))}
                                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 disabled:opacity-50"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {fiscale.forfettario && fiscale.etichettaCassa && (
                            <div className="max-w-[260px]">
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{fiscale.etichettaCassa} %</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={form.cpa_percentuale}
                                    disabled={nc}
                                    onChange={e => setForm(p => ({ ...p, cpa_percentuale: e.target.value }))}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 disabled:opacity-50"
                                />
                            </div>
                        )}

                        {!fiscale.forfettario && Number(form.iva_percentuale) === 0 && (
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Natura dell'operazione *</label>
                                    <select
                                        value={form.natura_iva}
                                        disabled={nc}
                                        onChange={e => setForm(p => ({ ...p, natura_iva: e.target.value }))}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 disabled:opacity-50"
                                    >
                                        <option value="">Seleziona…</option>
                                        {NATURE_FATTURA.map(n => <option key={n.codice} value={n.codice}>{n.etichetta}</option>)}
                                    </select>
                                </div>
                                <InputField
                                    label="Riferimento normativo (compare in fattura)"
                                    placeholder="Es. Operazione esente ai sensi dell'art. 10 DPR 633/72"
                                    value={form.riferimento_normativo}
                                    disabled={nc}
                                    onChange={e => setForm(p => ({ ...p, riferimento_normativo: e.target.value }))}
                                />
                            </div>
                        )}

                        {!fiscale.forfettario && (
                            <div className="border-t border-white/5 pt-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={form.applica_ritenuta}
                                        disabled={nc}
                                        onChange={e => setForm(p => ({ ...p, applica_ritenuta: e.target.checked }))}
                                        className="w-4 h-4 accent-oro"
                                    />
                                    <div className="flex-1">
                                        <p className="font-body text-sm text-nebbia group-hover:text-oro transition-colors">Applica ritenuta d'acconto</p>
                                        <p className="font-body text-xs text-nebbia/40 mt-0.5">Spunta se il cliente e' sostituto d'imposta (azienda, professionista). Per privati lascia disattivato. Il cliente paga il netto.</p>
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
                                            disabled={nc}
                                            onChange={e => setForm(p => ({ ...p, ritenuta_percentuale: e.target.value }))}
                                            className="w-full max-w-[200px] bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 disabled:opacity-50"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Imposta di bollo */}
                        <div className="border-t border-white/5 pt-4 space-y-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={form.bollo}
                                    onChange={e => { bolloToccato.current = true; setForm(p => ({ ...p, bollo: e.target.checked })) }}
                                    className="w-4 h-4 accent-oro"
                                />
                                <div className="flex-1">
                                    <p className="font-body text-sm text-nebbia group-hover:text-oro transition-colors">Imposta di bollo 2 €</p>
                                    <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                        Dovuta quando la parte senza IVA supera 77,47 €
                                        {serveBollo ? ': per questo documento serve.' : '.'}
                                    </p>
                                </div>
                            </label>
                            {form.bollo && (
                                <label className="flex items-center gap-3 cursor-pointer pl-7">
                                    <input
                                        type="checkbox"
                                        checked={form.bollo_a_carico_cliente}
                                        onChange={e => setForm(p => ({ ...p, bollo_a_carico_cliente: e.target.checked }))}
                                        className="w-4 h-4 accent-oro"
                                    />
                                    <span className="font-body text-xs text-nebbia/55">Addebita i 2 € al cliente</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Step 5: Pagamento (non per la nota di credito) */}
                    {!nc && (
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
                            {(emittente?.iban ?? profiloAvv?.iban) && form.iban_pagamento !== (emittente?.iban ?? profiloAvv?.iban) && (
                                <button
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, iban_pagamento: emittente?.iban ?? profiloAvv?.iban }))}
                                    className="font-body text-xs text-oro/60 hover:text-oro"
                                >
                                    Usa IBAN del profilo
                                </button>
                            )}
                        </div>
                    )}

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
                    <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 sticky bottom-4 bg-petrolio/95 backdrop-blur-sm border border-white/10 p-4 pb-safe shadow-2xl">
                        <button
                            onClick={() => navigate(nc ? `/fatturazione/${origine.id}` : '/fatturazione')}
                            disabled={salvando !== null}
                            className="w-full lg:w-auto text-center font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40"
                        >
                            Annulla
                        </button>

                        <div className="hidden lg:block flex-1" />

                        <button
                            onClick={() => salva(false)}
                            disabled={salvando !== null}
                            className="w-full lg:w-auto justify-center flex items-center gap-2 px-4 py-2.5 border border-white/15 text-nebbia/80 hover:border-oro/30 hover:text-oro transition-colors font-body text-sm disabled:opacity-40"
                        >
                            {salvando === 'bozza'
                                ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                                : <><Save size={14} /> Salva senza PDF</>
                            }
                        </button>

                        <button
                            onClick={() => salva(true)}
                            disabled={salvando !== null}
                            className="btn-primary text-sm w-full lg:w-auto justify-center flex items-center gap-2 disabled:opacity-40"
                        >
                            {salvando === 'pdf'
                                ? <><Loader2 size={14} className="animate-spin" /> Generando PDF...</>
                                : nc
                                    ? <><Undo2 size={14} /> Emetti nota di credito</>
                                    : <><FileSignature size={14} /> Salva e genera PDF</>
                            }
                        </button>
                    </div>

                    {/* Info workflow */}
                    <div className="bg-petrolio/40 border border-white/5 p-4 flex items-start gap-3">
                        <Info size={14} className="text-salvia/70 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-body text-xs text-nebbia/60">
                                <span className="font-medium text-nebbia/80">Salva senza PDF</span> — il documento riceve il numero progressivo definitivo ma non è ancora emesso: finché non generi il PDF puoi eliminarlo.
                            </p>
                            <p className="font-body text-xs text-nebbia/60">
                                <span className="font-medium text-nebbia/80">{nc ? 'Emetti nota di credito' : 'Salva e genera PDF'}</span> — il documento è emesso e archiviato nell'archivio dello studio. Da qui in poi si corregge solo con una nota di credito.
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
                        fiscale={fiscale}
                        origine={origine}
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
