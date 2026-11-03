// src/pages/strumenti/CreaFattura.jsx
//
// 03-11-2026: lo strumento gratuito per fare una fattura: logo, dati, righe, poi PDF e XML FatturaPA.
// Niente account, niente AI, niente server: tutto nel browser. I conti sono quelli del gestionale
// (lib/fatturazione.js), l'XML lo stesso costruttore (lib/strumenti/fatturaPA.js).
//
// In Italia la fattura valida è l'XML passato dallo SDI: il PDF è la copia di cortesia, e la pagina lo dice.
// Pro forma e avviso di parcella restano solo PDF.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Download, FileCode2, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react'
import { TestataPagina, Apertura, DomandeFrequenti, CAMPO, ETICHETTA } from '@/components/strumenti/Pagina'
import { usePopupIscrizione } from '@/components/strumenti/PopupIscrizione'
import { CASSE, NATURE_FATTURA, NATURA_SPESE_ESENTI, REGIMI, bolloDovuto, calcolaTotali, etichettaCassa, etichettaNatura } from '@/lib/fatturazione'
import { costruisciFatturaPA, RIF_FORFETTARIO } from '@/lib/strumenti/fatturaPA'
import { leggi, scrivi, prendiRigheDallaParcella } from '@/lib/strumenti/memoria'
import { scaricaBlob } from '@/lib/strumenti/scarica'
import { formatImporto } from '@/lib/prezzi'
import { FATTURA } from '@/lib/strumenti/testi'

const TIPI_DOCUMENTO = [
    { id: 'fattura', nome: 'Fattura', avvertenza: 'Copia di cortesia: la fattura elettronica è il file trasmesso al Sistema di Interscambio.' },
    { id: 'proforma', nome: 'Fattura pro forma', avvertenza: 'Documento privo di valore fiscale: la fattura sarà emessa al momento del pagamento.' },
    { id: 'parcella', nome: 'Avviso di parcella', avvertenza: 'Documento privo di valore fiscale: la fattura sarà emessa al momento del pagamento.' },
]

const METODI = ['Bonifico bancario', 'Contanti', 'Assegno', 'Carta / POS']
const ALIQUOTE = [22, 10, 5, 4, 0]

const EMITTENTE_VUOTO = {
    logo: null, tipo: 'persona_fisica', denominazione: '', nome: '', cognome: '', partita_iva: '', cf: '',
    indirizzo: '', numero_civico: '', cap: '', comune: '', provincia: '', email: '', telefono: '', iban: '',
    regime: 'RF01', cassa: 'nessuna',
}
const CLIENTE_VUOTO = {
    tipo: 'persona_fisica', ragione_sociale: '', nome: '', cognome: '', partita_iva: '', cf: '',
    indirizzo: '', numero_civico: '', cap: '', comune: '', provincia: '', paese: 'IT', codice_sdi: '', pec: '',
}
const RIGA_VUOTA = { descrizione: '', quantita: 1, prezzo_unitario: '', esente: false }

const dataIt = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('it-IT') : '')

// «12/2026» → «13/2026»; senza una fattura precedente, la prima dell'anno
function numeroSuccessivo(ultimo) {
    const anno = new Date().getFullYear()
    const m = String(ultimo ?? '').match(/^(\D*)(\d+)(.*)$/)
    if (!m) return `1/${anno}`
    return `${m[1]}${Number(m[2]) + 1}${m[3]}`
}

// Qualunque immagine diventa un PNG piccolo: entra nel PDF e sta nella memoria del browser.
function leggiLogo(file) {
    return new Promise((ok, ko) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            const scala = Math.min(1, 600 / img.width, 240 / img.height)
            const canvas = document.createElement('canvas')
            canvas.width = Math.max(1, Math.round(img.width * scala))
            canvas.height = Math.max(1, Math.round(img.height * scala))
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
            URL.revokeObjectURL(url)
            ok(canvas.toDataURL('image/png'))
        }
        img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('Questo file non sembra un\'immagine.')) }
        img.src = url
    })
}

function Campo({ etichetta, valore, onChange, segnaposto, tipo = 'text', classe = '', ...resto }) {
    return (
        <label className={`block ${classe}`}>
            <span className={ETICHETTA}>{etichetta}</span>
            <input type={tipo} value={valore} onChange={e => onChange(e.target.value)} placeholder={segnaposto} className={CAMPO} {...resto} />
        </label>
    )
}

