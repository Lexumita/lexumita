// src/pages/strumenti/CalcoloDanno.jsx
//
// 05-11-2026: il calcolo del danno biologico, aperto a tutti: gli stessi conti e gli stessi valori ufficiali di Lex
// (funzione calcola_danno_biologico, tabelle danno_tabelle). Al server arrivano solo punti, età e giorni.
// Con `portale` è la stessa pagina dentro l'area degli user: senza l'apertura, le spiegazioni e l'invito.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Download, Loader2 } from 'lucide-react'
import { TestataPagina, Apertura, DomandeFrequenti, CAMPO, ETICHETTA } from '@/components/strumenti/Pagina'
import { usePopupIscrizione } from '@/components/strumenti/PopupIscrizione'
import { PageHeader } from '@/components/shared'
import { caricaPdf, preparaPdf } from '@/lib/strumenti/caricaPdf'
import { supabase } from '@/lib/supabase'
import { registraEvento } from '@/lib/visite'
import { formatImporto } from '@/lib/prezzi'
import { DANNO } from '@/lib/strumenti/testi'

const PASSI = [
    { titolo: 'L\'invalidità permanente', testo: 'I punti li indica il medico legale. Fino a 9 punti si parla di lesioni di lieve entità, da 10 a 100 di lesioni di non lieve entità: il valore del punto cresce con la gravità.' },
    { titolo: 'L\'età', testo: 'A parità di punti l\'importo scende con l\'età. Nell\'art. 139 la riduzione è dello 0,5% per ogni anno dall\'undicesimo; nelle tabelle c\'è già dentro, con un valore per ogni età.' },
    { titolo: 'L\'inabilità temporanea', testo: 'Ogni giorno di inabilità assoluta ha un valore fisso, e quella parziale vale in proporzione: 30 giorni al 50% contano come 15.' },
    { titolo: 'La personalizzazione', testo: 'Il giudice può aumentare l\'importo se il caso ha conseguenze particolari, documentate e provate. Questo aumento non è nel calcolo, perché dipende dal caso.' },
]

const AVVERTENZA = 'Le cifre non comprendono personalizzazione, rivalutazione, interessi e danno patrimoniale. Sono un punto di partenza: la liquidazione dipende dalla prova del danno, dalla responsabilità e dalla valutazione del giudice.'

