// src/lib/pianoContiItaliano.js
//
// Piano dei conti italiano di base (impostazione a classi, schema riconducibile
// allo schema di bilancio CEE artt. 2424/2425 c.c.). Viene precaricato per
// cliente alla prima inizializzazione della contabilità, poi è editabile.
//
// Impostazione (come CH): la classe = primo digit del numero conto.
//   1 Attivo · 2 Passivo · 3 Ricavi · 4-8 Costi · 9 Chiusura
// Conti chiave mantenuti col numero CH per riuso della logica di scrittura:
//   1170 = Erario c/IVA a credito · 2200 = Erario c/IVA a debito · 2979 = Utile/perdita d'esercizio

export const PIANO_CONTI_IT = [
    // 1 — ATTIVO (Stato Patrimoniale attivo)
    ['1010', 'Cassa'],
    ['1020', 'Banca c/c'],
    ['1030', 'Conto corrente postale'],
    ['1100', 'Crediti verso clienti'],
    ['1110', 'Crediti v/clienti - fatture da emettere'],
    ['1170', 'Erario c/IVA a credito'],
    ['1180', 'Crediti verso Erario (acconti e ritenute)'],
    ['1200', 'Rimanenze di magazzino'],
    ['1300', 'Ratei e risconti attivi'],
    ['1500', 'Impianti e macchinari'],
    ['1510', 'Attrezzature industriali e commerciali'],
    ['1520', 'Mobili e arredi'],
    ['1530', 'Macchine ufficio elettroniche'],
    ['1540', 'Automezzi'],
    ['1600', 'Fabbricati'],
    ['1610', 'Terreni'],
    ['1810', 'Fondo ammortamento impianti e macchinari'],
    ['1820', 'Fondo ammortamento mobili e macchine ufficio'],
    ['1840', 'Fondo ammortamento automezzi'],
    ['1860', 'Fondo ammortamento fabbricati'],
    // 2 — PASSIVO (Passività e Patrimonio netto)
    ['2000', 'Debiti verso fornitori'],
    ['2010', 'Debiti v/fornitori - fatture da ricevere'],
    ['2100', 'Banche c/c passivi'],
    ['2200', 'Erario c/IVA a debito'],
    ['2210', 'Erario c/ritenute da versare'],
    ['2220', 'Debiti tributari (IRES/IRAP)'],
    ['2270', 'Debiti verso istituti previdenziali (INPS/INAIL)'],
    ['2280', 'Debiti verso il personale'],
    ['2300', 'Ratei e risconti passivi'],
    ['2400', 'Mutui passivi'],
    ['2500', 'Fondo TFR (trattamento di fine rapporto)'],
    ['2600', 'Fondi per rischi e oneri'],
    ['2800', 'Capitale sociale'],
    ['2900', 'Riserve'],
    ['2891', 'Utile/perdita portata a nuovo'],
    ['2979', "Utile/perdita d'esercizio"],
    // 3 — RICAVI (valore della produzione + proventi finanziari)
    ['3000', 'Ricavi delle vendite e prestazioni'],
    ['3200', 'Ricavi da vendita merci'],
    ['3400', 'Altri ricavi e proventi'],
    ['3800', 'Resi, sconti e abbuoni su vendite'],
    ['3900', 'Interessi attivi e proventi finanziari'],
    // 4 — COSTI PER MERCI E MATERIE
    ['4000', 'Acquisti di merci'],
    ['4010', 'Acquisti materie prime e sussidiarie'],
    ['4400', 'Costi per servizi (prestazioni di terzi)'],
    // 5 — COSTI DEL PERSONALE
    ['5000', 'Salari e stipendi'],
    ['5700', 'Oneri sociali (INPS/INAIL)'],
    ['5720', 'Accantonamento TFR'],
    ['5800', 'Altri costi del personale'],
    // 6 — COSTI DI GESTIONE
    ['6000', 'Affitti e locazioni'],
    ['6100', 'Manutenzioni e riparazioni'],
    ['6200', 'Spese automezzi e trasporti'],
    ['6300', 'Assicurazioni'],
    ['6400', 'Utenze (energia, acqua, gas)'],
    ['6500', 'Cancelleria e materiali di consumo'],
    ['6510', 'Telefonia e internet'],
    ['6570', 'Spese informatiche e software'],
    ['6600', 'Pubblicità e marketing'],
    ['6700', 'Oneri diversi di gestione'],
    ['6800', 'Ammortamenti'],
    ['6900', 'Interessi passivi e oneri finanziari'],
    // 8 — COMPONENTI STRAORDINARI E IMPOSTE
    ['8000', 'Componenti straordinari'],
    ['8900', "Imposte dell'esercizio (IRES/IRAP)"],
    // 9 — CHIUSURA
    ['9100', 'Bilancio di apertura'],
    ['9200', 'Conto di risultato economico'],
]

export function classeDiConto(numero) {
    return parseInt(String(numero).charAt(0), 10) || 0
}

export function tipoDiClasse(classe) {
    if (classe === 1) return 'attivo'
    if (classe === 2) return 'passivo'
    if (classe === 3) return 'ricavo'
    if (classe === 9) return 'chiusura'
    return 'costo' // 4-8
}

export const NOME_CLASSE = {
    1: 'Attivo', 2: 'Passivo e patrimonio netto', 3: 'Ricavi e proventi',
    4: 'Costi per merci e materie', 5: 'Costi del personale', 6: 'Costi di gestione',
    7: 'Altri costi', 8: 'Straordinari e imposte', 9: 'Chiusura',
}

// Aliquote IVA italiane selezionabili nell'imputazione categoria→conto.
export const ALIQUOTE_IVA = [22, 10, 5, 4, 0]

// Righe pronte per l'insert in piano_conti (mancano solo cliente_id/avvocato_id/studio_id).
export function righeSeedPiano() {
    return PIANO_CONTI_IT.map(([numero, nome], i) => {
        const classe = classeDiConto(numero)
        return { numero, nome, classe, tipo: tipoDiClasse(classe), ordine: i }
    })
}
