// supabase/functions/tagada-webhook/fattura-pdf.ts — Lexum, 30-10-2026
//
// Il PDF della fattura di Mosaico Experiences SA per un pagamento sul sito (vedi la migrazione
// 20261030_fatture_lexum.sql). Stesso file su lexum.it e lexum.ch. jsPDF lo passa chi chiama: così qui
// non c'è nessun import e il file si prova anche fuori da Deno.
// Solo caratteri del font standard (Latin-1, accenti compresi): niente simbolo dell'euro, si scrive EUR.

export const EMITTENTE = {
  nome: "Mosaico Experiences SA",
  marchio: "Lexum",
  indirizzo: "Via Cantonale 1, 6900 Lugano",
  uid: "CHE-365.261.725",
};

export type Lingua = "it" | "de" | "fr";

const TESTI = {
  it: {
    fattura: "FATTURA", numero: "N.", data: "Data", pagata: "Pagata", destinatario: "DESTINATARIO",
    piva: "P.IVA / IDI", cf: "C.F.", descrizione: "Descrizione", importo: "Importo",
    imponibile: "Imponibile", iva: (a: string) => `IVA ${a}%`, totale: "Totale",
    ivaInclusa: (a: string) => `Importo comprensivo dell'IVA svizzera al ${a}%.`,
    senzaIva: "Prestazione non soggetta all'IVA svizzera: il destinatario ha sede fuori dalla Svizzera.",
    pagamento: (d: string, m: string) => `Pagata il ${d} (${m}).`,
    piede: "Lexum è un servizio di Mosaico Experiences SA. Documento emesso automaticamente.",
    paese: "Svizzera", sigla: "IVA",
  },
  de: {
    fattura: "RECHNUNG", numero: "Nr.", data: "Datum", pagata: "Bezahlt", destinatario: "EMPFÄNGER",
    piva: "UID / MWST-Nr.", cf: "Steuer-Nr.", descrizione: "Beschreibung", importo: "Betrag",
    imponibile: "Betrag ohne MWST", iva: (a: string) => `MWST ${a}%`, totale: "Total",
    ivaInclusa: (a: string) => `Betrag inklusive ${a}% schweizerischer MWST.`,
    senzaIva: "Leistung nicht der schweizerischen MWST unterstellt: Empfänger mit Sitz ausserhalb der Schweiz.",
    pagamento: (d: string, m: string) => `Bezahlt am ${d} (${m}).`,
    piede: "Lexum ist ein Dienst der Mosaico Experiences SA. Automatisch erstelltes Dokument.",
    paese: "Schweiz", sigla: "MWST",
  },
  fr: {
    fattura: "FACTURE", numero: "N.", data: "Date", pagata: "Payée", destinatario: "DESTINATAIRE",
    piva: "IDE / N. TVA", cf: "N. fiscal", descrizione: "Description", importo: "Montant",
    imponibile: "Montant hors TVA", iva: (a: string) => `TVA ${a}%`, totale: "Total",
    ivaInclusa: (a: string) => `Montant TVA suisse de ${a}% comprise.`,
    senzaIva: "Prestation non soumise à la TVA suisse : destinataire domicilié hors de Suisse.",
    pagamento: (d: string, m: string) => `Payée le ${d} (${m}).`,
    piede: "Lexum est un service de Mosaico Experiences SA. Document émis automatiquement.",
    paese: "Suisse", sigla: "TVA",
  },
};

export type DatiFattura = {
  numero: string;
  data: string;               // già scritta come si usa nel paese (29/10/2026, 29.10.2026)
  cliente: {
    ragione_sociale?: string | null;
    nome?: string | null;     // nome e cognome della persona
    indirizzo?: string | null; // via, CAP, località, paese: già composti
    partita_iva?: string | null;
    cf?: string | null;
    email?: string | null;
  };
  descrizione: string;
  totale: number;
  imponibile: number;
  iva_aliquota: number;
  iva_importo: number;
  valuta: string;
  metodo: string;             // «Carta», «VISA **** 4242»
  sito: string;               // www.lexum.it / www.lexum.ch
  email: string;              // info@lexum.it / info@lexum.ch
};

