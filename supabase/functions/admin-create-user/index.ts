// Edge Function : crée un compte gestionnaire directement (email + mot de passe),
// sans envoi d'email. L'inscription publique étant désactivée (voir README), c'est
// le seul moyen d'ajouter un compte. Tourne côté serveur car elle a besoin de la
// clé service_role. Vérifie elle-même que l'appelant est bien "admin".
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
    const { email, password, nom, prenom, telephone, role } = await req.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return json({ error: 'email invalide' }, 400)
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return json({ error: 'le mot de passe doit faire au moins 6 caractères' }, 400)
    }
    if (!nom || !prenom) {
      return json({ error: 'nom et prénom obligatoires' }, 400)
    }
    const roleFinal = role === 'admin' ? 'admin' : 'gestionnaire'

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
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nom, prenom, telephone: telephone ?? '' },
    })
    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'création impossible' }, 500)
    }

    // Le trigger handle_new_user a créé le profil ; on force le rôle et le tél.
    const { error: updErr } = await adminClient
      .from('profiles')
      .update({ role: roleFinal, telephone: telephone || null })
      .eq('id', created.user.id)
    if (updErr) return json({ error: updErr.message }, 500)

    return json({ ok: true, userId: created.user.id })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
