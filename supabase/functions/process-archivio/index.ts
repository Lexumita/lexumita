// supabase/functions/process-archivio/index.ts
//
// Estrae testo da PDF/TXT/Excel in archivio_documenti, fa chunking semantico,
// genera embeddings via OpenAI text-embedding-3-small,
// auto-verifica il documento se l'estrazione ha successo,
// e infine chiama suggest-metadata-archivio in fire-and-forget per
// estrarre metadati strutturati con Haiku.
//
// Trigger: chiamata fire-and-forget dal frontend Archivio.jsx dopo upload.
// Polling: il frontend monitora ocr_status ogni 3s.
//
// Versione: 1.3.0 (parità con Lexum CH: lettura Excel + OCR Mistral)
//   - v1.3: PDF grandi (> MAX_DOWNLOAD_BYTES) → OCR diretto senza caricarli in
//           funzione (evita OOM/kill della edge → documento orfano in 'processing').
//   - v1.2: lettura Excel (.xlsx/.xls) come testo cercabile + fallback OCR
//           (Mistral) per PDF senza layer di testo o con font ritagliati senza
//           ToUnicode (glifi-spazzatura); guard testoUsabile (niente
//           indicizzazione di spazzatura); sanificazione per code-point
//           (NUL/control/surrogati/zero-width) → niente "unsupported Unicode
//           escape sequence" sull'insert embeddings.
//   - v1.1: integrazione suggest-metadata-archivio + pulizia testo regex
//   - v1.0: estrazione testo + chunking + embeddings + autoverify

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { extractText } from "https://esm.sh/unpdf@0.11.0";
import * as XLSX from "npm:xlsx@0.18.5";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const STORAGE_BUCKET = "archivio";
const EMBED_MODEL = "text-embedding-3-small";
const OCR_MODEL = "mistral-ocr-latest";

const MIN_CHARS_PER_VERIFY = 200;
const MAX_CHUNK_CHARS = 800;
const MIN_CHUNK_CHARS = 100;
const MIN_CHUNK_USEFUL_CHARS = 30;
const EMBED_BATCH_SIZE = 5;
const EMBED_BATCH_DELAY_MS = 200;
const MAX_EMBED_INPUT_CHARS = 8000;
const MAX_EXCEL_CHARS = 400000; // cap testo estratto da Excel: evita esplosione embedding su export enormi
// Oltre questa dimensione un PDF non viene caricato in-funzione (unpdf su file
// enormi satura la RAM della edge → kill, documento orfano in 'processing'):
// si va diretti all'OCR, che scarica il file lato Mistral.
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;

// Caratteri "invisibili" da rimuovere (soft hyphen, zero-width space/joiner/
// non-joiner, word joiner, BOM, mongolian vowel separator). Codepoint espliciti:
// niente caratteri invisibili nel sorgente.
const CODEPOINT_ZERO_WIDTH = new Set([0x00AD, 0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF, 0x180E]);

// ─── HELPERS ────────────────────────────────────────────────

