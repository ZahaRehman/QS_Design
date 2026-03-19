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

const authClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const getAccessToken = (request: Request): string | null => {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return null
  return auth.replace('Bearer ', '').trim()
}

const requireAdmin = async (request: Request) => {
  const token = getAccessToken(request)
  if (!token) return { error: 'Missing access token', status: 401 as const }

  const { data: userData, error: userError } = await authClient.auth.getUser(token)
  if (userError || !userData.user) {
    return { error: userError?.message ?? 'Invalid session', status: 401 as const }
  }

  const { data: isAdmin, error: adminError } = await serviceClient.rpc('is_admin', {
    check_user_id: userData.user.id,
  })
  if (adminError) {
    return { error: adminError.message, status: 500 as const }
  }
  if (!isAdmin) return { error: 'Admin access required', status: 403 as const }

  return { userId: userData.user.id, status: 200 as const }
}

const payloadToJson = async (request: Request): Promise<JsonRecord> =>
  (await request.json().catch(() => ({}))) as JsonRecord

const selectOrders =
  'id,status,payment_method,customer_name,customer_email,customer_phone,' +
  'shipping_address1,shipping_address2,shipping_city,shipping_state,shipping_postal_code,' +
  'shipping_country,notes,total_cents,subtotal_cents,tax_cents,shipping_cents,currency,' +
  'created_at,' +
  'order_items(id,product_id,qty,unit_price_cents,line_total_cents,name_snapshot,image_url_snapshot,created_at)'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const payload = await payloadToJson(request)
  const action = typeof payload.action === 'string' ? payload.action : ''

  if (!action) return json(400, { error: 'Missing action' })

  const auth = await requireAdmin(request)
  if (!('userId' in auth)) {
    return json(auth.status, { error: auth.error })
  }

  try {
    if (action === 'list-orders') {
      const statusRaw = typeof payload.status === 'string' ? payload.status : 'all'
      const status =
        statusRaw === 'pending' || statusRaw === 'shipped' || statusRaw === 'completed'
          ? statusRaw
          : 'all'

      let query = serviceClient.from('orders').select(selectOrders).order('created_at', { ascending: false })
      if (status !== 'all') query = query.eq('status', status)

      const { data, error } = await query
      if (error) return json(400, { error: error.message })
      return json(200, { orders: data ?? [] })
    }

    if (action === 'update-order-status') {
      const orderId = typeof payload.orderId === 'string' ? payload.orderId : ''
      const newStatusRaw = typeof payload.status === 'string' ? payload.status : ''
      const newStatus =
        newStatusRaw === 'pending' || newStatusRaw === 'shipped' || newStatusRaw === 'completed'
          ? newStatusRaw
          : ''

      if (!orderId) return json(400, { error: 'orderId is required' })
      if (!newStatus) return json(400, { error: 'Invalid status' })

      // Enforce transitions
      const { data: current, error: currentError } = await serviceClient
        .from('orders')
        .select('id,status')
        .eq('id', orderId)
        .single()

      if (currentError || !current) return json(400, { error: currentError?.message ?? 'Order not found' })

      const prevStatus = current.status
      const allowed =
        prevStatus === 'pending'
          ? newStatus === 'shipped' || newStatus === 'completed'
          : prevStatus === 'shipped'
            ? newStatus === 'completed'
            : false

      if (!allowed) {
        return json(400, { error: `Cannot change status from ${prevStatus} to ${newStatus}` })
      }

      const { data: updated, error: updateError } = await serviceClient
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select(selectOrders)
        .single()

      if (updateError || !updated) {
        return json(400, { error: updateError?.message ?? 'Failed to update order' })
      }

      return json(200, { order: updated })
    }

    return json(400, { error: 'Unsupported action' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return json(500, { error: message })
  }
})

