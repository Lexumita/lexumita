// supabase/functions/contact-form/index.ts
// Edge Function: gestione form contatti / richiesta demo
// Deploy: supabase functions deploy contact-form

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContactPayload {
  name: string
  email: string
  studio?: string
  phone?: string
  message: string
  type: 'demo' | 'info' | 'pricing' | 'support'
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: ContactPayload = await req.json()

    // Validazione base
    if (!payload.name || !payload.email || !payload.message) {
      return new Response(
        JSON.stringify({ error: 'Campi obbligatori mancanti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase client con service_role (server-side)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Salva in DB
    const { error: dbError } = await supabase
      .from('contact_requests')
      .insert({
        name:    payload.name,
        email:   payload.email,
        studio:  payload.studio ?? null,
        phone:   payload.phone ?? null,
        message: payload.message,
        type:    payload.type,
        status:  'new',
      })

    if (dbError) throw dbError

    // TODO: inviare email di notifica (Resend / SendGrid)
    // await sendNotificationEmail(payload)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('contact-form error:', err)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
