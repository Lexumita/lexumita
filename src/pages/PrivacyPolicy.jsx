// src/pages/PrivacyPolicy.jsx
import { Shield, Lock, Eye, Server, Mail, FileText } from 'lucide-react'

function Section({ title, children }) {
    return (
        <div className="space-y-4">
            <h2 className="font-display text-2xl font-light text-nebbia border-b border-white/5 pb-3">{title}</h2>
            <div className="font-body text-sm text-nebbia/60 leading-relaxed space-y-3">
                {children}
            </div>
        </div>
    )
}

function Sub({ title, children }) {
    return (
        <div className="space-y-2 pl-4 border-l border-white/8">
            <p className="font-body text-sm font-medium text-nebbia/80">{title}</p>
            <div className="font-body text-sm text-nebbia/55 leading-relaxed space-y-2">{children}</div>
        </div>
    )
}

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-petrolio text-nebbia pt-20">
            <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">

                {/* Header */}
                <div className="space-y-4">
                    <p className="font-body text-xs text-salvia/60 tracking-[0.3em] uppercase">Informativa legale</p>
                    <h1 className="font-display text-5xl font-light text-nebbia">Privacy Policy</h1>
                    <p className="font-body text-sm text-nebbia/40">
                        Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="bg-slate border border-salvia/15 p-4 flex items-start gap-3">
                        <Shield size={14} className="text-salvia shrink-0 mt-0.5" />
                        <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                            La presente informativa è redatta ai sensi del Regolamento (UE) 2016/679 (GDPR),
                            del D.Lgs. 196/2003 (Codice Privacy italiano) e della Legge federale svizzera
                            sulla protezione dei dati (nLPD/revDSG, in vigore dal 1° settembre 2023).
                        </p>
                    </div>
                </div>

                {/* 1. Titolare */}
                <Section title="1. Titolare del trattamento">
                    <p>
                        Il titolare del trattamento dei dati personali è:
                    </p>
                    <div className="bg-slate border border-white/5 p-5 space-y-1.5">
                        <p className="font-medium text-nebbia">Alpi Consulenti Associati SA</p>
                        <p>CHE-243.562.655</p>
                        <p>c/o SAFEINVEST SA, Via Campo Marzio 7, 6900 Lugano, Svizzera</p>
                        <p>Email: <a href="mailto:privacy@lexum.it" className="text-oro hover:text-oro/70 transition-colors">privacy@lexum.it</a></p>
                    </div>
                    <p>
                        Per gli utenti residenti nell'Unione Europea, in assenza di un rappresentante UE
                        formalmente designato, il titolare rimane responsabile del rispetto del GDPR
                        in relazione ai trattamenti effettuati nell'ambito della piattaforma Lexum.
                    </p>
                </Section>

                {/* 2. Dati raccolti */}
                <Section title="2. Dati personali raccolti">
                    <Sub title="2.1 Dati forniti direttamente dall'utente">
                        <p>Al momento della registrazione e nell'utilizzo della piattaforma raccogliamo:</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>Nome, cognome e dati anagrafici</li>
                            <li>Indirizzo email e numero di telefono</li>
                            <li>Dati dello studio legale o professionale</li>
                            <li>Dati di fatturazione (ragione sociale, codice fiscale/partita IVA, indirizzo)</li>
                            <li>Contenuti caricati sulla piattaforma (documenti, sentenze, pratiche)</li>
                            <li>Comunicazioni inviate tramite la piattaforma</li>
                        </ul>
                    </Sub>
                    <Sub title="2.2 Dati raccolti automaticamente">
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>Indirizzo IP e dati di navigazione</li>
                            <li>Tipo di browser e sistema operativo</li>
                            <li>Date e orari di accesso</li>
                            <li>Pagine visitate e funzionalità utilizzate</li>
                            <li>Log di sistema e dati tecnici necessari alla sicurezza</li>
                        </ul>
                    </Sub>
                    <Sub title="2.3 Dati particolari">
                        <p>
                            In ragione della natura della piattaforma, i documenti e le pratiche caricate
                            dagli avvocati possono contenere dati particolari ai sensi dell'art. 9 GDPR
                            (es. dati relativi alla salute, all'orientamento sessuale, alle convinzioni religiose
                            dei clienti finali). Il trattamento di tali dati avviene esclusivamente su istruzione
                            dell'avvocato, che ne rimane responsabile nei confronti dei propri clienti.
                        </p>
                    </Sub>
                </Section>

                {/* 3. Finalità */}
                <Section title="3. Finalità e basi giuridiche del trattamento">
                    <div className="space-y-4">
                        {[
                            {
                                finalita: 'Erogazione del servizio',
                                base: 'Esecuzione del contratto (art. 6.1.b GDPR)',
                                desc: 'Gestione dell\'account, accesso alla piattaforma, elaborazione delle pratiche, ricerche AI e funzionalità collegate.'
                            },
                            {
                                finalita: 'Fatturazione e adempimenti fiscali',
                                base: 'Obbligo legale (art. 6.1.c GDPR)',
                                desc: 'Emissione di fatture, gestione dei pagamenti tramite Stripe, conservazione della documentazione contabile secondo la legge svizzera e italiana.'
                            },
                            {
                                finalita: 'Sicurezza della piattaforma',
                                base: 'Legittimo interesse (art. 6.1.f GDPR)',
                                desc: 'Prevenzione di accessi non autorizzati, rilevamento di anomalie, protezione dei dati degli utenti.'
                            },
                            {
                                finalita: 'Intelligenza artificiale e ricerca',
                                base: 'Esecuzione del contratto (art. 6.1.b GDPR)',
                                desc: 'Elaborazione dei contenuti caricati per fornire le funzionalità di ricerca semantica e analisi AI (Lex). I contenuti non vengono usati per addestrare modelli AI di terze parti.'
                            },
                            {
                                finalita: 'Comunicazioni di servizio',
                                base: 'Esecuzione del contratto (art. 6.1.b GDPR)',
                                desc: 'Notifiche relative all\'account, aggiornamenti del servizio, comunicazioni di assistenza.'
                            },
                            {
                                finalita: 'Marketing (solo con consenso)',
                                base: 'Consenso (art. 6.1.a GDPR)',
                                desc: 'Invio di newsletter e comunicazioni promozionali, solo previo consenso esplicito revocabile in qualsiasi momento.'
                            },
                        ].map(({ finalita, base, desc }) => (
                            <div key={finalita} className="bg-slate border border-white/5 p-4 space-y-1.5">
                                <p className="font-body text-sm font-medium text-nebbia">{finalita}</p>
                                <p className="font-body text-xs text-oro/70">{base}</p>
                                <p className="font-body text-xs text-nebbia/45 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 4. Destinatari */}
                <Section title="4. Destinatari dei dati">
                    <p>
                        I dati personali possono essere comunicati alle seguenti categorie di destinatari,
                        esclusivamente per le finalità indicate:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><span className="text-nebbia/80">Supabase Inc.</span> — infrastruttura cloud, database e autenticazione (USA, con garanzie adeguate)</li>
                        <li><span className="text-nebbia/80">Stripe Inc.</span> — elaborazione pagamenti (USA, con garanzie adeguate)</li>
                        <li><span className="text-nebbia/80">Anthropic PBC</span> — elaborazione AI per le funzionalità Lex (USA, con garanzie adeguate)</li>
                        <li><span className="text-nebbia/80">OpenAI LLC</span> — generazione di embeddings per la ricerca semantica (USA, con garanzie adeguate)</li>
                        <li><span className="text-nebbia/80">Postmark/Wildbit</span> — invio email transazionali (USA, con garanzie adeguate)</li>
                        <li><span className="text-nebbia/80">Autorità competenti</span> — su richiesta legittima di autorità giudiziarie o amministrative</li>
                    </ul>
                    <p>
                        Tutti i fornitori di servizi sono vincolati da accordi di trattamento dei dati (DPA)
                        conformi al GDPR. Per i trasferimenti verso paesi terzi (in particolare USA)
                        vengono adottate le Clausole Contrattuali Standard approvate dalla Commissione Europea.
                    </p>
                </Section>

                {/* 5. Conservazione */}
                <Section title="5. Periodo di conservazione">
                    <div className="space-y-3">
                        {[
                            ['Dati dell\'account', 'Per tutta la durata del contratto e fino a 2 anni dalla cancellazione dell\'account'],
                            ['Documenti e pratiche caricati', 'Per tutta la durata del contratto; cancellati su richiesta o entro 90 giorni dalla cessazione'],
                            ['Dati di fatturazione', '10 anni dalla data della fattura (obbligo legale svizzero e italiano)'],
                            ['Log di sistema', 'Massimo 12 mesi dalla registrazione'],
                            ['Comunicazioni di assistenza', '3 anni dalla chiusura del ticket'],
                        ].map(([tipo, periodo]) => (
                            <div key={tipo} className="flex justify-between gap-4 py-2 border-b border-white/5">
                                <span className="font-body text-sm text-nebbia/70">{tipo}</span>
                                <span className="font-body text-xs text-nebbia/40 text-right max-w-xs">{periodo}</span>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 6. Diritti */}
                <Section title="6. Diritti degli interessati">
                    <p>
                        In qualità di interessato, hai il diritto di:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            ['Accesso', 'Ottenere conferma del trattamento e copia dei tuoi dati'],
                            ['Rettifica', 'Correggere dati inesatti o incompleti'],
                            ['Cancellazione', 'Richiedere la cancellazione dei tuoi dati ("diritto all\'oblio")'],
                            ['Limitazione', 'Limitare il trattamento in determinate circostanze'],
                            ['Portabilità', 'Ricevere i tuoi dati in formato strutturato e leggibile'],
                            ['Opposizione', 'Opporti al trattamento basato su legittimo interesse'],
                            ['Revoca del consenso', 'Revocare in qualsiasi momento il consenso prestato'],
                            ['Reclamo', 'Presentare reclamo all\'autorità di controllo competente'],
                        ].map(([diritto, desc]) => (
                            <div key={diritto} className="bg-slate border border-white/5 p-3 space-y-1">
                                <p className="font-body text-xs font-medium text-nebbia/80">{diritto}</p>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                    <p>
                        Per esercitare i tuoi diritti scrivi a{' '}
                        <a href="mailto:privacy@lexum.it" className="text-oro hover:text-oro/70 transition-colors">privacy@lexum.it</a>.
                        Risponderemo entro 30 giorni. Per reclami puoi rivolgerti al
                        Garante Privacy italiano (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-oro hover:text-oro/70 transition-colors">garanteprivacy.it</a>)
                        o all'Incaricato federale svizzero della protezione dei dati (IFPDT).
                    </p>
                </Section>

                {/* 7. Sicurezza */}
                <Section title="7. Sicurezza dei dati">
                    <p>
                        Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali
                        da accessi non autorizzati, perdita, distruzione o divulgazione. In particolare:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Crittografia dei dati in transito (TLS 1.2+) e a riposo</li>
                        <li>Autenticazione sicura e gestione degli accessi basata sui ruoli</li>
                        <li>Infrastruttura cloud con certificazioni SOC 2 e ISO 27001</li>
                        <li>Backup regolari e procedure di disaster recovery</li>
                        <li>Monitoraggio continuo per il rilevamento di anomalie</li>
                        <li>Accesso ai dati limitato al personale autorizzato e strettamente necessario</li>
                    </ul>
                    <p>
                        In caso di violazione dei dati personali (data breach) che presenti un rischio
                        elevato per i diritti degli interessati, provvederemo alla notifica entro 72 ore
                        all'autorità di controllo competente e, ove necessario, agli interessati coinvolti.
                    </p>
                </Section>

                {/* 8. Cookie */}
                <Section title="8. Cookie e tecnologie di tracciamento">
                    <p>
                        La piattaforma Lexum utilizza esclusivamente cookie tecnici strettamente necessari
                        al funzionamento del servizio (es. cookie di sessione per l'autenticazione).
                        Non utilizziamo cookie di profilazione o di terze parti a fini pubblicitari.
                    </p>
                </Section>

                {/* 9. Modifiche */}
                <Section title="9. Modifiche alla presente informativa">
                    <p>
                        Ci riserviamo il diritto di aggiornare la presente informativa in caso di modifiche
                        normative o del servizio. Le modifiche sostanziali saranno comunicate via email
                        almeno 30 giorni prima dell'entrata in vigore. L'uso continuato della piattaforma
                        dopo tale periodo costituisce accettazione delle modifiche.
                    </p>
                </Section>

                {/* Footer */}
                <div className="bg-slate border border-white/5 p-5 flex items-start gap-3">
                    <Mail size={14} className="text-nebbia/30 shrink-0 mt-0.5" />
                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                        Per qualsiasi domanda relativa al trattamento dei tuoi dati personali contatta il nostro
                        responsabile privacy all'indirizzo{' '}
                        <a href="mailto:privacy@lexum.it" className="text-oro hover:text-oro/70 transition-colors">privacy@lexum.it</a>
                        {' '}oppure scrivi a Alpi Consulenti Associati SA, c/o SAFEINVEST SA,
                        Via Campo Marzio 7, 6900 Lugano, Svizzera.
                    </p>
                </div>

            </div>
        </div>
    )
}