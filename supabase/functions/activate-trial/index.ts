// supabase/functions/activate-trial/index.ts
//
// Il pulsante «Attiva la prova gratuita» per chi era già iscritto. Dal 03-11-2026 la logica sta nel database, in
// attiva_prova_gratuita, la stessa che parte da sola quando chi si registra come avvocato conferma
// l'email: controlli, ruolo, studio, crediti, transazione e mail. Prima questa funzione non creava lo studio e
// voleva la verifica approvata, che in Italia per i piani non serve più.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const risposta = (corpo: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
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

    const { data: scadenza, error } = await supabase.rpc("attiva_prova_gratuita", {
      p_user: user.id,
      p_automatica: false,
    });
    if (error) {
      console.error("attiva_prova_gratuita:", error.code, error.message);
      // P0001 = i rifiuti scritti nella funzione, in italiano. Il resto non si mostra all'utente.
      throw new Error(error.code === "P0001"
        ? error.message
        : "Non è stato possibile attivare la prova: riprova o scrivi all'assistenza.");
    }

    return risposta({ ok: true, scadenza });
  } catch (err) {
    console.error("activate-trial error:", (err as Error).message);
    return risposta({ ok: false, error: (err as Error).message }, 400);
  }
});
