// Formato unico dei prezzi in tutta l'interfaccia (03-10-2026).
//
// Prima la cifra, poi il simbolo, alla maniera italiana: «180 €», «1.990 €»,
// «3,99 €». Il punto separa le migliaia, la virgola i decimali.
//
// Il raggruppamento delle migliaia è fatto a mano: toLocaleString('it-IT')
// scrive «1990» senza punto (per l'italiano il separatore scatta solo da 5
// cifre), e il listino ha prezzi come 1.990 e 3.990.
//
// Lo spazio prima di € è indivisibile: il simbolo non va mai a capo da solo.

const SPAZIO = ' '

function raggruppa(cifre) {
    return cifre.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Numero all'italiana con i decimali richiesti: 1990 → «1.990», 3.99 → «3,99». */
export function formatNumero(n, decimali = 0) {
    const v = Number(n ?? 0)
    if (!Number.isFinite(v)) return '—'
    const [intera, dec] = Math.abs(v).toFixed(decimali).split('.')
    const zero = /^[0.]*$/.test(Math.abs(v).toFixed(decimali))
    return (v < 0 && !zero ? '-' : '') + raggruppa(intera) + (dec ? `,${dec}` : '')
}

/** Prezzo di listino: niente decimali se è intero. 180 → «180 €», 3.99 → «3,99 €». */
export function formatPrezzo(n) {
    const v = Number(n ?? 0)
    const intero = Math.round(v * 100) % 100 === 0
    return `${formatNumero(v, intero ? 0 : 2)}${SPAZIO}€`
}

/** Importo contabile (fatture, incassi, saldi): sempre due decimali. «1.100,00 €». */
export function formatImporto(n) {
    return `${formatNumero(n, 2)}${SPAZIO}€`
}
