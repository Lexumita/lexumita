// src/lib/strumenti/testi.js
//
// 03-11-2026: nomi, testate e domande frequenti degli strumenti gratuiti. Li leggono le pagine e il build
// (scripts/generate-seo-pages.mjs) per testate, dati strutturati e sitemap: un solo posto da correggere.

export const HUB_STRUMENTI = {
    percorso: '/strumenti',
    metaTitolo: 'Strumenti gratis per avvocati e professionisti — Lexum',
    metaDescrizione: 'Calcolo della parcella forense, fatture con PDF e XML e calcolo del danno biologico con i valori ufficiali: gratis e senza registrazione.',
}

export const PARCELLA = {
    slug: 'calcolo-parcella-avvocato',
    percorso: '/strumenti/calcolo-parcella-avvocato',
    nome: 'Calcolo parcella avvocato',
    brevissimo: 'Il compenso sui parametri forensi, in PDF o in fattura.',
    breve: 'Il compenso sui parametri forensi del DM 55/2014, con spese generali, C.P.A., IVA e ritenuta. Lo scarichi in PDF o lo porti in fattura.',
    metaTitolo: 'Calcolo parcella avvocato gratis: parametri forensi DM 55/2014 — Lexum',
    metaDescrizione: 'Calcola gratis il compenso dell\'avvocato sui parametri forensi del DM 55/2014 aggiornati dal DM 147/2022: fasi, minimi e massimi, spese generali, C.P.A., IVA e ritenuta.',
    domande: [
        {
            d: 'Il risultato è il prezzo dovuto?',
            r: 'No. È una stima sui parametri forensi: il compenso si pattuisce con il cliente e l\'accordo prevale. I parametri servono quando manca un accordo, per esempio se decide il giudice. Con banche, assicurazioni, imprese con più di 50 dipendenti o più di 10 milioni di ricavi e pubblica amministrazione vale anche la legge sull\'equo compenso (L. 49/2023).',
        },
        {
            d: 'Le tabelle sono aggiornate?',
            r: 'Sì: sono quelle del DM 55/2014 come modificato dal DM 147/2022, in vigore dal 23 ottobre 2022, per le attività concluse da quella data. Le tabelle civili, amministrative e tributarie sono state confrontate cella per cella con il testo su Normattiva. Per alcune autorità penali il valore viene da una fonte secondaria: in quel caso lo strumento te lo segnala.',
        },
        {
            d: 'Come si passa dal valore medio al minimo e al massimo?',
            r: 'Il decreto indica un valore medio per ogni fase. Secondo i criteri dell\'art. 4 (pregio dell\'attività, urgenza, complessità, risultati) può di regola salire fino al 50% o scendere fino al 50%. Per ogni fase puoi scegliere minimo, medio o massimo.',
        },
        {
            d: 'E se la causa vale più di 520.000 euro?',
            r: 'Le tabelle arrivano a 520.000 euro. Oltre, lo strumento applica la progressione dell\'art. 6: fino al 30% in più a ogni raddoppio del valore. È un massimo, da valutare caso per caso.',
        },
        {
            d: 'I miei dati finiscono da qualche parte?',
            r: 'No. Il calcolo e il PDF si fanno nel tuo browser: importi e dati non arrivano ai nostri server.',
        },
    ],
}

export const FATTURA = {
    slug: 'crea-fattura',
    percorso: '/strumenti/crea-fattura',
    nome: 'Crea fattura gratis',
    brevissimo: 'Con il tuo logo: PDF per il cliente e XML per l\'Agenzia delle Entrate.',
    breve: 'Carica il tuo logo, compila i dati e scarica il PDF per il cliente e il file XML da inviare all\'Agenzia delle Entrate. Anche pro forma e avviso di parcella.',
    metaTitolo: 'Crea fattura gratis online: PDF e XML FatturaPA senza registrazione — Lexum',
    metaDescrizione: 'Crea gratis la tua fattura con logo, C.P.A., ritenuta, bollo e regime forfettario. Scarichi il PDF e il file XML FatturaPA da caricare sul portale dell\'Agenzia delle Entrate.',
    domande: [
        {
            d: 'Il PDF basta come fattura?',
            r: 'In Italia no. Dal 2024 anche i forfettari devono emettere la fattura elettronica: quella valida è il file XML passato dal Sistema di Interscambio. Il PDF è la copia di cortesia per il cliente. Pro forma e avviso di parcella, invece, non sono fatture: restano in PDF e la fattura si emette quando arriva il pagamento.',
        },
        {
            d: 'Come invio il file XML?',
            r: 'Lo carichi gratis sul portale Fatture e Corrispettivi dell\'Agenzia delle Entrate (Fatturazione elettronica, Trasmissione), entrando con SPID, CIE o CNS, oppure lo dai al tuo commercialista. Lo strumento prepara il file ma non lo trasmette.',
        },
        {
            d: 'Funziona con il regime forfettario?',
            r: 'Sì. Scegli il regime forfettario: niente IVA e niente ritenuta, con la dicitura di legge in fattura. Sopra 77,47 euro lo strumento aggiunge l\'imposta di bollo da 2 euro.',
        },
        {
            d: 'Posso usarla per la pubblica amministrazione?',
            r: 'No. Le fatture alla pubblica amministrazione hanno un formato diverso, che questo strumento non produce.',
        },
        {
            d: 'I miei dati finiscono da qualche parte?',
            r: 'No. La fattura si crea nel tuo browser: dati, logo e importi non arrivano ai nostri server. Se vuoi, i tuoi dati e il logo restano salvati su questo dispositivo per la fattura successiva.',
        },
    ],
}

