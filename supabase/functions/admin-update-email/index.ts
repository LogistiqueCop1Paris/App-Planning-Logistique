// Edge Function : change l'email de connexion d'un compte, sans flux de
// confirmation. Tourne côté serveur (clé service_role). Vérifie que l'appelant
// est "admin". Met aussi à jour profiles.email pour rester synchronisé.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, newEmail } = await req.json()
    if (!userId || typeof userId !== 'string') {
      return json({ error: 'userId manquant' }, 400)
    }
    if (!newEmail || typeof newEmail !== 'string' || !newEmail.includes('@')) {
      return json({ error: 'email invalide' }, 400)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'non authentifié' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'session invalide' }, 401)

    const { data: profile, error: profileError } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()
    if (profileError || profile?.role !== 'admin') {
      return json({ error: 'action réservée aux admins' }, 403)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    })
    if (updateError) return json({ error: updateError.message }, 500)

    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', userId)
    if (profileUpdateError) return json({ error: profileUpdateError.message }, 500)

    return json({ ok: true })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
