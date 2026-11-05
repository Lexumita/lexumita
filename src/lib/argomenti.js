// src/lib/argomenti.js
//
// 03-11-2026: gli argomenti che raccolgono gli articoli (novita.argomenti, un articolo può stare in più
// d'uno), ognuno con la sua pagina /novita/argomento/<slug>. Lo stesso elenco lo legge il build
// (scripts/generate-seo-pages.mjs) per testate e sitemap: se ne aggiungi uno, basta qui.

export const ARGOMENTI = [
    {
        slug: 'attualita',
        nome: 'Attualità',
        titolo: 'Attualità: i casi di cronaca spiegati con la legge',
        descrizione: 'Dai fatti di cui si parla alle regole che valgono per tutti: che cosa dice la legge, chi risponde e che cosa puoi fare, con le fonti citate.',
    },
    {
        slug: 'casa-e-condominio',
        nome: 'Casa e condominio',
        titolo: 'Casa e condominio: affitti, spese e diritti spiegati',
        descrizione: 'Affitto, cauzione, riparazioni, assemblee e spese di condominio: cosa dice la legge e cosa puoi fare, con le norme e le sentenze citate.',
    },
    {
        slug: 'lavoro',
        nome: 'Lavoro',
        titolo: 'Lavoro: contratti, licenziamenti e diritti spiegati',
        descrizione: 'Contratti, scadenze, tutele di chi lavora: le domande più frequenti, con le norme e le sentenze citate.',
    },
    {
        slug: 'famiglia',
        nome: 'Famiglia',
        titolo: 'Famiglia: figli, nonni, separazioni e diritti spiegati',
        descrizione: 'Rapporti tra genitori, figli e nonni, garanzie in famiglia, situazioni che diventano reato: cosa dice la legge, con le fonti citate.',
    },
    {
        slug: 'penale',
        nome: 'Penale',
        titolo: 'Diritto penale spiegato: prove, reati e processo',
        descrizione: 'Prove, arresto e fermo, stalking, processo in assenza: come funziona il processo penale e quando un fatto è reato, con le fonti citate.',
    },
    {
        slug: 'contratti-e-debiti',
        nome: 'Contratti e debiti',
        titolo: 'Contratti e debiti: clausole, ricevute, diffide e pagamenti',
        descrizione: 'Clausole che non valgono, fatture non pagate, diffide e ricevute: come tutelarti prima di arrivare in tribunale, con le norme citate.',
    },
    {
        slug: 'danni-e-risarcimenti',
        nome: 'Danni e risarcimenti',
        titolo: 'Danni e risarcimenti: chi paga e come chiederli',
        descrizione: 'Errori medici, infiltrazioni e altri danni: chi ne risponde e come si chiede il risarcimento, con le norme e le sentenze citate.',
    },
    {
        slug: 'cause-e-avvocati',
        nome: 'Cause e avvocati',
        titolo: 'Cause e avvocati: termini, spese e parcelle',
        descrizione: 'Decreti ingiuntivi, appello, spese di lite e parcelle: come funziona una causa e quanto costa, con le norme e le sentenze citate.',
    },
    {
        slug: 'fisco-e-imprese',
        nome: 'Fisco e imprese',
        titolo: 'Fisco e imprese: imposte, detrazioni e responsabilità',
        descrizione: 'IMU, detrazioni, autorizzazioni, responsabilità degli amministratori: le regole per chi paga le imposte e per chi fa impresa, con le fonti citate.',
    },
    {
        slug: 'diritti-e-istituzioni',
        nome: 'Diritti e istituzioni',
        titolo: 'Diritti e istituzioni: Costituzione, Europa e pubblica amministrazione',
        descrizione: 'La Costituzione, le corti europee e i rapporti con la pubblica amministrazione: come funzionano e cosa cambia per te, con le fonti citate.',
    },
    {
        slug: 'intelligenza-artificiale',
        nome: 'Intelligenza artificiale',
        titolo: 'Intelligenza artificiale e diritto: regole, rischi e metodo',
        descrizione: 'AI Act, responsabilità, allucinazioni e metodo di verifica: come usare l\'intelligenza artificiale nel lavoro giuridico senza correre rischi.',
    },
    {
        slug: 'studio-e-professione',
        nome: 'Studio e professione',
        titolo: 'Studio e professione: organizzazione, ricerca e deontologia',
        descrizione: 'Gestionale, scadenze, archivio, ricerca delle fonti e deontologia: come organizzare il lavoro di uno studio legale o di commercialisti.',
    },
]

export function argomentoDaSlug(slug) {
    return ARGOMENTI.find(a => a.slug === slug) ?? null
}