function Scheda({ titolo, children }) {
    return (
        <div className="bg-slate border border-white/5 p-4 sm:p-6">
            <h2 className="font-display text-xl font-light text-nebbia mb-4">{titolo}</h2>
            {children}
        </div>
    )
}

function Scelta({ opzioni, valore, onChange }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {opzioni.map(o => (
                <button key={o.id} type="button" onClick={() => onChange(o.id)}
                    className={`font-body text-xs px-3 py-2 border transition-colors ${valore === o.id ? 'border-oro/50 bg-oro/10 text-oro' : 'border-white/10 text-nebbia/50 hover:text-nebbia'}`}>
                    {o.nome}
                </button>
            ))}
        </div>
    )
}

function Indirizzo({ dati, aggiorna, estero = false }) {
    return (
        <div className="grid grid-cols-6 gap-3">
            <Campo classe="col-span-4" etichetta="Indirizzo" valore={dati.indirizzo} onChange={v => aggiorna({ indirizzo: v })} segnaposto="Via Roma" />
            <Campo classe="col-span-2" etichetta="N. civico" valore={dati.numero_civico} onChange={v => aggiorna({ numero_civico: v })} segnaposto="1" />
            {!estero && <Campo classe="col-span-2" etichetta="CAP" valore={dati.cap} onChange={v => aggiorna({ cap: v })} segnaposto="20121" inputMode="numeric" maxLength={5} />}
            <Campo classe={estero ? 'col-span-6' : 'col-span-3'} etichetta="Comune" valore={dati.comune} onChange={v => aggiorna({ comune: v })} segnaposto="Milano" />
            {!estero && <Campo classe="col-span-1" etichetta="Prov." valore={dati.provincia} onChange={v => aggiorna({ provincia: v.toUpperCase() })} segnaposto="MI" maxLength={2} />}
        </div>
    )
}

