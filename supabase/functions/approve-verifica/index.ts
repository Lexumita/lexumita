// 07-10-2026 (controllo di sicurezza): le azioni admin vogliono la verifica in due passaggi completata (aal2).
// supabase/functions/approve-verifica/index.ts
//
// Approva la verifica identità di un professionista.
// NON cambia il ruolo: l'utente resta 'user' (vista area personale) finché
// non attiva un prodotto. Il ruolo (avvocato|commercialista, derivato da
// profiles.tipo_richiesta) viene assegnato all'attivazione del piano da
// stripe-webhook / activate-trial / admin-attiva-prodotto.
// 05-11-2026: se un rifiuto aveva fermato la prova, l'approvazione la fa ripartire
// (riprendi_prova_gratuita, che spedisce anche la mail della prova).
//
// 02-10-2026: l'email di approvazione passa da send-mail (Mail Log, mittente
// del progetto). Prima chiamava Postmark con l'alias «verifica-approvata», che
// non esiste (il modello «Account approvato» ha alias «approve-verifica»):
// l'email non partiva e nessuno se ne accorgeva.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// «angela» → «Angela» nel saluto della mail: solo se il nome è tutto minuscolo, altrimenti resta com'è.
function nomeBello(nome: string | null | undefined): string {
  const n = (nome ?? "").trim();
  if (!n || n !== n.toLowerCase()) return n;
  return n.replace(/(^|[\s'’-])(\p{L})/gu, (_m, prima, lettera) => prima + lettera.toUpperCase());
}

// Il livello della sessione dal token (già verificato da getUser): «aal1» o «aal2».
function livelloDelToken(token: string): string {
  try {
    const parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(parte.padEnd(Math.ceil(parte.length / 4) * 4, "=")));
    return typeof payload.aal === "string" ? payload.aal : "aal1";
  } catch {
    return "aal1";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorizzato");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Token non valido");

    const { data: admin } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (admin?.role !== "admin") throw new Error("Accesso negato");
    if (livelloDelToken(authHeader.replace("Bearer ", "")) !== "aal2") {
      return new Response(
        JSON.stringify({ ok: false, error: "Serve la verifica in due passaggi" }),
        { status: 403, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id obbligatorio");

    const { data: profilo, error: profErr } = await supabase
      .from("profiles")
      .select("email, nome, tipo_richiesta")
      .eq("id", user_id)
      .single();

    if (profErr || !profilo) throw new Error("Utente da approvare non trovato");

    const { error } = await supabase
      .from("profiles")
      // 27-10-2026: via l'eventuale motivo di un rifiuto precedente, che il Profilo mostrerebbe ancora
      .update({ verification_status: "approved", verification_note: null })
      .eq("id", user_id);

    if (error) throw new Error(error.message);

    // L'approvazione vale anche se la prova non riparte: in quel caso all'utente resta il pulsante.
    const { data: provaRipartita, error: provaErr } = await supabase.rpc("riprendi_prova_gratuita", { p_user: user_id });
    if (provaErr) console.error("riprendi_prova_gratuita:", provaErr.message);

    // Email approvazione
    if (profilo?.email) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-mail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            to:            profilo.email,
            templateAlias: "approve-verifica",
            templateModel: {
              nome:    nomeBello(profilo.nome),
              app_url: Deno.env.get("APP_URL"),
            },
            tipo:     "verifica_approvata",
            origine:  "approve-verifica",
            toUserId: user_id,
          }),
        });
      } catch (e) {
        console.error("send-mail error:", e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, prova_ripartita: provaRipartita === true }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
