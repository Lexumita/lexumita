import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Upload, CheckCircle, Clock, XCircle, Shield, ArrowRight, Loader2, Scale, Calculator, Lock, Unlock, Sparkles, ChevronDown, MessageSquare } from 'lucide-react'
import { campiMancanti, percentualeProfilo } from '@/lib/profiloCompleto'

// ── Config per direzione professionale (avvocato | commercialista) ──
// Stesse chiavi documento (identita/albo/laurea) per entrambe: cambiano solo
// etichette e testi. Così l'admin (UtentiDettaglio) mostra i doc senza modifiche.
const PROFILI = {
    avvocato: {
        titolo: 'Completa il tuo profilo — Avvocato',
        intro: "Compila i dati di fatturazione e puoi subito acquistare un abbonamento: con l'abbonamento si attivano pratiche, clienti, atti e fatture. Nessuna attesa e nessuna approvazione.",
        badge: 'Avvocato verificato',
        documenti: [
            { key: 'identita', label: "Documento di identità", hint: "Carta d'identità o passaporto valido", req: false },
            { key: 'albo', label: "Iscrizione all'Albo", hint: "Certificato di iscrizione all'Albo degli Avvocati", req: false },
            { key: 'laurea', label: "Laurea in Giurisprudenza", hint: "Se vuoi, completa il tuo profilo pubblico", req: false },
        ],
    },
    commercialista: {
        titolo: 'Completa il tuo profilo — Commercialista',
        intro: "Compila i dati di fatturazione e puoi subito acquistare un abbonamento: con l'abbonamento si attivano pratiche, clienti, atti e fatture. Nessuna attesa e nessuna approvazione.",
        badge: 'Commercialista verificato',
        documenti: [
            { key: 'identita', label: "Documento di identità", hint: "Carta d'identità o passaporto valido", req: false },
            { key: 'albo', label: "Iscrizione all'Albo (ODCEC)", hint: "Certificato di iscrizione all'Albo dei Dottori Commercialisti e degli Esperti Contabili", req: false },
            { key: 'laurea', label: "Laurea in Economia", hint: "Se vuoi, completa il tuo profilo pubblico", req: false },
        ],
    },
}