// deno-lint-ignore no-explicit-any
export function pdfFattura(jsPDF: any, f: DatiFattura, lingua: Lingua = "it"): ArrayBuffer {
  const t = TESTI[lingua] ?? TESTI.it;
  const decimali = (n: number) =>
    lingua === "it" && f.valuta === "EUR" ? n.toFixed(2).replace(".", ",") : n.toFixed(2);
  const soldi = (n: number) => `${decimali(Number(n))} ${f.valuta}`;
  const aliquota = decimali(Number(f.iva_aliquota)).replace(/[.,]?0+$/, "").replace(/[.,]$/, "") ||
    String(f.iva_aliquota);

  const numeroIva = `${EMITTENTE.uid} ${t.sigla}`;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 15;
  let y = M;

  // Emittente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(EMITTENTE.marchio, M, y + 2);
  y += 9;
  doc.setFontSize(9);
  doc.text(EMITTENTE.nome, M, y); y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(`${EMITTENTE.indirizzo}, ${t.paese}`, M, y); y += 4;
  doc.text(numeroIva, M, y); y += 4;
  doc.text(`${f.email} - ${f.sito}`, M, y); y += 4;

  // Riquadro con numero e data
  doc.setTextColor(0);
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(W - M - 65, M, 65, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(t.fattura, W - M - 60, M + 6);
  doc.setFontSize(13);
  doc.text(`${t.numero} ${f.numero}`, W - M - 60, M + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`${t.data}: ${f.data}`, W - M - 60, M + 19);
  doc.text(t.pagata, W - M - 60, M + 24);

  y = Math.max(y, M + 32) + 6;

  // Destinatario
  const righeCliente = [
    f.cliente.ragione_sociale && f.cliente.nome ? f.cliente.nome : null,
    f.cliente.indirizzo,
    [f.cliente.partita_iva && `${t.piva} ${f.cliente.partita_iva}`, f.cliente.cf && `${t.cf} ${f.cliente.cf}`]
      .filter(Boolean).join(" - ") || null,
    f.cliente.email,
  ].filter(Boolean) as string[];
  const altezza = 14 + righeCliente.length * 4.5;
  doc.setTextColor(0);
  doc.setFillColor(245, 245, 245);
  doc.rect(M, y, W - 2 * M, altezza, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(t.destinatario, M + 3, y + 5);
  doc.setFontSize(10);
  doc.text(String(f.cliente.ragione_sociale || f.cliente.nome || "-"), M + 3, y + 10.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80);
  righeCliente.forEach((r, i) => doc.text(r, M + 3, y + 15.5 + i * 4.5));
  y += altezza + 8;

  // Riga del servizio
  doc.setFillColor(11, 31, 42);
  doc.setTextColor(244, 247, 248);
  doc.rect(M, y, W - 2 * M, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(t.descrizione, M + 2, y + 5);
  doc.text(t.importo, W - M - 2, y + 5, { align: "right" });
  y += 12;
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const linee = doc.splitTextToSize(f.descrizione, W - 2 * M - 45);
  doc.text(linee, M + 2, y);
  doc.text(soldi(f.totale), W - M - 2, y, { align: "right" });
  y += linee.length * 4.5 + 2;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 8;

  // Totali
  const etichettaX = W - M - 80;
  const riga = (etichetta: string, valore: string, grassetto = false) => {
    doc.setFont("helvetica", grassetto ? "bold" : "normal");
    doc.text(etichetta, etichettaX, y);
    doc.text(valore, W - M - 2, y, { align: "right" });
    y += 5.5;
  };
  doc.setFontSize(9.5);
  doc.setTextColor(80);
  if (Number(f.iva_aliquota) > 0) {
    riga(t.imponibile, soldi(f.imponibile));
    riga(t.iva(aliquota), soldi(f.iva_importo));
  }
  doc.setDrawColor(150);
  doc.line(etichettaX, y - 2, W - M, y - 2);
  y += 2;
  doc.setTextColor(0);
  doc.setFontSize(11);
  riga(t.totale, soldi(f.totale), true);
  y += 4;

  // Diciture
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80);
  const nota = Number(f.iva_aliquota) > 0 ? t.ivaInclusa(aliquota) : t.senzaIva;
  for (const testo of [nota, t.pagamento(f.data, f.metodo)]) {
    const ll = doc.splitTextToSize(testo, W - 2 * M);
    doc.text(ll, M, y);
    y += ll.length * 4 + 1;
  }

  // Piede
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(t.piede, M, H - 10);
  doc.text(`${EMITTENTE.nome} - ${numeroIva}`, W - M, H - 10, { align: "right" });

  return doc.output("arraybuffer");
}
