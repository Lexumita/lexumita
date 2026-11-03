// src/pages/strumenti/CalcoloParcella.jsx
//
// 03-11-2026: il calcolo della parcella forense del gestionale, aperto a tutti: stessi campi e stesso motore
// di CalcolaParcellaModal (components/avvocato/ParcellaCampi.jsx). Tutto nel browser.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Download, FileText, Loader2 } from 'lucide-react'
import { useCalcoloParcella, ParcellaCampi } from '@/components/avvocato/ParcellaCampi'
import { TestataPagina, Apertura, DomandeFrequenti } from '@/components/strumenti/Pagina'
import { usePopupIscrizione } from '@/components/strumenti/PopupIscrizione'
import { getCompetenza, SCAGLIONI, DISCLAIMER } from '@/lib/parametriForensi/catalogo'
import { passaRigheAllaFattura } from '@/lib/strumenti/memoria'
import { registraEvento } from '@/lib/visite'
import { formatImporto } from '@/lib/prezzi'
import { PARCELLA } from '@/lib/strumenti/testi'

const PASSI = [
    { titolo: 'Competenza e valore', testo: 'Si sceglie la tabella del decreto in base all\'autorità e al tipo di causa; il valore della causa individua lo scaglione. Nel penale non ci sono scaglioni: conta l\'autorità giudiziaria.' },
    { titolo: 'Le fasi', testo: 'Ogni fase svolta (studio, introduttiva, istruttoria o trattazione, decisionale) ha un valore medio, che può salire o scendere di regola fino al 50%. Il compenso è la somma delle fasi.' },
    { titolo: 'Aumenti e riduzioni', testo: 'L\'art. 4 prevede aumenti, per esempio con più parti assistite, e riduzioni, per esempio quando la causa si chiude solo in rito.' },
    { titolo: 'Gli accessori', testo: 'Al compenso si aggiungono le spese generali forfettarie del 15%, il contributo alla Cassa Forense del 4% e l\'IVA del 22%. Se il cliente è sostituto d\'imposta, versa al netto della ritenuta d\'acconto del 20%.' },
]

function Riga({ etichetta, valore, forte = false }) {
    return (
        <div className={`flex justify-between gap-3 font-body ${forte ? 'text-base font-semibold text-oro pt-2 border-t border-white/10' : 'text-xs text-nebbia/60'}`}>
            <span className={forte ? 'text-sm font-medium text-nebbia' : ''}>{etichetta}</span>
            <span>{valore}</span>
        </div>
    )
}