// ── SCELTA DIREZIONE (se tipo_richiesta non ancora impostato) ──
// Due card a tutta larghezza (28-10-2026, come le vuole Antonino): «Scopri di più» apre la tendina con i
// vantaggi del piano per lo studio, gli strumenti, il pulsante per andare avanti e «Richiedi una consulenza»
// (un ticket già scritto, come «Richiedi il tuo codice»). Gli strumenti sono quelli già scritti nella pagina
// del profilo («Quello che si apre con un abbonamento»). 29-10-2026: fuori Banca Dati e archivio con la ricerca
// semantica, che ha già anche il privato; pratiche, clienti e portale, chat sulla pratica (e sul mandato) hanno
// la loro spiegazione (nota), scritta su quello che il sito fa e che lex-pratica e lex-mandato passano davvero a Lex.
const DIREZIONI = [
    {
        chiave: 'avvocato',
        titolo: 'Avvocato',
        icona: Scale,
        descrizione: 'Pratiche, udienze, termini processuali, clienti e generazione di atti con Lex AI.',
        strumenti: [
            {
                testo: 'Pratiche, udienze, scadenze e controparti',
                nota: 'Un ambiente in cui tieni traccia di tutto: ogni pratica raccoglie cliente, controparti, udienze, scadenze e documenti.',
            },
            {
                testo: 'Calendario dello studio',
                nota: 'Udienze, scadenze e appuntamenti in un posto solo, anche in videochiamata, sincronizzati con Google Calendar. Il cliente vede i suoi appuntamenti nel portale.',
            },
            {
                testo: 'Clienti e portale dedicato',
                nota: 'Una scheda per ogni cliente, con le sue pratiche. Il cliente entra nel suo portale con un accesso suo: vede pratiche, appuntamenti e fatture, scambia documenti con lo studio e ti scrive.',
            },
            {
                testo: 'Generazione di atti e chat sulla pratica',
                nota: 'Chiedi a Lex AI dentro la pratica: risponde tenendo conto di tutto il fascicolo (cliente, controparti, udienze, documenti caricati, ricerche salvate) e, se serve, di norme e sentenze della Banca Dati. Gli atti li scrive con i dati della pratica.',
            },
            {
                testo: 'Fatture con compenso forense (DM 55/2014)',
                nota: 'Calcoli il compenso sui parametri forensi e la fattura si compila con spese generali, cassa, IVA e ritenuta; scarichi il PDF e il file XML della fattura elettronica. Il cliente la trova nel suo portale e tu tieni traccia di quelle pagate, in attesa e scadute.',
            },
            {
                testo: 'Posta fiscale e deleghe al cassetto fiscale',
                nota: 'Carichi avvisi e cartelle, anche da una foto: Lexum li legge, trova il cliente dal codice fiscale e calcola la scadenza, che finisce in agenda e nel portale del cliente. Tieni il registro delle deleghe al cassetto fiscale dei clienti, con la loro scadenza.',
            },
            'Assistenza prioritaria',
            'Crediti Lex AI ogni mese',
        ],
    },
    {
        chiave: 'commercialista',
        titolo: 'Commercialista',
        icona: Calculator,
        descrizione: 'Mandati, scadenzario fiscale, contabilità clienti e documenti con Lex AI per lo studio.',
        strumenti: [
            {
                testo: 'Mandati, clienti e scadenzario fiscale',
                nota: 'Un ambiente in cui tieni traccia di tutto: ogni mandato raccoglie cliente, scadenze fiscali, entrate e uscite e documenti. I tuoi clienti hanno un portale dove vedono mandati e scadenze e scambiano documenti con lo studio.',
            },
            {
                testo: 'Calendario dello studio',
                nota: 'Appuntamenti con i clienti, anche in videochiamata, sincronizzati con Google Calendar. Il cliente vede i suoi appuntamenti nel portale.',
            },
            {
                testo: 'Contabilità dei clienti',
                nota: 'Entrate e uscite con il conto economico mese per mese e il confronto fra gli anni, budget e scostamenti, liquidità prevista a 12 mesi, partita doppia con bilancio e stato patrimoniale, dipendenti con il costo aziendale (lordo, contributi, TFR). Da un documento caricato nel mandato Lexum ricava l’entrata o l’uscita da registrare.',
            },
            {
                testo: 'Generazione di documenti e chat sul mandato',
                nota: 'Chiedi a Lex AI dentro il mandato: risponde tenendo conto di tutto (cliente, scadenze, entrate e uscite, dipendenti, documenti caricati, ricerche salvate) e, se serve, di norme e prassi della Banca Dati. I documenti li scrive con i dati del mandato.',
            },
            {
                testo: 'Fatture elettroniche',
                nota: 'Prepari la fattura con il PDF e il file XML della fattura elettronica. Il cliente la trova nel suo portale e tu tieni traccia di quelle pagate, in attesa e scadute.',
            },
            {
                testo: 'Posta fiscale e deleghe al cassetto fiscale',
                nota: 'Carichi avvisi e cartelle, anche da una foto: Lexum li legge, trova il cliente dal codice fiscale e calcola la scadenza, che finisce in agenda e nel portale del cliente. Tieni il registro delle deleghe al cassetto fiscale dei clienti, con la loro scadenza.',
            },
            'Assistenza prioritaria',
            'Crediti Lex AI ogni mese',
        ],
    },
]

// una voce della lista: solo il testo, o il testo con la sua spiegazione
const voce = st => (typeof st === 'string' ? { testo: st, nota: null } : st)

