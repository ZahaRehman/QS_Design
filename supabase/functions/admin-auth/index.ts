// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type JsonRecord = Record<string, unknown>

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: JsonRecord) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.',
  )
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const sanitizeUser = (user: { id: string; email?: string | null }) => ({
  id: user.id,
  email: user.email ?? null,
})

const isAdminUser = async (userId: string) => {
  const { data, error } = await serviceClient.rpc('is_admin', {
    check_user_id: userId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data === true)
}

const getAccessToken = (request: Request): string | null => {
  const auth = request.headers.get('Authorization')
  if (!auth) return null
  if (!auth.startsWith('Bearer ')) return null
  return auth.replace('Bearer ', '').trim()
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const payload = (await request.json().catch(() => ({}))) as JsonRecord
  const action = typeof payload.action === 'string' ? payload.action : ''

  if (!action) {
    return json(400, { error: 'Missing action' })
  }

  try {
    if (action === 'login') {
      const email = typeof payload.email === 'string' ? payload.email : ''
      const password = typeof payload.password === 'string' ? payload.password : ''
      if (!email || !password) {
        return json(400, { error: 'Email and password are required' })
      }

      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.session || !data.user) {
        return json(401, { error: error?.message ?? 'Invalid credentials' })
      }

      const allowed = await isAdminUser(data.user.id)
      if (!allowed) {
        return json(403, { error: 'Admin access required' })
      }

      return json(200, {
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
        user: sanitizeUser(data.user),
      })
    }

    if (action === 'me') {
      const accessToken =
        getAccessToken(request) ||
        (typeof payload.accessToken === 'string' ? payload.accessToken : null)

      if (!accessToken) {
        return json(401, { error: 'Missing access token' })
      }

      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data, error } = await authClient.auth.getUser(accessToken)
      if (error || !data.user) {
        return json(401, { error: error?.message ?? 'Invalid session' })
      }

      const allowed = await isAdminUser(data.user.id)
      if (!allowed) {
        return json(403, { error: 'Admin access required' })
      }

      return json(200, { user: sanitizeUser(data.user) })
    }

    if (action === 'logout') {
      const accessToken =
        getAccessToken(request) ||
        (typeof payload.accessToken === 'string' ? payload.accessToken : null)

      if (!accessToken) {
        return json(200, { ok: true })
      }

      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { error } = await authClient.auth.signOut()
      if (error) {
        return json(400, { error: error.message })
      }

      return json(200, { ok: true })
    }

    return json(400, { error: 'Unsupported action' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return json(500, { error: message })
  }
})
