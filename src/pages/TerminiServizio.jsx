// src/pages/TerminiServizio.jsx
import { FileText, AlertCircle, Shield, CreditCard } from 'lucide-react'
import { Helmet } from 'react-helmet-async'

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

export default function TerminiServizio() {
  return (
    <div className="min-h-screen bg-petrolio text-nebbia pt-20">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        <Helmet>
          <title>Privacy Policy — Lexum</title>
          <meta
            name="description"
            content="Informativa privacy di Lexum: come trattiamo i dati personali di avvocati, clienti e utenti della piattaforma in conformità al GDPR."
          />
          <meta name="robots" content="noindex, follow" />
          <link rel="canonical" href="https://www.lexum.it/privacy" />
        </Helmet>
        {/* Header */}
        <div className="space-y-4">
          <p className="font-body text-xs text-salvia/60 tracking-[0.3em] uppercase">Informativa legale</p>
          <h1 className="font-display text-5xl font-light text-nebbia">Termini di Servizio</h1>
          <p className="font-body text-sm text-nebbia/40">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="bg-slate border border-oro/15 p-4 flex items-start gap-3">
            <AlertCircle size={14} className="text-oro shrink-0 mt-0.5" />
            <p className="font-body text-xs text-nebbia/50 leading-relaxed">
              Leggere attentamente i presenti Termini prima di utilizzare la piattaforma Lexum.
              La registrazione e l'utilizzo del servizio costituiscono accettazione integrale
              dei presenti Termini. Il contratto è regolato dal diritto svizzero.
            </p>
          </div>
        </div>

        {/* 1. Parti */}
        <Section title="1. Parti del contratto">
          <p>
            I presenti Termini di Servizio regolano il rapporto contrattuale tra:
          </p>
          <div className="bg-slate border border-white/5 p-5 space-y-1.5">
            <p className="font-medium text-nebbia">Alpi Consulenti Associati SA</p>
            <p>CHE-243.562.655</p>
            <p>c/o SAFEINVEST SA, Via Campo Marzio 7, 6900 Lugano, Svizzera</p>
            <p className="text-nebbia/40 text-xs mt-2">(di seguito "Lexum", "noi" o "il Fornitore")</p>
          </div>
          <p>e l'utente registrato alla piattaforma (di seguito "Utente" o "Cliente"),
            che può essere un avvocato, uno studio legale o un professionista del settore legale.</p>
        </Section>

        {/* 2. Descrizione */}
        <Section title="2. Descrizione del servizio">
          <p>
            Lexum è una piattaforma SaaS (Software as a Service) dedicata ad avvocati e studi legali
            che fornisce, tra gli altri, i seguenti servizi:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Gestione di pratiche, clienti e documenti</li>
            <li>Archivio digitale con estrazione testo automatica tramite OCR</li>
            <li>Banca dati di sentenze e giurisprudenza condivisa tra professionisti</li>
            <li>Ricerca semantica su normativa italiana tramite intelligenza artificiale (Lex)</li>
            <li>Strumenti di analisi e strategia processuale assistiti dall'AI</li>
            <li>Calendario e gestione delle udienze</li>
            <li>Portale clienti per la condivisione di documenti e comunicazioni</li>
          </ul>
          <p>
            Lexum è uno strumento di supporto professionale. Le analisi e i suggerimenti
            generati dall'AI hanno natura puramente informativa e non costituiscono pareri legali.
            La responsabilità professionale rimane in capo all'avvocato in ogni circostanza.
          </p>
        </Section>

        {/* 3. Registrazione */}
        <Section title="3. Registrazione e account">
          <Sub title="3.1 Requisiti">
            <p>
              La registrazione a Lexum è riservata a professionisti legali (avvocati, praticanti,
              collaboratori di studio) e a chiunque necessiti di strumenti di ricerca legale
              (accesso Lex AI). L'Utente dichiara di avere capacità giuridica di agire e,
              se professionista, di essere iscritto all'albo competente.
            </p>
          </Sub>
          <Sub title="3.2 Obblighi dell'Utente">
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Fornire informazioni veritiere, accurate e aggiornate in fase di registrazione</li>
              <li>Mantenere riservate le proprie credenziali di accesso</li>
              <li>Notificare immediatamente qualsiasi accesso non autorizzato al proprio account</li>
              <li>Non condividere le credenziali con terzi non autorizzati</li>
              <li>Aggiornare i propri dati in caso di variazioni</li>
            </ul>
          </Sub>
          <Sub title="3.3 Account studio">
            <p>
              Il titolare dell'account studio (titolare) è responsabile degli accessi
              dei collaboratori da lui invitati. Ogni azione compiuta da un collaboratore
              è imputabile allo studio e al suo titolare.
            </p>
          </Sub>
        </Section>

        {/* 4. Piani */}
        <Section title="4. Piani di abbonamento e pagamenti">
          <Sub title="4.1 Piani disponibili">
            <p>
              Lexum è disponibile in diversi piani di abbonamento con caratteristiche e prezzi
              differenti, consultabili sulla piattaforma. I prezzi sono espressi in Euro (EUR)
              e si intendono IVA esclusa ove applicabile.
            </p>
          </Sub>
          <Sub title="4.2 Fatturazione">
            <p>
              Gli abbonamenti sono fatturati anticipatamente per il periodo selezionato
              (mensile o annuale). I pagamenti sono elaborati tramite Stripe.
              La fattura viene emessa automaticamente al momento del pagamento.
            </p>
          </Sub>
          <Sub title="4.3 Rinnovo automatico">
            <p>
              Gli abbonamenti si rinnovano automaticamente alla scadenza salvo disdetta
              comunicata almeno 7 giorni prima della data di rinnovo.
              La disdetta può essere effettuata dalla sezione Studio della piattaforma
              o inviando comunicazione a info@lexum.it.
            </p>
          </Sub>
          <Sub title="4.4 Mancato pagamento">
            <p>
              In caso di mancato pagamento alla scadenza, l'account entra in un periodo
              di grazia di 3 giorni durante i quali il servizio rimane accessibile.
              Trascorso tale periodo senza regolarizzazione, l'accesso viene sospeso.
              I dati vengono conservati per 30 giorni dalla sospensione, trascorsi i quali
              possono essere eliminati definitivamente.
            </p>
          </Sub>
          <Sub title="4.5 Rimborsi">
            <p>
              Non sono previsti rimborsi per periodi di abbonamento già fatturati,
              salvo vizi del servizio imputabili a Lexum. In caso di upgrade di piano,
              viene calcolata la differenza pro-rata per il periodo residuo.
            </p>
          </Sub>
          <Sub title="4.6 Crediti AI">
            <p>
              I crediti AI acquistati hanno validità indicata al momento dell'acquisto
              e non sono rimborsabili né trasferibili. I crediti inclusi nell'abbonamento
              mensile non si accumulano di mese in mese.
            </p>
          </Sub>
          <Sub title="4.7 Prova gratuita">
            <p>
              Lexum offre una prova gratuita della durata di 7 giorni (o periodo diverso
              indicato al momento dell'attivazione) per i nuovi utenti registrati come avvocati.
              La prova gratuita:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>È attivabile una sola volta per account e non è trasferibile</li>
              <li>Non richiede l'inserimento di dati di pagamento</li>
              <li>Include le funzionalità indicate al momento dell'attivazione</li>
              <li>Si conclude automaticamente alla scadenza senza addebiti</li>
              <li>Alla scadenza, l'accesso alle funzionalità a pagamento viene sospeso</li>
              <li>I dati inseriti durante la prova rimangono accessibili dopo l'acquisto di un piano</li>
              <li>I dati vengono conservati per 30 giorni dalla scadenza della prova,
                trascorsi i quali possono essere eliminati definitivamente</li>
            </ul>
            <p>
              Lexum si riserva il diritto di modificare le condizioni della prova gratuita
              o di sospenderla in qualsiasi momento per i nuovi utenti, senza effetto
              sulle prove già attivate.
            </p>
          </Sub>
        </Section>

        {/* 5. Contenuti */}
        <Section title="5. Contenuti caricati dall'Utente">
          <Sub title="5.1 Proprietà">
            <p>
              L'Utente rimane il solo proprietario dei contenuti caricati sulla piattaforma
              (documenti, sentenze, pratiche, note). Lexum non rivendica alcun diritto
              di proprietà su tali contenuti.
            </p>
          </Sub>
          <Sub title="5.2 Licenza d'uso">
            <p>
              Caricando contenuti sulla piattaforma, l'Utente concede a Lexum una licenza
              limitata, non esclusiva e non trasferibile per elaborare tali contenuti
              al solo scopo di erogare il servizio (archiviazione, OCR, indicizzazione,
              ricerca semantica, analisi AI).
            </p>
          </Sub>
          <Sub title="5.3 Banca dati condivisa">
            <p>
              Caricando sentenze nella banca dati condivisa, l'Utente dichiara di avere
              il diritto di condividere tali documenti e accetta che altri avvocati registrati
              possano acquistare l'accesso al documento. Il compenso per ogni accesso viene
              ripartito secondo le percentuali indicate al momento del caricamento.
            </p>
          </Sub>
          <Sub title="5.4 Contenuti vietati">
            <p>È vietato caricare sulla piattaforma:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Contenuti che violano diritti di terzi (copyright, privacy, segreti aziendali)</li>
              <li>Materiale illegale o che incita a attività illecite</li>
              <li>Dati personali di terzi non pertinenti alle pratiche legali gestite</li>
              <li>Malware, virus o codice dannoso</li>
              <li>Contenuti falsi o fuorvianti</li>
            </ul>
          </Sub>
          <Sub title="5.5 Responsabilità sui contenuti">
            <p>
              L'Utente è il responsabile del trattamento dei dati personali dei propri clienti
              ai sensi del GDPR. Lexum agisce quale responsabile del trattamento (data processor)
              per i dati caricati dall'Utente. Le parti sottoscrivono implicitamente un accordo
              di trattamento dei dati (DPA) conforme all'art. 28 GDPR con l'accettazione
              dei presenti Termini.
            </p>
          </Sub>
        </Section>

        {/* 6. Uso accettabile */}
        <Section title="6. Uso accettabile della piattaforma">
          <p>L'Utente si impegna a non utilizzare Lexum per:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Attività illegali o contrarie all'etica professionale forense</li>
            <li>Tentare di accedere ad aree della piattaforma non autorizzate</li>
            <li>Effettuare reverse engineering, decompilare o tentare di estrarre il codice sorgente</li>
            <li>Sovraccaricare intenzionalmente i sistemi (DDoS, scraping massivo)</li>
            <li>Condividere l'accesso alla piattaforma con terzi non autorizzati</li>
            <li>Raccogliere dati di altri utenti senza autorizzazione</li>
            <li>Creare account multipli per aggirare limitazioni del piano</li>
            <li>Utilizzare le funzionalità AI per generare contenuti fuorvianti o falsi pareri legali</li>
          </ul>
        </Section>

        {/* 7. AI */}
        <Section title="7. Funzionalità di intelligenza artificiale">
          <Sub title="7.1 Natura del servizio AI">
            <p>
              Le funzionalità basate su intelligenza artificiale (Lex AI) forniscono
              informazioni e analisi a carattere puramente informativo.
              I risultati generati dall'AI non costituiscono pareri legali,
              consulenza professionale o sostituzione del giudizio dell'avvocato.
            </p>
          </Sub>
          <Sub title="7.2 Limitazioni">
            <p>
              L'AI lavora sulla base delle fonti presenti nel database Lexum
              (normativa italiana, giurisprudenza caricata, documenti dell'archivio verificati).
              Lexum non garantisce la completezza, l'accuratezza o l'aggiornamento delle
              informazioni generate. L'Utente è responsabile della verifica indipendente
              di qualsiasi informazione prima di utilizzarla nell'esercizio della professione.
            </p>
          </Sub>
          <Sub title="7.3 Utilizzo dei contenuti">
            <p>
              I contenuti caricati dall'Utente non vengono utilizzati per addestrare
              modelli AI di terze parti. Le query inviate all'AI vengono elaborate
              dai fornitori indicati nella Privacy Policy nel rispetto degli accordi DPA.
            </p>
          </Sub>
        </Section>

        {/* 8. Disponibilità */}
        <Section title="8. Disponibilità del servizio e manutenzione">
          <p>
            Lexum si impegna a garantire la disponibilità della piattaforma con un obiettivo
            di uptime del 99,5% su base mensile, escluse le finestre di manutenzione programmate.
          </p>
          <p>
            Le manutenzioni programmate vengono comunicate con almeno 48 ore di anticipo.
            In caso di interruzioni non programmate, Lexum si impegna a ripristinare
            il servizio nel minor tempo possibile e a comunicare l'evento agli utenti interessati.
          </p>
          <p>
            Lexum non è responsabile per interruzioni causate da eventi fuori dal proprio controllo
            (forza maggiore, guasti di infrastruttura di terzi, attacchi informatici esterni).
          </p>
        </Section>

        {/* 9. Limitazione responsabilità */}
        <Section title="9. Limitazione di responsabilità">
          <p>
            Nei limiti consentiti dalla legge svizzera applicabile:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              Lexum non è responsabile per danni indiretti, consequenziali,
              perdita di profitto o perdita di dati derivanti dall'uso della piattaforma
            </li>
            <li>
              La responsabilità complessiva di Lexum per qualsiasi richiesta è limitata
              all'importo pagato dall'Utente nei 3 mesi precedenti l'evento generatore del danno
            </li>
            <li>
              Lexum non è responsabile per decisioni professionali adottate dall'avvocato
              sulla base di informazioni generate dall'AI
            </li>
            <li>
              Lexum non è responsabile per contenuti caricati da terzi nella banca dati condivisa
            </li>
          </ul>
        </Section>

        {/* 10. Proprietà intellettuale */}
        <Section title="10. Proprietà intellettuale">
          <p>
            La piattaforma Lexum, il suo codice sorgente, il design, i loghi, i marchi
            e tutti i contenuti originali prodotti da Lexum sono di proprietà esclusiva
            di Alpi Consulenti Associati SA e sono protetti dalla normativa svizzera e
            internazionale sul diritto d'autore e sulla proprietà intellettuale.
          </p>
          <p>
            L'Utente non è autorizzato a riprodurre, distribuire, modificare o creare
            opere derivate dalla piattaforma senza espressa autorizzazione scritta di Lexum.
          </p>
        </Section>

        {/* 11. Risoluzione */}
        <Section title="11. Sospensione e risoluzione del contratto">
          <Sub title="11.1 Risoluzione da parte dell'Utente">
            <p>
              L'Utente può recedere dal contratto in qualsiasi momento disattivando
              l'abbonamento dalla sezione Studio della piattaforma.
              Il recesso ha effetto alla fine del periodo di abbonamento già pagato.
            </p>
          </Sub>
          <Sub title="11.2 Sospensione da parte di Lexum">
            <p>
              Lexum si riserva il diritto di sospendere o terminare l'account dell'Utente
              in caso di:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Violazione dei presenti Termini</li>
              <li>Mancato pagamento oltre il periodo di grazia</li>
              <li>Uso fraudolento o abusivo della piattaforma</li>
              <li>Richiesta dell'autorità giudiziaria competente</li>
            </ul>
            <p>
              In caso di violazioni gravi, la sospensione può essere immediata.
              Per violazioni minori, Lexum si impegna a fornire un preavviso di 14 giorni.
            </p>
          </Sub>
          <Sub title="11.3 Effetti della risoluzione">
            <p>
              Alla risoluzione del contratto, l'Utente ha 30 giorni per esportare i propri dati.
              Trascorso tale periodo, i dati vengono eliminati definitivamente,
              salvo obblighi di conservazione previsti dalla legge.
            </p>
          </Sub>
        </Section>

        {/* 12. Legge applicabile */}
        <Section title="12. Legge applicabile e foro competente">
          <p>
            I presenti Termini sono regolati dal diritto svizzero, con esclusione delle
            norme di conflitto di leggi. Per le controversie con consumatori residenti
            nell'Unione Europea si applicano le norme imperative di protezione dei consumatori
            del paese di residenza dell'Utente.
          </p>
          <p>
            Il foro competente per qualsiasi controversia relativa ai presenti Termini
            è il Tribunale di Lugano (Svizzera), fatta salva la competenza esclusiva
            di altri fori prevista da norme imperative (in particolare, per i consumatori UE,
            il foro del paese di residenza del consumatore).
          </p>
          <p>
            Prima di ricorrere alle vie legali, le parti si impegnano a tentare una
            risoluzione amichevole della controversia entro 30 giorni dalla notifica
            scritta del problema.
          </p>
        </Section>

        {/* 13. Modifiche */}
        <Section title="13. Modifiche ai Termini">
          <p>
            Lexum si riserva il diritto di modificare i presenti Termini.
            Le modifiche sostanziali vengono comunicate via email con almeno 30 giorni
            di anticipo rispetto alla data di entrata in vigore.
            Le modifiche di natura tecnica o redazionale possono essere apportate senza preavviso.
          </p>
          <p>
            L'uso continuato della piattaforma dopo l'entrata in vigore delle modifiche
            costituisce accettazione dei nuovi Termini. In caso di disaccordo,
            l'Utente può recedere dal contratto prima della data di entrata in vigore.
          </p>
        </Section>

        {/* 14. Disposizioni finali */}
        <Section title="14. Disposizioni finali">
          <p>
            Se una o più disposizioni dei presenti Termini risultassero invalide o inapplicabili,
            le restanti disposizioni rimarranno in vigore a pieno titolo.
            La disposizione invalida sarà sostituita da una valida che si avvicini
            il più possibile all'intento originale.
          </p>
          <p>
            La mancata applicazione di una disposizione dei presenti Termini da parte di Lexum
            non costituisce rinuncia al diritto di applicarla in futuro.
          </p>
          <p>
            Per qualsiasi comunicazione relativa ai presenti Termini scrivere a:{' '}
            <a href="mailto:info@lexum.it" className="text-oro hover:text-oro/70 transition-colors">info@lexum.it</a>
          </p>
        </Section>

        {/* Footer */}
        <div className="bg-slate border border-white/5 p-5 flex items-start gap-3">
          <FileText size={14} className="text-nebbia/30 shrink-0 mt-0.5" />
          <p className="font-body text-xs text-nebbia/40 leading-relaxed">
            Alpi Consulenti Associati SA · CHE-243.562.655 · c/o SAFEINVEST SA,
            Via Campo Marzio 7, 6900 Lugano, Svizzera ·
            <a href="mailto:info@lexum.it" className="text-oro hover:text-oro/70 transition-colors ml-1">info@lexum.it</a>
          </p>
        </div>

      </div>
    </div>
  )
}