async function generaEmbedding(testo: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: testo.slice(0, MAX_EMBED_INPUT_CHARS),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.data?.[0]?.embedding) {
    throw new Error(`OpenAI risposta inattesa: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data.data[0].embedding;
}

// Sanificazione per code-point (nessuna regex con caratteri invisibili):
//  - NUL (0x00) e control chars C0 tranne TAB/LF/CR → rimossi: Postgres text non
//    li memorizza e via PostgREST davano "unsupported Unicode escape sequence".
//  - surrogati isolati (0xD800–0xDFFF) → rimossi (rompono l'encoding JSON).
//  - zero-width / soft hyphen → rimossi (i PDF li infilano tra le lettere).
//  - no-break space (0x00A0) → spazio normale.
// for..of itera per code point: le coppie surrogate valide arrivano come un solo
// code point > 0xFFFF e vengono conservate.
function sanificaTesto(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c === 0x00) continue;
    if (c < 0x20 && c !== 0x09 && c !== 0x0A && c !== 0x0D) continue;
    if (c >= 0xD800 && c <= 0xDFFF) continue;
    if (CODEPOINT_ZERO_WIDTH.has(c)) continue;
    if (c === 0x00A0) { out += " "; continue; }
    out += ch;
  }
  return out;
}

// Il testo è "usabile" se è abbastanza lungo ED è per lo più lettere. I PDF con
// font ritagliati senza tabella ToUnicode (tipico delle norme protette)
// producono glifi-spazzatura (control chars/simboli): NON vanno indicizzati
// (inquinerebbero gli embeddings) → si passa all'OCR.
function testoUsabile(s: string): boolean {
  if (s.length < MIN_CHARS_PER_VERIFY) return false;
  const lettere = (s.match(/\p{L}/gu) || []).length;
  return lettere / s.length >= 0.5;
}

// OCR dedicato (Mistral). Passiamo a Mistral una signed URL dell'oggetto storage:
// è lui a scaricare il PDF e a restituirci il testo (markdown per pagina).
// Nessun base64 → nessun limite di dimensione del body.
async function ocrPdfConMistral(storagePath: string): Promise<string> {
  const key = Deno.env.get("MISTRAL_API_KEY");
  if (!key) throw new Error("MISTRAL_API_KEY non configurata");

  const { data: signed, error: sErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 600);
  if (sErr || !signed?.signedUrl) {
    throw new Error(`signed URL per OCR fallita: ${sErr?.message ?? "url nulla"}`);
  }

  const res = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OCR_MODEL,
      document: { type: "document_url", document_url: signed.signedUrl },
    }),
  });

  if (!res.ok) {
    throw new Error(`Mistral OCR ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const pagine = Array.isArray(data.pages) ? data.pages : [];
  return pagine
    .map((p: any) => (typeof p.markdown === "string" ? p.markdown : ""))
    .join("\n\n")
    .trim();
}

// Pulizia testo coerente con Sentenze (FormSentenza.pulisciTesto)
// Riunisce parole spezzate, separa paragrafi su fine-frase + Maiuscola,
// stacca le numerazioni, normalizza newline multipli.
// NB: NON tocca i caratteri invisibili/illegali — se ne occupa sanificaTesto,
// che gira SEMPRE dopo (in tutti i rami del handler).
function pulisciTestoEstratto(testo: string): string {
  return testo
    // Normalizzazione Unicode NFKC: legature (ﬁ → fi), forme compatibili
    .normalize("NFKC")
    // Riunisce parole spezzate da hyphen+newline (es. "respon-\nsabilità")
    .replace(/(\w)-\n(\w)/g, "$1$2")
    // Collassa whitespace multipli (\s include NBSP e BOM)
    .replace(/\s+/g, " ")
    // Spezza paragrafi su Punto/Esclamativo/Interrogativo + Maiuscola
    .replace(/([.!?])\s+([A-Z])/g, "$1\n\n$2")
    // Stacca numerazioni (1. ... 2. ...)
    .replace(/(\d+\.)\s+/g, "\n$1 ")
    // Normalizza newline multipli
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkTesto(testo: string): string[] {
  const paragrafi = testo
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let buffer = "";

  for (const p of paragrafi) {
    if (p.length > MAX_CHUNK_CHARS) {
      if (buffer) {
        chunks.push(buffer.trim());
        buffer = "";
      }
      const frasi = p.split(/(?<=[.!?])\s+/);
      let bufFrasi = "";
      for (const frase of frasi) {
        if (bufFrasi.length + frase.length + 1 > MAX_CHUNK_CHARS) {
          if (bufFrasi) chunks.push(bufFrasi.trim());
          bufFrasi = frase;
        } else {
          bufFrasi += (bufFrasi ? " " : "") + frase;
        }
      }
      if (bufFrasi) chunks.push(bufFrasi.trim());
      continue;
    }

    if (buffer.length + p.length + 2 > MAX_CHUNK_CHARS) {
      if (buffer.length >= MIN_CHUNK_CHARS) {
        chunks.push(buffer.trim());
        buffer = p;
      } else {
        buffer += (buffer ? "\n\n" : "") + p;
      }
    } else {
      buffer += (buffer ? "\n\n" : "") + p;
    }
  }

  if (buffer.trim().length > 0) chunks.push(buffer.trim());

  return chunks.filter((c) => c.length >= MIN_CHUNK_USEFUL_CHARS);
}

// Serializza un Excel in testo CERCABILE: un blocco per foglio, righe con le
// intestazioni di colonna ripetute inline quando rilevabili. Così ogni chunk
// porta con sé il significato delle colonne (massimo segnale per l'embedding e
// per la lettura da parte di lex-mandato).
// NB: NON è un parser numerico — serve a rendere il contenuto trovabile e
// leggibile, non a sommare valori. I calcoli restano un binario separato.
function estraiTestoDaExcel(buffer: ArrayBuffer): string {
  const wb = XLSX.read(new Uint8Array(buffer), {
    type: "array",
    cellDates: true, // date come "15/04/2026", non come seriali Excel
  });

  const blocchi: string[] = [];

  for (const nomeFoglio of wb.SheetNames) {
    const ws = wb.Sheets[nomeFoglio];
    if (!ws) continue;

    // raw:false → valori formattati (leggibili) invece dei valori grezzi
    const aoa: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });

    // Tieni solo righe non completamente vuote, celle come stringhe trimmate
    const righe = aoa
      .map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "").trim()) : []))
      .filter((r) => r.some((c) => c.length > 0));

    if (righe.length === 0) continue;

    // Euristica header: prima riga con ≥2 celle non vuote, in prevalenza testo
    const prima = righe[0];
    const nonVuote = prima.filter((c) => c.length > 0);
    const testuali = nonVuote.filter((c) => isNaN(Number(c.replace(/[.,'\s]/g, ""))));
    const haHeader =
      righe.length >= 2 &&
      nonVuote.length >= 2 &&
      testuali.length >= nonVuote.length / 2;

    let corpo = "";
    if (haHeader) {
      const header = prima;
      corpo = righe
        .slice(1)
        .map((r) => {
          const coppie: string[] = [];
          for (let i = 0; i < header.length; i++) {
            const k = header[i]?.trim();
            const v = (r[i] ?? "").trim();
            if (k && v) coppie.push(`${k}: ${v}`);
          }
          return coppie.join(" — ");
        })
        .filter((t) => t.length > 0)
        .join("\n");
    } else {
      corpo = righe
        .map((r) => r.filter((c) => c.length > 0).join(" | "))
        .join("\n");
    }

    if (corpo.trim().length === 0) continue;
    blocchi.push(`## Foglio: ${nomeFoglio}\n${corpo}`);
  }

  const testo = blocchi.join("\n\n").trim();

  if (testo.length > MAX_EXCEL_CHARS) {
    return (
      testo.slice(0, MAX_EXCEL_CHARS) +
      "\n\n[...foglio di calcolo troncato per limiti di indicizzazione...]"
    );
  }
  return testo;
}

async function estraiTestoDaFile(
  file: Blob,
  fileName: string
): Promise<{ testo: string; pagine: number | null; tabellare: boolean }> {
  const lower = fileName.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (lower.endsWith(".pdf")) {
    const { text, totalPages } = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });
    return { testo: text ?? "", pagine: totalPages ?? null, tabellare: false };
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const testo = estraiTestoDaExcel(buffer);
    return { testo, pagine: null, tabellare: true };
  }

  if (lower.endsWith(".txt")) {
    const decoder = new TextDecoder("utf-8");
    return { testo: decoder.decode(buffer), pagine: null, tabellare: false };
  }

  throw new Error(
    `Formato non supportato per estrazione automatica: ${fileName.split(".").pop()}`
  );
}

async function aggiornaDocumento(
  documentoId: string,
  patch: Record<string, any>
) {
  await supabase
    .from("archivio_documenti")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", documentoId);
}

async function mergeMetadati(
  documentoId: string,
  nuoviCampi: Record<string, any>
): Promise<Record<string, any>> {
  const { data } = await supabase
    .from("archivio_documenti")
    .select("metadati")
    .eq("id", documentoId)
    .single();
  return { ...(data?.metadati ?? {}), ...nuoviCampi };
}

// Fire-and-forget: chiama suggest-metadata-archivio dopo il successo
async function avviaSuggerimentoMetadati(
  documentoId: string,
  authToken: string
): Promise<void> {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/suggest-metadata-archivio`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documento_id: documentoId }),
    });
    if (!res.ok) {
      console.log(
        JSON.stringify({
          evento: "suggest_metadata_warning",
          documento_id: documentoId,
          status: res.status,
        })
      );
    }
  } catch (err: any) {
    // Errore non blocca il completamento di process-archivio
    console.log(
      JSON.stringify({
        evento: "suggest_metadata_exception",
        documento_id: documentoId,
        errore: err.message,
      })
    );
  }
}

// ─── HANDLER ────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  let documentoId: string | null = null;
  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Non autorizzato" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const userToken = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(userToken);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Token non valido" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const body = await req.json();
    documentoId = body.documento_id;

    if (!documentoId) {
      return new Response(
        JSON.stringify({ ok: false, error: "documento_id obbligatorio" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const { data: doc, error: docErr } = await supabase
      .from("archivio_documenti")
      .select("id, titolare_id, autore_id, storage_path, tipo_file, titolo, ocr_status, dimensione")
      .eq("id", documentoId)
      .single();

    if (docErr || !doc) {
      return new Response(
        JSON.stringify({ ok: false, error: "Documento non trovato" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (!doc.storage_path) {
      throw new Error("storage_path mancante nel documento");
    }

    await aggiornaDocumento(documentoId, { ocr_status: "processing" });

    console.log(
      JSON.stringify({
        evento: "archivio_start",
        documento_id: documentoId,
        titolo: doc.titolo,
        dimensione: doc.dimensione,
      })
    );

    const fileName = doc.storage_path.split("/").pop() ?? doc.titolo ?? "file";
    const isPdf = fileName.toLowerCase().endsWith(".pdf");
    const hasKey = !!Deno.env.get("MISTRAL_API_KEY");

    // File grande: scaricarlo e aprirlo con unpdf DENTRO la funzione satura la RAM
    // della edge (→ kill, documento orfano). Se è un PDF grande e l'OCR c'è, si
    // salta il caricamento in-funzione e si va diretti all'OCR — è Mistral a
    // scaricare il PDF via signed URL, la funzione non lo tiene mai in memoria.
    const ocrDiretto = isPdf && hasKey && (doc.dimensione ?? 0) > MAX_DOWNLOAD_BYTES;

    let testoEstratto = "";
    let pagine: number | null = null;
    let tabellare = false;
    let viaOcr = false;

    if (ocrDiretto) {
      console.log(JSON.stringify({
        evento: "ocr_diretto_grande",
        documento_id: documentoId,
        mb: Math.round((doc.dimensione ?? 0) / 1048576),
      }));
      const ocrTxt = await ocrPdfConMistral(doc.storage_path);
      testoEstratto = sanificaTesto(pulisciTestoEstratto(ocrTxt));
      viaOcr = true;
    } else {
      const { data: fileBlob, error: dlErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(doc.storage_path);
      if (dlErr || !fileBlob) {
        throw new Error(`Download fallito: ${dlErr?.message ?? "blob nullo"}`);
      }
      const estratto = await estraiTestoDaFile(fileBlob, fileName);
      pagine = estratto.pagine;
      tabellare = estratto.tabellare;
      // Pulizia regex SOLO per prosa (PDF/TXT); Excel salta (romperebbe le colonne).
      testoEstratto = sanificaTesto(
        tabellare ? estratto.testo.trim() : pulisciTestoEstratto(estratto.testo)
      );

      // Fallback OCR: PDF senza testo estraibile (0 caratteri) o glifi-spazzatura
      // (font ritagliati senza ToUnicode, tipico dei PDF scansionati/protetti).
      if (!tabellare && isPdf && !testoUsabile(testoEstratto) && hasKey) {
        console.log(JSON.stringify({
          evento: "ocr_fallback_start",
          documento_id: documentoId,
          chars_estratti: testoEstratto.length,
        }));
        const ocrTxt = await ocrPdfConMistral(doc.storage_path);
        testoEstratto = sanificaTesto(pulisciTestoEstratto(ocrTxt));
        viaOcr = true;
        console.log(JSON.stringify({
          evento: "ocr_fallback_done",
          documento_id: documentoId,
          chars_ocr: testoEstratto.length,
        }));
      }
    }

    if (testoEstratto.length < MIN_CHARS_PER_VERIFY) {
      throw new Error(
        viaOcr
          ? `OCR non ha prodotto testo utile (${testoEstratto.length} caratteri).`
          : Deno.env.get("MISTRAL_API_KEY")
            ? `Testo non estraibile e OCR non riuscito (${testoEstratto.length} caratteri).`
            : `Testo estratto troppo breve (${testoEstratto.length} caratteri): il PDF non ha un layer di testo e l'OCR non è configurato.`
      );
    }

    await supabase
      .from("archivio_embeddings")
      .delete()
      .eq("documento_id", documentoId);

    const chunks = chunkTesto(testoEstratto);

    if (chunks.length === 0) {
      throw new Error("Chunking fallito: nessun chunk valido generato");
    }

    type EmbedRecord = {
      documento_id: string;
      chunk_index: number;
      testo_chunk: string;
      embedding: number[];
    };
    const records: EmbedRecord[] = [];

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await Promise.all(batch.map((c) => generaEmbedding(c)));
      for (let j = 0; j < batch.length; j++) {
        records.push({
          documento_id: documentoId,
          chunk_index: i + j,
          testo_chunk: batch[j],
          embedding: embeddings[j],
        });
      }
      if (i + EMBED_BATCH_SIZE < chunks.length) {
        await new Promise((r) => setTimeout(r, EMBED_BATCH_DELAY_MS));
      }
    }

    const { error: insErr } = await supabase
      .from("archivio_embeddings")
      .insert(records);

    if (insErr) {
      throw new Error(`Insert embeddings fallito: ${insErr.message}`);
    }

    const metadatiNuovi = await mergeMetadati(documentoId, {
      pagine,
      chars_estratti: testoEstratto.length,
      chunks: records.length,
      via_ocr: viaOcr,
      verificato_auto: true,
      verificato_at: new Date().toISOString(),
    });

    await aggiornaDocumento(documentoId, {
      testo_estratto: testoEstratto,
      ocr_status: "completed",
      verificato: true,
      metadati: metadatiNuovi,
    });

    const tempoMs = Date.now() - startTime;

    console.log(
      JSON.stringify({
        evento: "archivio_completato",
        documento_id: documentoId,
        chars: testoEstratto.length,
        chunks: records.length,
        pagine,
        via_ocr: viaOcr,
        tempo_ms: tempoMs,
      })
    );

    // Fire-and-forget per metadati Haiku — NON awaitare per non bloccare la response
    avviaSuggerimentoMetadati(documentoId, userToken).catch((err) => {
      console.log(
        JSON.stringify({
          evento: "suggest_metadata_dispatch_error",
          documento_id: documentoId,
          errore: err.message,
        })
      );
    });

    return new Response(
      JSON.stringify({
        ok: true,
        documento_id: documentoId,
        testo_estratto_chars: testoEstratto.length,
        chunks: records.length,
        pagine,
        via_ocr: viaOcr,
        verificato: true,
        verificato_auto: true,
        tempo_ms: tempoMs,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    const messaggio = err.message ?? "Errore sconosciuto";

    console.log(
      JSON.stringify({
        evento: "archivio_errore",
        documento_id: documentoId,
        errore: messaggio,
        tempo_ms: Date.now() - startTime,
      })
    );

    if (documentoId) {
      try {
        const metadatiErrore = await mergeMetadati(documentoId, {
          errore: messaggio.slice(0, 500),
          errore_at: new Date().toISOString(),
        });
        await aggiornaDocumento(documentoId, {
          ocr_status: "failed",
          metadati: metadatiErrore,
        });
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({ ok: false, error: messaggio }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