export default function CreaFattura() {
    const [em, setEm] = useState(EMITTENTE_VUOTO)
    const [cl, setCl] = useState(CLIENTE_VUOTO)
    const [doc, setDoc] = useState({
        tipo: 'fattura', numero: '', data: new Date().toISOString().slice(0, 10), scadenza: '',
        metodo: 'Bonifico bancario', iva: 22, natura: '', ritenuta: false, ritenuta_pct: 20,
        bollo: null, bollo_cliente: true, note: '',
    })
    const [righe, setRighe] = useState([RIGA_VUOTA])
    const [ricorda, setRicorda] = useState(true)
    const [creando, setCreando] = useState(null)
    const [mancano, setMancano] = useState([])
    const [xmlFatto, setXmlFatto] = useState(false)
    const [errore, setErrore] = useState('')
    const { dopoDocumento, popup } = usePopupIscrizione('fattura')

    const aggEm = (p) => setEm(x => ({ ...x, ...p }))
    const aggCl = (p) => setCl(x => ({ ...x, ...p }))
    const aggDoc = (p) => setDoc(x => ({ ...x, ...p }))
    const aggRiga = (i, p) => setRighe(rr => rr.map((r, j) => (j === i ? { ...r, ...p } : r)))

    // Quello che il browser ricorda, e le righe in arrivo dal calcolo della parcella
    useEffect(() => {
        const salvato = leggi('emittente')
        if (salvato) setEm(x => ({ ...x, ...salvato }))
        aggDoc({ numero: numeroSuccessivo(leggi('ultimoNumero')) })
        const daParcella = prendiRigheDallaParcella()
        if (daParcella?.length) {
            setRighe(daParcella.map(r => ({ descrizione: r.descrizione, quantita: r.quantita, prezzo_unitario: String(r.prezzo_unitario), esente: false })))
            setEm(x => ({ ...x, cassa: x.cassa === 'nessuna' ? 'cassa_forense' : x.cassa }))
        }
    }, [])

    const forfettario = em.regime === 'RF19'
    const ivaPct = forfettario ? 0 : Number(doc.iva) || 0
    const natura = forfettario ? 'N2.2' : (ivaPct === 0 ? doc.natura || null : null)
    const cpaPct = em.cassa === 'nessuna' ? 0 : 4
    const ritenutaAttiva = !forfettario && doc.ritenuta
    const estero = cl.paese !== 'IT'

    // Le righe compilate, con il totale e la natura delle spese esenti
    const righeValide = useMemo(() => righe
        .filter(r => r.descrizione.trim() && (parseFloat(r.prezzo_unitario) || 0) !== 0 && (parseFloat(r.quantita) || 0) > 0)
        .map(r => ({
            descrizione: r.descrizione.trim(),
            quantita: parseFloat(r.quantita),
            prezzo_unitario: parseFloat(r.prezzo_unitario),
            totale: Math.round(parseFloat(r.quantita) * parseFloat(r.prezzo_unitario) * 100) / 100,
            natura_iva: r.esente ? NATURA_SPESE_ESENTI : null,
        })), [righe])

    // Il bollo si propone da solo finché non lo si tocca a mano
    const parametri = { righe: righeValide, ivaPct, cpaPct, applicaRitenuta: ritenutaAttiva, ritenutaPct: Number(doc.ritenuta_pct) || 0 }
    const serveBollo = bolloDovuto(calcolaTotali(parametri), ivaPct)
    const bollo = doc.bollo ?? serveBollo
    const totali = calcolaTotali({ ...parametri, bollo, bolloACaricoCliente: doc.bollo_cliente })

    const etichettaDellaCassa = etichettaCassa(em.cassa)
    const nomeEmittente = em.tipo === 'persona_giuridica' ? em.denominazione.trim() : `${em.nome} ${em.cognome}`.trim()
    const nomeCliente = cl.tipo === 'persona_giuridica' ? cl.ragione_sociale.trim() : `${cl.nome} ${cl.cognome}`.trim()
    const tipoDoc = TIPI_DOCUMENTO.find(t => t.id === doc.tipo)
    const eFattura = doc.tipo === 'fattura'

    const indirizzoDi = (s) => {
        const via = [s.indirizzo, s.numero_civico].filter(Boolean).join(' ')
        const citta = [s.cap, s.comune].filter(Boolean).join(' ') + (s.provincia ? ` (${s.provincia})` : '')
        return [via, citta.trim()].filter(Boolean).join(', ')
    }

    // Le stesse righe nell'anteprima e nel PDF
    const righeTotali = [
        ['Imponibile', formatImporto(totali.imponibile)],
        ...(totali.cpa > 0 ? [[`${etichettaDellaCassa} ${cpaPct}%`, formatImporto(totali.cpa)]] : []),
        ivaPct > 0
            ? [`IVA ${ivaPct}%`, formatImporto(totali.iva)]
            : [`IVA 0%${natura ? ` · ${natura} ${etichettaNatura(natura)}` : ''}`, formatImporto(0)],
        ...(totali.esenti > 0 ? [['Spese esenti art. 15', formatImporto(totali.esenti)]] : []),
        ...(totali.bollo > 0 ? [['Imposta di bollo', formatImporto(totali.bollo)]] : []),
    ]
    const nettoPdf = totali.ritenuta > 0
        ? { etichetta: `Ritenuta d'acconto ${doc.ritenuta_pct}%`, ritenuta: `- ${formatImporto(totali.ritenuta)}`, valore: formatImporto(totali.netto) }
        : null
    const diciture = [
        ...(forfettario ? [`${RIF_FORFETTARIO}. Compenso non soggetto a ritenuta d'acconto ai sensi dell'art. 1, comma 67, L. 190/2014.`] : []),
        ...(!forfettario && ivaPct === 0 && natura ? [`IVA non applicata: ${etichettaNatura(natura)}.`] : []),
        ...(bollo ? ["Imposta di bollo da 2,00 euro assolta in modo virtuale ai sensi dell'art. 6 del D.M. 17 giugno 2014."] : []),
    ]

    function ricordaDati() {
        if (ricorda) scrivi('emittente', em)
        else scrivi('emittente', null)
        if (eFattura && doc.numero.trim()) scrivi('ultimoNumero', doc.numero.trim())
    }

    function controllaBase() {
        const m = []
        if (!nomeEmittente) m.push('il tuo nome o la denominazione')
        if (!nomeCliente) m.push('il nome del cliente')
        if (!righeValide.length) m.push('almeno una riga con descrizione e importo')
        return m
    }

    async function scaricaPdf() {
        const m = controllaBase()
        setMancano(m)
        setErrore('')
        if (m.length || creando) return
        setCreando('pdf')
        try {
            const { scaricaPdfDocumento } = await import('@/lib/strumenti/pdfStrumenti')
            await scaricaPdfDocumento({
                titolo: tipoDoc.nome,
                numero: doc.numero.trim(),
                data: dataIt(doc.data),
                scadenza: dataIt(doc.scadenza),
                emittente: {
                    logo: em.logo,
                    nome: nomeEmittente,
                    righe: [
                        indirizzoDi(em),
                        [em.cf && `C.F. ${em.cf}`, em.partita_iva && `P.IVA ${em.partita_iva}`].filter(Boolean).join(' · '),
                        [em.email, em.telefono].filter(Boolean).join(' · '),
                    ].filter(Boolean),
                },
                cliente: {
                    nome: nomeCliente,
                    righe: [
                        indirizzoDi(cl) + (estero ? ` (${cl.paese})` : ''),
                        [cl.cf && `C.F. ${cl.cf}`, cl.partita_iva && `P.IVA ${cl.partita_iva}`].filter(Boolean).join(' · '),
                        [cl.codice_sdi && `Codice SDI: ${cl.codice_sdi}`, cl.pec && `PEC: ${cl.pec}`].filter(Boolean).join(' · '),
                    ].filter(Boolean),
                },
                righe: righeValide,
                totali: righeTotali,
                totale: formatImporto(totali.lordo),
                netto: nettoPdf,
                diciture,
                note: doc.note.trim(),
                pagamento: [doc.metodo, em.iban && `IBAN: ${em.iban.replace(/\s+/g, '').toUpperCase()}`].filter(Boolean),
                avvertenza: tipoDoc.avvertenza,
            })
            ricordaDati()
            dopoDocumento()
        } catch (e) {
            setErrore(e.message || 'Non sono riuscito a creare il PDF. Riprova tra qualche istante.')
        } finally {
            setCreando(null)
        }
    }

    function scaricaXml() {
        setErrore('')
        const esito = costruisciFatturaPA({
            fattura: {
                numero: doc.numero,
                data_emissione: doc.data,
                data_scadenza: doc.scadenza || null,
                iva_percentuale: ivaPct,
                natura_iva: natura,
                regime_fiscale: em.regime,
                cassa_previdenza: em.cassa,
                cpa_percentuale: cpaPct,
                cpa_importo: totali.cpa,
                imponibile: totali.imponibile,
                iva_importo: totali.iva,
                bollo_importo: bollo ? 2 : 0,
                bollo_a_carico_cliente: doc.bollo_cliente,
                applica_ritenuta: ritenutaAttiva,
                ritenuta_percentuale: Number(doc.ritenuta_pct) || 0,
                ritenuta_importo: totali.ritenuta,
                totale_lordo: totali.lordo,
                totale_netto: totali.netto,
                note_pubbliche: doc.note,
                iban_pagamento: em.iban,
                metodo_pagamento: doc.metodo,
            },
            righe: righeValide,
            emittente: {
                tipo_soggetto: em.tipo,
                ragione_sociale: em.tipo === 'persona_giuridica' ? em.denominazione : '',
                nome: em.nome, cognome: em.cognome, partita_iva: em.partita_iva, cf: em.cf,
                indirizzo: em.indirizzo, numero_civico: em.numero_civico, cap: em.cap, comune: em.comune, provincia: em.provincia,
            },
            cliente: {
                tipo_soggetto: cl.tipo,
                ragione_sociale: cl.ragione_sociale, nome: cl.nome, cognome: cl.cognome, partita_iva: cl.partita_iva, cf: cl.cf,
                indirizzo: cl.indirizzo, numero_civico: cl.numero_civico, cap: cl.cap, comune: cl.comune, provincia: cl.provincia,
                paese: cl.paese, codice_destinatario_sdi: cl.codice_sdi, pec_fatturazione: cl.pec,
            },
        })
        if (!esito.ok) {
            setMancano(esito.mancano)
            return
        }
        setMancano([])
        scaricaBlob(new Blob([esito.xml], { type: 'application/xml' }), esito.nomeFile)
        setXmlFatto(true)
        ricordaDati()
        dopoDocumento()
    }

    async function caricaLogo(e) {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        try {
            aggEm({ logo: await leggiLogo(file) })
        } catch (err) {
            setErrore(err.message)
        }
    }

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <TestataPagina percorso={FATTURA.percorso} titolo={FATTURA.metaTitolo} descrizione={FATTURA.metaDescrizione} />
            <Apertura
                etichetta="Strumenti gratis"
                titolo="Crea la tua"
                evidenza="fattura gratis"
                testo="Carica il logo, compila i dati e scarica il PDF per il cliente e il file XML da inviare all'Agenzia delle Entrate. C.P.A., ritenuta, bollo e forfettario li calcola lo strumento."
            />

            <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">
                <div className="space-y-4 min-w-0">
                    <Scheda titolo="Il documento">
                        <div className="space-y-4">
                            <Scelta opzioni={TIPI_DOCUMENTO} valore={doc.tipo} onChange={tipo => aggDoc({ tipo })} />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Campo etichetta="Numero" valore={doc.numero} onChange={numero => aggDoc({ numero })} segnaposto="1/2026" />
                                <Campo etichetta="Data" tipo="date" valore={doc.data} onChange={data => aggDoc({ data })} />
                                <Campo etichetta="Scadenza (facoltativa)" tipo="date" valore={doc.scadenza} onChange={scadenza => aggDoc({ scadenza })} />
                            </div>
                        </div>
                    </Scheda>

                    <Scheda titolo="I tuoi dati">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center justify-center w-36 h-16 shrink-0 border border-dashed border-white/15 hover:border-oro/40 cursor-pointer transition-colors bg-petrolio">
                                    {em.logo
                                        ? <img src={em.logo} alt="Il tuo logo" className="max-w-full max-h-full p-1" />
                                        : <span className="flex items-center gap-2 font-body text-xs text-nebbia/40"><ImagePlus size={15} /> Il tuo logo</span>}
                                    <input type="file" accept="image/*" onChange={caricaLogo} className="sr-only" />
                                </label>
                                {em.logo
                                    ? <button type="button" onClick={() => aggEm({ logo: null })} className="font-body text-xs text-nebbia/40 hover:text-nebbia transition-colors">Togli il logo</button>
                                    : <p className="font-body text-xs text-nebbia/30 leading-relaxed">PNG, JPG o SVG. Facoltativo: compare in alto nel PDF.</p>}
                            </div>
                            <Scelta valore={em.tipo} onChange={tipo => aggEm({ tipo })} opzioni={[
                                { id: 'persona_fisica', nome: 'Professionista o persona fisica' },
                                { id: 'persona_giuridica', nome: 'Società, studio associato, ente' },
                            ]} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {em.tipo === 'persona_giuridica' ? (
                                    <Campo classe="sm:col-span-2" etichetta="Denominazione" valore={em.denominazione} onChange={denominazione => aggEm({ denominazione })} segnaposto="Studio Legale Rossi e Associati" />
                                ) : (
                                    <>
                                        <Campo etichetta="Nome" valore={em.nome} onChange={nome => aggEm({ nome })} segnaposto="Maria" />
                                        <Campo etichetta="Cognome" valore={em.cognome} onChange={cognome => aggEm({ cognome })} segnaposto="Rossi" />
                                    </>
                                )}
                                <Campo etichetta="Partita IVA" valore={em.partita_iva} onChange={partita_iva => aggEm({ partita_iva })} inputMode="numeric" maxLength={11} />
                                <Campo etichetta="Codice fiscale" valore={em.cf} onChange={cf => aggEm({ cf: cf.toUpperCase() })} maxLength={16} />
                            </div>
                            <Indirizzo dati={em} aggiorna={aggEm} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Campo etichetta="Email (facoltativa)" tipo="email" valore={em.email} onChange={email => aggEm({ email })} />
                                <Campo etichetta="Telefono (facoltativo)" valore={em.telefono} onChange={telefono => aggEm({ telefono })} />
                                <label className="block">
                                    <span className={ETICHETTA}>Regime fiscale</span>
                                    <select value={em.regime} onChange={e => aggEm({ regime: e.target.value })} className={CAMPO}>
                                        {REGIMI.map(r => <option key={r.codice} value={r.codice}>{r.etichetta}</option>)}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className={ETICHETTA}>Cassa previdenziale</span>
                                    <select value={em.cassa} onChange={e => aggEm({ cassa: e.target.value })} className={CAMPO}>
                                        {[...CASSE].reverse().map(c => <option key={c.codice} value={c.codice}>{c.etichetta}</option>)}
                                    </select>
                                </label>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={ricorda} onChange={e => setRicorda(e.target.checked)} className="w-4 h-4 accent-oro" />
                                <span className="font-body text-xs text-nebbia/60">Ricorda i miei dati e il logo su questo dispositivo</span>
                            </label>
                        </div>
                    </Scheda>

                    <Scheda titolo="Il cliente">
                        <div className="space-y-4">
                            <Scelta valore={cl.tipo} onChange={tipo => aggCl({ tipo })} opzioni={[
                                { id: 'persona_fisica', nome: 'Persona' },
                                { id: 'persona_giuridica', nome: 'Azienda o ente' },
                            ]} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {cl.tipo === 'persona_giuridica' ? (
                                    <Campo classe="sm:col-span-2" etichetta="Ragione sociale" valore={cl.ragione_sociale} onChange={ragione_sociale => aggCl({ ragione_sociale })} />
                                ) : (
                                    <>
                                        <Campo etichetta="Nome" valore={cl.nome} onChange={nome => aggCl({ nome })} />
                                        <Campo etichetta="Cognome" valore={cl.cognome} onChange={cognome => aggCl({ cognome })} />
                                    </>
                                )}
                                <Campo etichetta="Codice fiscale" valore={cl.cf} onChange={cf => aggCl({ cf: cf.toUpperCase() })} maxLength={16} />
                                <Campo etichetta="Partita IVA" valore={cl.partita_iva} onChange={partita_iva => aggCl({ partita_iva })} />
                            </div>
                            <Indirizzo dati={cl} aggiorna={aggCl} estero={estero} />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Campo etichetta="Paese (sigla)" valore={cl.paese} onChange={paese => aggCl({ paese: paese.toUpperCase() })} maxLength={2} />
                                {!estero && (
                                    <>
                                        <Campo etichetta="Codice SDI (facoltativo)" valore={cl.codice_sdi} onChange={codice_sdi => aggCl({ codice_sdi: codice_sdi.toUpperCase() })} maxLength={7} />
                                        <Campo etichetta="PEC (facoltativa)" tipo="email" valore={cl.pec} onChange={pec => aggCl({ pec })} />
                                    </>
                                )}
                            </div>
                        </div>
                    </Scheda>

                    <Scheda titolo="Le righe">
                        <div className="space-y-3">
                            {righe.map((r, i) => (
                                <div key={i} className="border border-white/5 p-3 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <label className="block flex-1 min-w-0">
                                            <span className={ETICHETTA}>Descrizione</span>
                                            <textarea rows={2} value={r.descrizione} onChange={e => aggRiga(i, { descrizione: e.target.value })}
                                                placeholder="Consulenza del 3 novembre" className={`${CAMPO} resize-y`} />
                                        </label>
                                        {righe.length > 1 && (
                                            <button type="button" onClick={() => setRighe(rr => rr.filter((_, j) => j !== i))} aria-label="Togli la riga"
                                                className="p-2 mt-6 text-nebbia/30 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                                        <Campo etichetta="Quantità" tipo="number" min="0" step="any" valore={r.quantita} onChange={quantita => aggRiga(i, { quantita })} />
                                        <Campo etichetta="Prezzo (€)" tipo="number" step="any" valore={r.prezzo_unitario} onChange={prezzo_unitario => aggRiga(i, { prezzo_unitario })} segnaposto="100,00" />
                                        <label className="col-span-2 sm:col-span-1 flex items-center gap-2 cursor-pointer pb-2.5">
                                            <input type="checkbox" checked={r.esente} onChange={e => aggRiga(i, { esente: e.target.checked })} className="w-4 h-4 accent-oro" />
                                            <span className="font-body text-xs text-nebbia/60">Spesa esente art. 15</span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => setRighe(rr => [...rr, RIGA_VUOTA])}
                                className="flex items-center gap-2 px-3 py-2 border border-white/10 text-nebbia/60 font-body text-xs hover:border-oro/30 hover:text-oro transition-colors">
                                <Plus size={14} /> Aggiungi una riga
                            </button>
                        </div>
                    </Scheda>

                    <Scheda titolo="Imposte e pagamento">
                        <div className="space-y-4">
                            {forfettario ? (
                                <p className="font-body text-xs text-nebbia/50 leading-relaxed">Regime forfettario: niente IVA e niente ritenuta, con la dicitura di legge in fattura.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="block">
                                        <span className={ETICHETTA}>IVA</span>
                                        <select value={doc.iva} onChange={e => aggDoc({ iva: Number(e.target.value) })} className={CAMPO}>
                                            {ALIQUOTE.map(a => <option key={a} value={a}>{a}%</option>)}
                                        </select>
                                    </label>
                                    {ivaPct === 0 && (
                                        <label className="block">
                                            <span className={ETICHETTA}>Natura (perché niente IVA)</span>
                                            <select value={doc.natura} onChange={e => aggDoc({ natura: e.target.value })} className={CAMPO}>
                                                <option value="">Scegli</option>
                                                {NATURE_FATTURA.map(x => <option key={x.codice} value={x.codice}>{x.etichetta}</option>)}
                                            </select>
                                        </label>
                                    )}
                                </div>
                            )}
                            {!forfettario && (
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={doc.ritenuta} onChange={e => aggDoc({ ritenuta: e.target.checked })} className="w-4 h-4 accent-oro" />
                                        <span className="font-body text-xs text-nebbia/60">Ritenuta d'acconto (cliente sostituto d'imposta)</span>
                                    </label>
                                    {doc.ritenuta && (
                                        <span className="flex items-center gap-2">
                                            <input type="number" min="0" max="100" value={doc.ritenuta_pct} onChange={e => aggDoc({ ritenuta_pct: e.target.value })}
                                                className={`${CAMPO} !w-20 !py-1.5`} aria-label="Percentuale della ritenuta" />
                                            <span className="font-body text-xs text-nebbia/40">%</span>
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={bollo} onChange={e => aggDoc({ bollo: e.target.checked })} className="w-4 h-4 accent-oro" />
                                    <span className="font-body text-xs text-nebbia/60">Imposta di bollo 2 € {serveBollo && doc.bollo === null ? '(dovuta: oltre 77,47 € senza IVA)' : ''}</span>
                                </label>
                                {bollo && (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={doc.bollo_cliente} onChange={e => aggDoc({ bollo_cliente: e.target.checked })} className="w-4 h-4 accent-oro" />
                                        <span className="font-body text-xs text-nebbia/60">A carico del cliente</span>
                                    </label>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="block">
                                    <span className={ETICHETTA}>Pagamento</span>
                                    <select value={doc.metodo} onChange={e => aggDoc({ metodo: e.target.value })} className={CAMPO}>
                                        {METODI.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </label>
                                <Campo etichetta="IBAN (facoltativo)" valore={em.iban} onChange={iban => aggEm({ iban: iban.toUpperCase() })} />
                            </div>
                            <label className="block">
                                <span className={ETICHETTA}>Note (facoltative)</span>
                                <textarea rows={2} value={doc.note} onChange={e => aggDoc({ note: e.target.value })} className={`${CAMPO} resize-y`} />
                            </label>
                        </div>
                    </Scheda>
                </div>

                {/* Anteprima e azioni */}
                <aside className="lg:sticky lg:top-24 space-y-3">
                    <div className="bg-white text-[#0B1F2A] p-5 font-body text-[11px] leading-snug shadow-2xl shadow-black/40">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="min-w-0">
                                {em.logo && <img src={em.logo} alt="" className="max-h-10 max-w-[130px] mb-2" />}
                                <p className="font-medium text-[13px] break-words">{nomeEmittente || 'I tuoi dati'}</p>
                                {indirizzoDi(em) && <p className="text-[#5C6B73]">{indirizzoDi(em)}</p>}
                                {em.partita_iva && <p className="text-[#5C6B73]">P.IVA {em.partita_iva}</p>}
                            </div>
                            <div className="shrink-0 border border-[#D9DEE1] px-2.5 py-1.5 text-right">
                                <p className="text-[9px] font-medium uppercase">{tipoDoc.nome}</p>
                                <p className="font-medium text-[13px]">N. {doc.numero || '—'}</p>
                                <p className="text-[#5C6B73]">{dataIt(doc.data)}</p>
                            </div>
                        </div>
                        <div className="bg-[#F4F6F7] px-2.5 py-2 mb-3">
                            <p className="text-[9px] text-[#5C6B73] font-medium">DESTINATARIO</p>
                            <p className="font-medium break-words">{nomeCliente || 'Il cliente'}</p>
                            {indirizzoDi(cl) && <p className="text-[#5C6B73]">{indirizzoDi(cl)}</p>}
                        </div>
                        <div className="mb-3">
                            {righeValide.length === 0 && <p className="text-[#5C6B73] py-2 border-b border-[#D9DEE1]">Le righe del documento</p>}
                            {righeValide.map((r, i) => (
                                <div key={i} className="flex justify-between gap-3 py-1.5 border-b border-[#D9DEE1]">
                                    <span className="min-w-0 break-words">{r.quantita !== 1 ? `${r.quantita} × ` : ''}{r.descrizione}</span>
                                    <span className="shrink-0">{formatImporto(r.totale)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-0.5">
                            {righeTotali.map(([e, v]) => (
                                <div key={e} className="flex justify-between gap-3 text-[#5C6B73]"><span>{e}</span><span className="shrink-0">{v}</span></div>
                            ))}
                            <div className="flex justify-between gap-3 font-medium text-[13px] pt-1"><span>Totale documento</span><span>{formatImporto(totali.lordo)}</span></div>
                            {nettoPdf && (
                                <>
                                    <div className="flex justify-between gap-3 text-[#B03A3A]"><span>{nettoPdf.etichetta}</span><span>{nettoPdf.ritenuta}</span></div>
                                    <div className="flex justify-between gap-3 font-medium text-[13px] pt-1"><span>Netto a pagare</span><span>{nettoPdf.valore}</span></div>
                                </>
                            )}
                        </div>
                    </div>

                    {mancano.length > 0 && (
                        <div className="border border-amber-400/30 bg-amber-400/5 p-3">
                            <p className="flex items-center gap-2 font-body text-xs text-amber-300 mb-1.5"><AlertTriangle size={13} /> Manca ancora:</p>
                            <ul className="list-disc pl-5 space-y-0.5 font-body text-xs text-nebbia/60">
                                {mancano.map(m => <li key={m}>{m}</li>)}
                            </ul>
                        </div>
                    )}
                    {errore && <p className="font-body text-xs text-red-400">{errore}</p>}

                    <button onClick={scaricaPdf} disabled={!!creando}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                        {creando === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        {eFattura ? 'Scarica il PDF (copia di cortesia)' : 'Scarica il PDF'}
                    </button>
                    {eFattura && (
                        <button onClick={scaricaXml}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-oro/30 text-oro font-body text-sm hover:bg-oro/10 transition-colors">
                            <FileCode2 size={15} /> Scarica l'XML per l'Agenzia delle Entrate
                        </button>
                    )}
                    {xmlFatto && (
                        <p className="font-body text-xs text-salvia leading-relaxed">
                            XML scaricato. Ora caricalo sul portale Fatture e Corrispettivi dell'Agenzia delle Entrate (Fatturazione elettronica, Trasmissione) o dallo al tuo commercialista.
                        </p>
                    )}
                    {eFattura && !xmlFatto && (
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            In Italia la fattura valida è l'XML inviato al Sistema di Interscambio: il PDF è la copia per il cliente.
                        </p>
                    )}
                </aside>
            </section>

            <section className="max-w-3xl mx-auto px-6 pb-24">
                <h2 className="font-display text-3xl font-light mb-6">Domande frequenti</h2>
                <DomandeFrequenti domande={FATTURA.domande} />
                <p className="font-body text-sm text-nebbia/50 leading-relaxed mt-10">
                    Sei un avvocato? Calcola prima il compenso con il{' '}
                    <Link to="/strumenti/calcolo-parcella-avvocato" className="text-oro hover:underline">calcolo della parcella</Link>
                    {' '}e porta gli importi qui. Le fatture ti arrivano non pagate? Leggi{' '}
                    <Link to="/novita/fattura-non-pagata-cliente-diffida-decreto-ingiuntivo" className="text-oro hover:underline">cosa fare prima di fare causa</Link>.
                </p>
                <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-body text-sm text-nebbia/40">Vuoi fatture, clienti e pratiche in un posto solo?</p>
                    <Link to="/registrati" className="flex items-center gap-2 px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                        Prova Lexum <ArrowRight size={14} />
                    </Link>
                </div>
            </section>
            {popup}
        </div>
    )
}