export function SceltaDirezione({ onScelta, loading, nuovoTicket }) {
    // ogni card si apre e si chiude da sola (aprirne una non chiude l'altra)
    const [aperte, setAperte] = useState([])

    return (
        <div className="space-y-6">
            <div>
                <p className="section-label mb-3">Completa il profilo</p>
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">Che professionista sei?</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                    Scegli il tuo profilo professionale: la piattaforma si adatta al tuo modo di lavorare.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
                {DIREZIONI.map(({ chiave, titolo, icona: Icona, descrizione, strumenti }) => {
                    const apertaQui = aperte.includes(chiave)
                    const consulenza = new URLSearchParams({
                        oggetto: 'Richiesta di consulenza',
                        messaggio: `Buongiorno, sono ${chiave === 'avvocato' ? 'un avvocato' : 'un commercialista'} e sto valutando Lexum per il mio studio: vorrei una consulenza su quale piano scegliere e cosa posso fare con il profilo professionale. Grazie.`,
                    })
                    return (
                        <div key={chiave} className={`bg-slate border transition-colors ${apertaQui ? 'border-oro/40' : 'border-white/5 hover:border-oro/30'}`}>
                            <div className="p-8">
                                <Icona size={32} className="text-oro mb-5" />
                                <p className="font-display text-2xl text-nebbia mb-2">{titolo}</p>
                                <p className="font-body text-sm text-nebbia/50 leading-relaxed">{descrizione}</p>
                                <button
                                    onClick={() => setAperte(a => (apertaQui ? a.filter(k => k !== chiave) : [...a, chiave]))}
                                    aria-expanded={apertaQui}
                                    className="mt-6 inline-flex items-center gap-2 font-body text-sm text-oro hover:text-oro/70 transition-colors"
                                >
                                    Scopri di più
                                    <ChevronDown size={15} className={`transition-transform ${apertaQui ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {apertaQui && (
                                <div className="border-t border-white/5 px-8 py-6 space-y-5">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles size={15} className="text-oro" />
                                            <p className="font-body text-sm font-medium text-oro">Quello che si apre con un abbonamento</p>
                                        </div>
                                        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 font-body text-sm text-nebbia/70 leading-relaxed">
                                            {strumenti.map(voce).map(({ testo, nota }) => (
                                                <li key={testo} className={`flex gap-2 ${nota ? 'sm:col-span-2' : ''}`}>
                                                    <CheckCircle size={14} className="text-salvia shrink-0 mt-1" />
                                                    <span>
                                                        {testo}
                                                        {nota && <span className="block mt-0.5 text-xs text-nebbia/45">{nota}</span>}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                                        Completi il profilo con i dati di fatturazione in due minuti e scegli il piano: si attiva subito,
                                        senza attese né approvazioni. Albo e documento d’identità sono facoltativi e ti danno il
                                        distintivo di professionista verificato.
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                                        <button
                                            disabled={loading}
                                            onClick={() => onScelta(chiave)}
                                            className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-40"
                                        >
                                            {loading ? <Loader2 size={14} className="animate-spin" /> : <>Verifica come {titolo.toLowerCase()} <ArrowRight size={14} /></>}
                                        </button>
                                        <Link to={`${nuovoTicket}?${consulenza}`} className="inline-flex items-center gap-2 font-body text-sm text-nebbia/60 hover:text-oro transition-colors">
                                            <MessageSquare size={14} /> Richiedi una consulenza
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── UPLOAD DOCUMENTI ──────────────────────────────────────────
export function UserVerifica() {
    const { profile, refreshProfile } = useAuth()

    const [direzione, setDirezione] = useState(profile?.tipo_richiesta ?? null)
    const [docs, setDocs] = useState({})
    const [loading, setLoading] = useState(false)
    const [salvandoDirezione, setSalvandoDirezione] = useState(false)
    const [errore, setErrore] = useState('')
    const [inviato, setInviato] = useState(false)

    // ── Dati di fatturazione: sono LORO a sbloccare la piattaforma. Dal 28-10-2026 si compilano in un posto
    // solo, il Profilo (sezione «Dati per la fatturazione»): qui restano l'avanzamento e il collegamento.
    const mancanti = campiMancanti(profile)
    const completo = mancanti.length === 0
    const percentuale = percentualeProfilo(profile)

    async function handleScelta(scelta) {
        setSalvandoDirezione(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase
                .from('profiles')
                .update({ tipo_richiesta: scelta })
                .eq('id', user.id)
            if (error) throw new Error(error.message)
            setDirezione(scelta)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvandoDirezione(false)
        }
    }

    if (!direzione) return (
        <SceltaDirezione
            onScelta={handleScelta}
            loading={salvandoDirezione}
            nuovoTicket={profile?.role === 'user' ? '/area/assistenza/nuovo' : '/assistenza/nuovo'}
        />
    )

    const config = PROFILI[direzione] ?? PROFILI.avvocato

    async function handleInvia() {
        const daCaricare = config.documenti.filter(d => docs[d.key])
        if (!daCaricare.length || loading) return
        setLoading(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Utente non autenticato')

            for (const d of daCaricare) {
                const file = docs[d.key]
                const ext = file.name.split('.').pop()
                const { error: upErr } = await supabase.storage
                    .from('verification-docs')
                    .upload(`${user.id}/${d.key}.${ext}`, file, { upsert: true })
                if (upErr) throw new Error(`Errore upload: ${upErr.message}`)
            }

            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ verification_status: 'pending' })
                .eq('id', user.id)
            if (updateErr) throw new Error(updateErr.message)

            setInviato(true)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (inviato) return (
        <div className="text-center py-12">
            <CheckCircle size={48} className="text-salvia mx-auto mb-4" />
            <h2 className="font-display text-4xl font-light text-nebbia mb-3">Documenti inviati</h2>
            <p className="font-body text-sm text-nebbia/50 mb-6 leading-relaxed max-w-sm mx-auto">
                Li esamineremo entro 24-48 ore per assegnarti il distintivo di professionista verificato.
                Nel frattempo puoi continuare a usare Lexum senza limitazioni.
            </p>
            <Link to="/area/acquista" className="btn-primary justify-center inline-flex w-full sm:w-auto">
                Vedi i piani <ArrowRight size={14} />
            </Link>
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <p className="section-label mb-3">Completa il profilo</p>
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">{config.titolo}</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">{config.intro}</p>
            </div>

            {/* La professione sempre visibile (28-10-2026): quella scelta evidenziata, l'altra a un clic.
                Prima si cambiava solo da un link minuscolo («Non sei un avvocato? Cambia scelta»). */}
            <div className="grid sm:grid-cols-2 gap-4">
                {DIREZIONI.map(({ chiave, titolo, icona: Icona }) => {
                    const attiva = chiave === direzione
                    return (
                        <button
                            key={chiave}
                            disabled={attiva || salvandoDirezione}
                            onClick={() => handleScelta(chiave)}
                            aria-pressed={attiva}
                            className={`flex items-center gap-4 p-5 border text-left transition-colors ${attiva
                                ? 'bg-slate border-oro/50 cursor-default'
                                : 'bg-slate/40 border-white/5 hover:border-oro/30 disabled:opacity-40'}`}
                        >
                            <Icona size={26} className={attiva ? 'text-oro' : 'text-nebbia/40'} />
                            <div className="flex-1">
                                <p className={`font-display text-xl ${attiva ? 'text-nebbia' : 'text-nebbia/60'}`}>{titolo}</p>
                                <p className="font-body text-xs text-nebbia/40">{attiva ? 'Il profilo che stai completando' : `Passa al profilo da ${titolo.toLowerCase()}`}</p>
                            </div>
                            {attiva && <CheckCircle size={18} className="text-oro shrink-0" />}
                        </button>
                    )
                })}
            </div>

            {/* Cosa hai ora, cosa si apre — il punto della pagina */}
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Unlock size={15} className="text-salvia" />
                        <p className="font-body text-sm font-medium text-nebbia">Quello che stai già usando</p>
                    </div>
                    <ul className="space-y-1.5 font-body text-xs text-nebbia/50 leading-relaxed">
                        <li>· Banca dati: oltre 4,5 milioni di documenti giuridici</li>
                        <li>· Lex AI: ricerca ragionata sulle fonti</li>
                        <li>· Archivio dei tuoi documenti con ricerca semantica</li>
                        <li>· Ricerche salvate ed etichette</li>
                        <li>· Assistenza: con un abbonamento è prioritaria</li>
                    </ul>
                </div>
                <div className="bg-slate border border-oro/25 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={15} className="text-oro" />
                        <p className="font-body text-sm font-medium text-oro">Quello che si apre con un abbonamento</p>
                    </div>
                    <ul className="space-y-1.5 font-body text-xs text-nebbia/60 leading-relaxed">
                        {(DIREZIONI.find(d => d.chiave === direzione) ?? DIREZIONI[0]).strumenti.map(voce).map(({ testo, nota }) => (
                            <li key={testo}>
                                · {testo}
                                {nota && <span className="block pl-2.5 text-nebbia/40">{nota}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Avanzamento e dati di fatturazione uno accanto all'altro (29-10-2026) */}
            <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-body text-sm font-medium text-nebbia">
                            {completo ? 'Profilo completo' : 'Profilo completo al'} {!completo && <span className="text-oro">{percentuale}%</span>}
                        </p>
                        {completo
                            ? <span className="font-body text-xs text-salvia flex items-center gap-1"><CheckCircle size={12} /> tutto pronto</span>
                            : <span className="font-body text-xs text-nebbia/40">mancano {mancanti.length}</span>}
                    </div>
                    <div className="h-1 w-full bg-petrolio overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${completo ? 'bg-salvia' : 'bg-oro'}`} style={{ width: `${percentuale}%` }} />
                    </div>
                    {!completo && (
                        <p className="font-body text-xs text-nebbia/40 mt-3 leading-relaxed">
                            Da compilare: {mancanti.join(' · ')}
                        </p>
                    )}
                </div>

                {/* Dati di fatturazione — il requisito vero: si compilano nel Profilo, in un posto solo */}
                <div className="bg-slate border border-white/5 p-5 flex flex-col gap-4">
                    <div>
                        <p className="font-body text-sm font-medium text-nebbia mb-1">Dati per la fatturazione</p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            Si compilano nel tuo Profilo. Appena completato sblocca subito l'acquisto degli abbonamenti.
                        </p>
                    </div>
                    <Link to="/area/profilo#fatturazione" className="btn-primary text-sm inline-flex items-center gap-2 self-start mt-auto">
                        {completo ? 'Vedi i dati' : 'Completa i dati nel Profilo'} <ArrowRight size={14} />
                    </Link>
                </div>
            </div>

            {completo && (
                <Link to="/area/acquista" className="flex items-center gap-3 bg-salvia/8 border border-salvia/25 px-4 py-3 group">
                    <Unlock size={15} className="text-salvia shrink-0" />
                    <p className="font-body text-xs text-salvia flex-1">
                        Il tuo profilo è completo: i piani sono sbloccati.
                    </p>
                    <ArrowRight size={13} className="text-salvia group-hover:translate-x-0.5 transition-transform" />
                </Link>
            )}

            {/* Documenti — ora facoltativi */}
            <div className="bg-slate/40 border border-white/5 p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <Shield size={16} className="text-nebbia/40 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-body text-sm font-medium text-nebbia mb-1">
                            Documenti professionali
                            <span className="ml-2 font-body text-[10px] text-nebbia/30 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">Facoltativo</span>
                        </p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            Non servono per acquistare né per usare la piattaforma. Caricandoli ottieni il
                            distintivo <span className="text-nebbia/70">«{config.badge}»</span>, che i tuoi
                            clienti vedono nel portale.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {config.documenti.map(({ key, label, hint }) => (
                        <div key={key} className={`border p-4 ${docs[key] ? 'border-salvia/30' : 'border-white/5'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-body text-sm text-nebbia mb-0.5">{label}</p>
                                    <p className="font-body text-xs text-nebbia/40">{hint}</p>
                                    {docs[key] && (
                                        <p className="font-body text-xs text-salvia mt-1 break-words">
                                            ✓ {docs[key].name} ({(docs[key].size / 1024).toFixed(0)} KB)
                                        </p>
                                    )}
                                </div>
                                <label className={`cursor-pointer ${docs[key] ? 'btn-secondary' : 'btn-secondary'} text-xs px-3 py-3 sm:py-2 w-full sm:w-auto justify-center flex items-center gap-1.5`}>
                                    <Upload size={12} /> {docs[key] ? 'Cambia' : 'Carica'}
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={e => {
                                            const f = e.target.files?.[0]
                                            if (!f) return
                                            if (f.size > 10 * 1024 * 1024) { setErrore('File troppo grande. Massimo 10 MB.'); return }
                                            setErrore('')
                                            setDocs(d => ({ ...d, [key]: f }))
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    disabled={!Object.keys(docs).length || loading}
                    onClick={handleInvia}
                    className="btn-secondary w-full justify-center disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                >
                    {loading
                        ? <><Loader2 size={16} className="animate-spin" /> Caricamento in corso…</>
                        : <><ArrowRight size={16} /> Invia per il distintivo</>}
                </button>
            </div>

            {errore && (
                <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                    <p className="font-body text-sm text-red-400">{errore}</p>
                </div>
            )}
        </div>
    )
}

// ── STATO VERIFICA ────────────────────────────────────────────
export function UserVerificaStato() {
    const { profile } = useAuth()
    const stato = profile?.verification_status ?? 'pending'

    const CONFIG = {
        pending: { icon: Clock, color: 'text-amber-400', title: 'Verifica in corso', desc: 'Il team Lexum sta esaminando i tuoi documenti per il distintivo di professionista verificato: riceverai un\u2019email entro 24-48 ore. Nel frattempo puoi usare Lexum e acquistare un abbonamento senza aspettare.' },
        approved: { icon: CheckCircle, color: 'text-salvia', title: 'Verifica approvata!', desc: 'I tuoi documenti sono stati verificati: hai il distintivo di professionista verificato. Se non l\u2019hai già fatto, scegli un abbonamento per attivare pratiche, clienti, atti e fatture.' },
        rejected: { icon: XCircle, color: 'text-red-400', title: 'Verifica non approvata', desc: 'Non è stato possibile verificare la tua identità con i documenti forniti.' },
    }

    const { icon: Icon, color, title, desc } = CONFIG[stato] ?? CONFIG.pending

    return (
        <div className="text-center py-10 space-y-6 max-w-lg mx-auto">
            <Icon size={56} className={`mx-auto ${color}`} />
            <div>
                <h1 className="font-display text-4xl font-light text-nebbia mb-3">{title}</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">{desc}</p>
            </div>

            {stato === 'approved' && (
                <div className="space-y-3">
                    <Link to="/abbonamenti" className="btn-primary justify-center inline-flex w-full">
                        Scegli un piano <ArrowRight size={16} />
                    </Link>
                    <Link to="/banca-dati" className="btn-secondary justify-center inline-flex w-full">
                        Accedi alla banca dati
                    </Link>
                </div>
            )}
            {stato === 'rejected' && (
                <div className="space-y-3">
                    <div className="bg-red-900/10 border border-red-500/20 p-4 text-left">
                        <p className="font-body text-xs text-red-400 mb-1">Motivazione</p>
                        <p className="font-body text-sm text-nebbia/60">
                            {profile?.note_iniziali || 'Documenti non leggibili o incompleti. Ricarica i file in alta qualità.'}
                        </p>
                    </div>
                    <Link to="/verifica" className="btn-primary justify-center inline-flex w-full sm:w-auto">Ricarica documenti</Link>
                </div>
            )}
        </div>
    )
}