export default function CalcoloParcella() {
    const calcolo = useCalcoloParcella()
    const navigate = useNavigate()
    const { dopoDocumento, popup } = usePopupIscrizione('parcella')
    const [creando, setCreando] = useState(false)
    const [errore, setErrore] = useState('')

    const { risultato, applicaRitenuta, competenzaKey, scaglioneId, isPenale } = calcolo
    const rp = risultato.riepilogo

    async function scaricaPdf() {
        if (!risultato.ok || creando) return
        setCreando(true)
        setErrore('')
        try {
            const { scaricaPdfParcella } = await import('@/lib/strumenti/pdfStrumenti')
            await scaricaPdfParcella({
                competenza: getCompetenza(competenzaKey)?.label,
                scaglione: isPenale ? null : SCAGLIONI.find(s => s.id === scaglioneId)?.label,
                righe: risultato.righe,
                rp,
                ritenuta: applicaRitenuta,
                note: risultato.note ?? [],
                avvertenza: DISCLAIMER,
            })
            dopoDocumento()
        } catch (e) {
            setErrore(e.message || 'Non sono riuscito a creare il PDF. Riprova tra qualche istante.')
        } finally {
            setCreando(false)
        }
    }

    function portaInFattura() {
        if (!risultato.ok) return
        passaRigheAllaFattura(risultato.righe)
        registraEvento('/strumenti/parcella/in-fattura')
        navigate('/strumenti/crea-fattura')
    }

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <TestataPagina percorso={PARCELLA.percorso} titolo={PARCELLA.metaTitolo} descrizione={PARCELLA.metaDescrizione} />
            <Apertura
                etichetta="Strumenti gratis"
                titolo="Calcolo"
                evidenza="parcella avvocato"
                testo="Il compenso secondo i parametri forensi del DM 55/2014, con le tabelle aggiornate dal DM 147/2022. Lo scarichi in PDF o lo porti direttamente in fattura."
            />

            <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
                <div className="bg-slate border border-white/5 p-4 sm:p-6 space-y-5 min-w-0">
                    <ParcellaCampi calcolo={calcolo}
                        avvisoFonte="Per questa autorità i valori vengono da una fonte secondaria: controllali sulla Gazzetta Ufficiale." />
                </div>

                <aside className="lg:sticky lg:top-24 bg-slate border border-oro/20 p-5 space-y-3">
                    <p className="section-label">Il risultato</p>
                    {rp ? (
                        <div className="space-y-2">
                            <Riga etichetta="Compenso" valore={formatImporto(rp.compenso)} />
                            {rp.speseGenerali > 0 && <Riga etichetta="Spese generali 15%" valore={formatImporto(rp.speseGenerali)} />}
                            <Riga etichetta="C.P.A. 4%" valore={formatImporto(rp.cpa)} />
                            <Riga etichetta="IVA 22%" valore={formatImporto(rp.iva)} />
                            <Riga etichetta="Totale" valore={formatImporto(rp.totaleLordo)} forte />
                            {applicaRitenuta && (
                                <>
                                    <Riga etichetta="Ritenuta d'acconto 20%" valore={`- ${formatImporto(rp.ritenuta)}`} />
                                    <Riga etichetta="Netto a pagare" valore={formatImporto(rp.totaleNetto)} forte />
                                </>
                            )}
                        </div>
                    ) : (
                        <p className="font-body text-xs text-nebbia/40">{risultato.errore}</p>
                    )}
                    {(risultato.note ?? []).map(n => (
                        <p key={n} className="font-body text-xs text-amber-400/70 leading-relaxed">{n}</p>
                    ))}
                    <button onClick={scaricaPdf} disabled={!risultato.ok || creando}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                        {creando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Scarica il PDF
                    </button>
                    <button onClick={portaInFattura} disabled={!risultato.ok}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-oro/30 text-oro font-body text-sm hover:bg-oro/10 transition-colors disabled:opacity-40">
                        <FileText size={15} /> Crea la fattura con questi importi
                    </button>
                    {errore && <p className="font-body text-xs text-red-400">{errore}</p>}
                </aside>
            </section>

            <section className="max-w-3xl mx-auto px-6 pb-24">
                <h2 className="font-display text-3xl font-light mb-6">Come si calcola la parcella dell'avvocato</h2>
                <ol className="space-y-5 mb-14">
                    {PASSI.map((p, i) => (
                        <li key={p.titolo} className="flex gap-4">
                            <span className="font-display text-2xl text-oro/70 leading-none w-6 shrink-0">{i + 1}</span>
                            <div>
                                <h3 className="font-body text-sm font-medium text-nebbia mb-1">{p.titolo}</h3>
                                <p className="font-body text-sm text-nebbia/55 leading-relaxed">{p.testo}</p>
                            </div>
                        </li>
                    ))}
                </ol>

                <h2 className="font-display text-3xl font-light mb-6">Domande frequenti</h2>
                <DomandeFrequenti domande={PARCELLA.domande} />

                <p className="font-body text-sm text-nebbia/50 leading-relaxed mt-10">
                    Sei un cliente e la parcella ti sembra alta? Leggi{' '}
                    <Link to="/novita/parcella-avvocato-troppo-alta-come-contestarla" className="text-oro hover:underline">come contestarla</Link>.
                    {' '}Devi fatturare un altro importo? Usa{' '}
                    <Link to="/strumenti/crea-fattura" className="text-oro hover:underline">Crea fattura</Link>.
                </p>
                <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-body text-sm text-nebbia/40">Vuoi che anche la ricerca giuridica sia così veloce?</p>
                    <Link to="/registrati" className="flex items-center gap-2 px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                        Prova Lex gratis <ArrowRight size={14} />
                    </Link>
                </div>
            </section>
            {popup}
        </div>
    )
}
