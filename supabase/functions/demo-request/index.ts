// supabase/functions/demo-request/index.ts
// Edge Function: gestione richiesta demo qualificata
// Deploy: supabase functions deploy demo-request

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DemoPayload {
  name: string
  email: string
  studio: string
  phone?: string
  avvocati?: number       // numero avvocati nello studio
  interessi?: string[]    // ['gestionale', 'banca_dati', 'entrambi']
  note?: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: DemoPayload = await req.json()

    if (!payload.name || !payload.email || !payload.studio) {
      return new Response(
        JSON.stringify({ error: 'Campi obbligatori mancanti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Salva richiesta demo con dettagli qualificazione
    const { error: dbError } = await supabase
      .from('demo_requests')
      .insert({
        name:       payload.name,
        email:      payload.email,
        studio:     payload.studio,
        phone:      payload.phone ?? null,
        avvocati:   payload.avvocati ?? null,
        interessi:  payload.interessi ?? [],
        note:       payload.note ?? null,
        status:     'pending',
        created_at: new Date().toISOString(),
      })

    if (dbError) throw dbError

    // TODO: trigger notifica Slack / email al sales team
    // await notifySalesTeam(payload)

    // TODO: inviare email di conferma all'utente
    // await sendConfirmationEmail(payload.email, payload.name)

    return new Response(
      JSON.stringify({ success: true, message: 'Richiesta demo registrata con successo' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('demo-request error:', err)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