// 05-11-2026: stessi conti e stessi valori di Lex (calcola_danno_biologico). Se cambiano gli importi, si aggiornano anche queste domande.
export const DANNO = {
    slug: 'calcolo-danno-biologico',
    percorso: '/strumenti/calcolo-danno-biologico',
    nome: 'Calcolo danno biologico',
    brevissimo: 'Art. 139, Tabella Unica e Tabelle milanesi, con i valori 2026.',
    breve: 'Il risarcimento del danno alla persona con i valori ufficiali: art. 139 del codice delle assicurazioni, Tabella Unica Nazionale e Tabelle milanesi. Basta inserire punti, età e giorni di inabilità.',
    metaTitolo: 'Calcolo danno biologico 2026 gratis: art. 139, Tabella Unica e Tabelle di Milano — Lexum',
    metaDescrizione: 'Calcola gratis il danno biologico con i valori ufficiali 2026: micropermanenti art. 139 (988,45 euro il primo punto), Tabella Unica Nazionale da 10 punti e Tabelle milanesi 2024, con l\'inabilità temporanea.',
    domande: [
        {
            d: 'Quale tabella si usa?',
            r: 'Fino a 9 punti, per circolazione stradale e responsabilità sanitaria, si applica l\'art. 139 del codice delle assicurazioni. Negli altri casi, per esempio una caduta in un negozio, si usano di regola le Tabelle milanesi. Da 10 punti il parametro è la Tabella Unica Nazionale: per la Cassazione (n. 8630/2026) vale anche fuori da strada e sanità, e il giudice può preferire una tabella come quella milanese solo con una motivazione puntuale.',
        },
        {
            d: 'I valori sono aggiornati?',
            r: 'Sì. Art. 139: 988,45 euro il primo punto e 57,64 euro al giorno, dal decreto 20 luglio 2026. Tabella Unica: tabelle del decreto 28 settembre 2026, in vigore da aprile 2026. Tabelle milanesi: edizione 2024, con i valori all\'1 gennaio 2024.',
        },
        {
            d: 'Quale età devo inserire?',
            r: 'Gli anni compiuti del danneggiato. Né l\'art. 139 né le Tabelle milanesi dicono a quale momento si conta: se l\'età al fatto e quella alla stabilizzazione dei postumi sono diverse, prova con entrambe e scegli in base al caso.',
        },
        {
            d: 'Come si contano i giorni di inabilità parziale?',
            r: 'In proporzione: 30 giorni al 50% valgono 15 giorni di inabilità assoluta. Inserisci i periodi indicati nella perizia e lo strumento fa la somma.',
        },
        {
            d: 'Che cosa non è compreso?',
            r: 'La personalizzazione, la rivalutazione, gli interessi e il danno patrimoniale, come spese mediche e perdita di reddito. La personalizzazione arriva fino al 20% con l\'art. 139, fino al 30% con la Tabella Unica e, con le Tabelle milanesi, fino a una percentuale che dipende dai punti.',
        },
        {
            d: 'Il risultato è quanto spetta?',
            r: 'No. È il punto di partenza: la liquidazione dipende dalla prova del danno, dalla responsabilità e dalla valutazione del giudice.',
        },
        {
            d: 'I miei dati finiscono da qualche parte?',
            r: 'Al nostro server arrivano solo tre numeri, punti, età e giorni, per leggere le tabelle: nessun nome e nessun dato del caso. Il PDF si crea nel tuo browser.',
        },
    ],
}

export const STRUMENTI = [PARCELLA, FATTURA, DANNO]