const interoValido = (s, min, max) => {
    if (String(s).trim() === '') return null
    const n = Number(String(s).replace(',', '.'))
    return Number.isInteger(n) && n >= min && n <= max ? n : null
}
const giorniDi = (s) => {
    const n = Number(String(s).replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : 0
}
const numeroIt = (n) => String(Math.round(n * 100) / 100).replace('.', ',')

// Quale parametro vale nel caso, e perché: la stessa regola che segue Lex
function riferimentoDi(punti, ambito) {
    if (punti >= 10) return { primo: 'tun', testo: 'Da 10 punti il parametro è la Tabella Unica Nazionale, anche fuori da strada e sanità (Cass. 8630/2026). Le Tabelle milanesi si possono preferire solo con una motivazione puntuale.' }
    if (ambito === 'circolazione') return { primo: 'art139', testo: 'Per circolazione stradale e responsabilità sanitaria si applica l\'art. 139.' }
    return { primo: 'milano', testo: 'Fuori da strada e sanità si usano di regola le Tabelle milanesi. L\'art. 139 resta un confronto.' }
}

function costruisciBlocchi(r, primo) {
    const blocchi = []
    if (r.art139) {
        const a = r.art139
        blocchi.push({
            id: 'art139',
            titolo: 'Art. 139 cod. ass.',
            sottotitolo: `Importi da aprile 2026. ${formatImporto(a.primo_punto)} × ${numeroIt(a.coefficiente)} × ${r.punti} punti, ${a.riduzione_eta_pct > 0 ? `ridotto del ${numeroIt(a.riduzione_eta_pct)}% per l'età` : 'senza riduzione per l\'età'}.`,
            righe: [
                ['Danno permanente', formatImporto(a.permanente)],
                ...(a.temporaneo !== null ? [[`Temporaneo, ${numeroIt(r.giorni)} giorni × ${formatImporto(a.giornaliero)}`, formatImporto(a.temporaneo)]] : []),
            ],
            totale: a.totale !== null ? ['Totale', formatImporto(a.totale)] : null,
            nota: `Il giudice può aumentare fino al ${a.personalizzazione_max_pct}%.`,
        })
    }
    if (r.tun) {
        const t = r.tun
        blocchi.push({
            id: 'tun',
            titolo: 'Tabella Unica Nazionale 2026',
            sottotitolo: 'd.P.R. 12/2025, valori da aprile 2026.',
            righe: [
                ['Solo danno biologico', formatImporto(t.biologico)],
                ['Con danno morale minimo', formatImporto(t.con_morale_minimo)],
                ['Con danno morale medio', formatImporto(t.con_morale_medio)],
                ['Con danno morale massimo', formatImporto(t.con_morale_massimo)],
                ...(t.temporaneo !== null ? [
                    [`Temporaneo, ${numeroIt(r.giorni)} giorni × ${formatImporto(t.giornaliero)}`, formatImporto(t.temporaneo)],
                    [`Temporaneo con il morale, +${t.morale_temporaneo_min_pct}% e +${t.morale_temporaneo_max_pct}%`, `${formatImporto(t.temporaneo_con_morale_minimo)} e ${formatImporto(t.temporaneo_con_morale_massimo)}`],
                ] : []),
            ],
            totale: t.totale_minimo !== null ? ['Totale con il danno morale', `da ${formatImporto(t.totale_minimo)} a ${formatImporto(t.totale_massimo)}`] : null,
            nota: `Il giudice può aumentare fino al ${t.personalizzazione_max_pct}% (art. 138, comma 3).`,
        })
    }
    if (r.milano) {
        const m = r.milano
        blocchi.push({
            id: 'milano',
            titolo: 'Tabelle milanesi 2024',
            sottotitolo: 'Osservatorio sulla giustizia civile di Milano, valori all\'1/1/2024.',
            righe: [
                ['Danno permanente', formatImporto(m.permanente)],
                ['di cui danno biologico', formatImporto(m.biologico)],
                ['di cui sofferenza', formatImporto(m.sofferenza)],
                ...(m.temporaneo !== null ? [[`Temporaneo, ${numeroIt(r.giorni)} giorni × ${formatImporto(m.giornaliero)}`, formatImporto(m.temporaneo)]] : []),
            ],
            totale: m.totale !== null ? ['Totale', formatImporto(m.totale)] : null,
            nota: `Personalizzazione fino al ${m.personalizzazione_max_pct}% sul permanente e al ${m.giornaliero_personalizzazione_max_pct}% sul giorno.`,
        })
    }
    return blocchi.sort((a, b) => (b.id === primo) - (a.id === primo))
}

function Riga({ etichetta, valore, forte = false }) {
    return (
        <div className={`flex justify-between gap-3 font-body ${forte ? 'text-sm font-semibold text-oro pt-2 border-t border-white/10' : 'text-xs text-nebbia/60'}`}>
            <span className={forte ? 'font-medium text-nebbia' : ''}>{etichetta}</span>
            <span className="text-right shrink-0">{valore}</span>
        </div>
    )
}

export default function CalcoloDanno({ portale = false }) {
    useEffect(() => { preparaPdf() }, [])
    const { dopoDocumento, popup } = usePopupIscrizione('danno')
    const [campi, setCampi] = useState({ punti: '', eta: '', g100: '', g75: '', g50: '', g25: '', ambito: 'altro' })
    const [risultato, setRisultato] = useState(null)
    const [caricando, setCaricando] = useState(false)
    const [errore, setErrore] = useState('')
    const [creando, setCreando] = useState(false)
    const contato = useRef(false)

    const punti = interoValido(campi.punti, 1, 100)
    const eta = interoValido(campi.eta, 1, 100)
    const giorniEquivalenti = useMemo(() => {
        const g = giorniDi(campi.g100) + giorniDi(campi.g75) * 0.75 + giorniDi(campi.g50) * 0.5 + giorniDi(campi.g25) * 0.25
        return g > 0 ? Math.round(g * 100) / 100 : null
    }, [campi.g100, campi.g75, campi.g50, campi.g25])

    useEffect(() => {
        if (punti === null || eta === null) { setRisultato(null); setErrore(''); return undefined }
        let attivo = true
        const attesa = setTimeout(async () => {
            setCaricando(true)
            const { data, error } = await supabase.rpc('calcola_danno_biologico', { p_punti: punti, p_eta: eta, p_giorni: giorniEquivalenti })
            if (!attivo) return
            setCaricando(false)
            if (error || !data) {
                setRisultato(null)
                setErrore('Non riesco a leggere le tabelle. Riprova tra qualche istante.')
                return
            }
            setErrore('')
            setRisultato(data)
            if (!contato.current) { contato.current = true; registraEvento('/strumenti/danno/calcolo') }
        }, 300)
        return () => { attivo = false; clearTimeout(attesa) }
    }, [punti, eta, giorniEquivalenti])

    const riferimento = punti !== null ? riferimentoDi(punti, campi.ambito) : null
    const blocchi = useMemo(() => (risultato && riferimento ? costruisciBlocchi(risultato, riferimento.primo) : []), [risultato, riferimento?.primo])
    const cambia = (nome) => (e) => setCampi((c) => ({ ...c, [nome]: e.target.value }))

    async function scaricaPdf() {
        if (!risultato || creando) return
        setCreando(true)
        setErrore('')
        try {
            const { scaricaPdfDanno } = await caricaPdf()
            await scaricaPdfDanno({
                dati: `${risultato.punti} punti di invalidità permanente, ${risultato.eta} anni${risultato.giorni ? `, ${numeroIt(risultato.giorni)} giorni di inabilità temporanea equivalenti` : ''}.`,
                riferimento: riferimento.testo,
                blocchi,
                avvertenza: AVVERTENZA,
            })
            dopoDocumento()
        } catch (e) {
            setErrore(e.message || 'Non sono riuscito a creare il PDF. Riprova tra qualche istante.')
        } finally {
            setCreando(false)
        }
    }

    const puntiErrati = campi.punti.trim() !== '' && punti === null
    const etaErrata = campi.eta.trim() !== '' && eta === null

    return (
        // overflow-x-clip e non hidden: hidden fa della pagina un contenitore a sé e la colonna di destra non segue più lo scorrimento
        <div className={portale ? 'text-nebbia pb-16' : 'min-h-screen bg-petrolio text-nebbia overflow-x-clip pt-20'}>
            {portale ? (
                <PageHeader label="Strumenti" title="Calcolo danno biologico"
                    subtitle="Art. 139, Tabella Unica e Tabelle milanesi. Gratis e senza crediti." />
            ) : (
                <>
                    <TestataPagina percorso={DANNO.percorso} titolo={DANNO.metaTitolo} descrizione={DANNO.metaDescrizione} />
                    <Apertura
                        etichetta="Strumenti gratis"
                        titolo="Calcolo"
                        evidenza="danno biologico"
                        testo="Il risarcimento del danno alla persona con i valori ufficiali: art. 139 del codice delle assicurazioni, Tabella Unica Nazionale e Tabelle milanesi, messi a confronto."
                        garanzie={['Gratis', 'Senza registrazione', 'Valori ufficiali 2026']}
                    />
                </>
            )}

            <section className={`grid grid-cols-1 gap-5 items-start ${portale ? 'xl:grid-cols-[1fr_380px]' : 'max-w-6xl mx-auto px-4 sm:px-6 pb-16 lg:grid-cols-[1fr_380px]'}`}>
                <div className="bg-slate border border-white/5 p-4 sm:p-6 space-y-5 min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="danno-punti" className={ETICHETTA}>Punti di invalidità permanente</label>
                            <input id="danno-punti" inputMode="numeric" className={CAMPO} placeholder="Da 1 a 100" value={campi.punti} onChange={cambia('punti')} />
                            {puntiErrati && <p className="font-body text-xs text-amber-400/70 mt-1">Le tabelle vanno a punti interi, da 1 a 100.</p>}
                        </div>
                        <div>
                            <label htmlFor="danno-eta" className={ETICHETTA}>Età del danneggiato</label>
                            <input id="danno-eta" inputMode="numeric" className={CAMPO} placeholder="Anni compiuti" value={campi.eta} onChange={cambia('eta')} />
                            {etaErrata && <p className="font-body text-xs text-amber-400/70 mt-1">Un numero intero, da 1 a 100.</p>}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="danno-ambito" className={ETICHETTA}>Da che cosa nasce il danno</label>
                        <select id="danno-ambito" className={CAMPO} value={campi.ambito} onChange={cambia('ambito')}>
                            <option value="altro">Altri casi, per esempio una caduta in un negozio</option>
                            <option value="circolazione">Circolazione stradale o responsabilità sanitaria</option>
                        </select>
                    </div>
                    <div>
                        <p className={ETICHETTA}>Giorni di inabilità temporanea</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[['g100', 'al 100%'], ['g75', 'al 75%'], ['g50', 'al 50%'], ['g25', 'al 25%']].map(([nome, etichetta]) => (
                                <div key={nome}>
                                    <label htmlFor={`danno-${nome}`} className="block font-body text-xs text-nebbia/40 mb-1">{etichetta}</label>
                                    <input id={`danno-${nome}`} inputMode="decimal" className={CAMPO} placeholder="0" value={campi[nome]} onChange={cambia(nome)} />
                                </div>
                            ))}
                        </div>
                        <p className="font-body text-xs text-nebbia/40 mt-2">
                            {giorniEquivalenti ? `Valgono ${numeroIt(giorniEquivalenti)} giorni di inabilità assoluta.` : 'Facoltativi: se la perizia indica i periodi, inseriscili qui.'}
                        </p>
                    </div>
                </div>

                <aside className={`bg-slate border border-oro/20 p-5 space-y-4 ${portale
                    ? 'xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto'
                    : 'lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto'}`}>
                    <p className="section-label">Il risultato</p>
                    {blocchi.length > 0 ? (
                        <>
                            <p className="font-body text-xs text-nebbia/60 leading-relaxed">{riferimento.testo}</p>
                            {blocchi.map((b, i) => (
                                <div key={b.id} className={`space-y-2 ${i > 0 ? 'pt-4 border-t border-white/5' : ''}`}>
                                    <p className={`font-body text-sm font-medium ${i === 0 ? 'text-oro' : 'text-nebbia/80'}`}>{b.titolo}</p>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{b.sottotitolo}</p>
                                    {b.righe.map(([e, v]) => <Riga key={e} etichetta={e} valore={v} />)}
                                    {b.totale && <Riga etichetta={b.totale[0]} valore={b.totale[1]} forte />}
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{b.nota}</p>
                                </div>
                            ))}
                            <p className="font-body text-xs text-amber-400/70 leading-relaxed">{AVVERTENZA}</p>
                        </>
                    ) : (
                        <p className="font-body text-xs text-nebbia/40 flex items-center gap-2">
                            {caricando && <Loader2 size={13} className="animate-spin" />}
                            {caricando ? 'Sto leggendo le tabelle.' : 'Inserisci i punti e l\'età per vedere le cifre.'}
                        </p>
                    )}
                    {/* quando il risultato è lungo scorre la colonna: il pulsante resta a vista */}
                    <div className="sticky -bottom-5 -mx-5 -mb-5 px-5 pb-5 pt-3 bg-slate border-t border-white/5 space-y-2">
                        <button onClick={scaricaPdf} disabled={!risultato || creando}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                            {creando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Scarica il PDF
                        </button>
                        {errore && <p className="font-body text-xs text-red-400">{errore}</p>}
                    </div>
                </aside>
            </section>

            {!portale && (
                <section className="max-w-3xl mx-auto px-6 pb-24">
                    <h2 className="font-display text-3xl font-light mb-6">Come si calcola il danno biologico</h2>
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
                    <DomandeFrequenti domande={DANNO.domande} />

                    <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="font-body text-sm text-nebbia/40">Hai una perizia? Lex la legge, fa i conti e ti dice quale tabella usare, con le sentenze collegate.</p>
                        <Link to="/registrati" className="flex items-center gap-2 px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors shrink-0">
                            Prova Lex gratis <ArrowRight size={14} />
                        </Link>
                    </div>
                </section>
            )}
            {popup}
        </div>
    )
}
