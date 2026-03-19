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
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.')
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const payloadToJson = async (request: Request): Promise<JsonRecord> =>
  (await request.json().catch(() => ({}))) as JsonRecord

const clampString = (v: unknown, maxLen: number) => {
  if (typeof v !== 'string') return ''
  const s = v.trim()
  if (s.length > maxLen) return s.slice(0, maxLen)
  return s
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const payload = await payloadToJson(request)
  const action = typeof payload.action === 'string' ? payload.action : ''

  if (!action) {
    return json(400, { error: 'Missing action' })
  }

  try {
    if (action === 'create-order') {
      const cartItems = Array.isArray(payload.cartItems) ? payload.cartItems : []
      if (cartItems.length === 0) {
        return json(400, { error: 'Cart is empty' })
      }

      const customerName = clampString(payload.customerName, 120)
      const customerEmail = clampString(payload.customerEmail, 200)
      const customerPhone = clampString(payload.customerPhone, 40)
      const address1 = clampString(payload.address1, 200)
      const address2 = clampString(payload.address2, 200)
      const city = clampString(payload.city, 120)
      const state = clampString(payload.state, 120)
      const postalCode = clampString(payload.postalCode, 30)
      const country = clampString(payload.country, 120) || 'US'
      const notes = typeof payload.notes === 'string' ? payload.notes.trim() : null

      if (!customerName) return json(400, { error: 'customerName is required' })
      if (!address1) return json(400, { error: 'address1 is required' })
      if (!city) return json(400, { error: 'city is required' })
      if (!postalCode) return json(400, { error: 'postalCode is required' })

      const normalizedItems = cartItems
        .map((item) => {
          const productId = typeof item?.productId === 'string' ? item.productId : null
          const qty = Number(item?.qty)
          const snapshot = item?.snapshot

          const priceCents = Number(snapshot?.priceCents)
          const currency = typeof snapshot?.currency === 'string' ? snapshot.currency : 'USD'
          const name = clampString(snapshot?.name, 200)
          const imageUrl = typeof snapshot?.imageUrl === 'string' ? snapshot.imageUrl : null

          const unitPriceCents = Number.isFinite(priceCents) ? Math.round(priceCents) : 0
          const safeQty = Number.isFinite(qty) ? Math.floor(qty) : 0

          if (!name || safeQty <= 0 || unitPriceCents < 0) return null

          return {
            productId,
            qty: safeQty,
            snapshot: {
              name,
              imageUrl,
              priceCents: unitPriceCents,
              currency,
            },
          }
        })
        .filter(Boolean)

      if (normalizedItems.length === 0) {
        return json(400, { error: 'Invalid cart items' })
      }

      const currency = String(normalizedItems[0].snapshot.currency ?? 'USD').toUpperCase()
      const mismatch = normalizedItems.some(
        (it) => String(it.snapshot.currency ?? 'USD').toUpperCase() !== currency,
      )
      if (mismatch) {
        return json(400, { error: 'All cart items must have the same currency' })
      }

      const subtotalCents = normalizedItems.reduce(
        (sum, it) => sum + it.qty * it.snapshot.priceCents,
        0,
      )

      const orderTotalCents = subtotalCents // COD only for now; no shipping/tax yet.

      const { data: createdOrder, error: orderError } = await serviceClient
        .from('orders')
        .insert({
          status: 'pending',
          payment_method: 'COD',
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          shipping_address1: address1,
          shipping_address2: address2 || null,
          shipping_city: city,
          shipping_state: state || null,
          shipping_postal_code: postalCode,
          shipping_country: country || 'US',
          notes: notes ?? null,
          currency,
          subtotal_cents: subtotalCents,
          tax_cents: 0,
          shipping_cents: 0,
          total_cents: orderTotalCents,
        })
        .select('id,status,total_cents,currency,created_at')
        .single()

      if (orderError || !createdOrder) {
        return json(400, { error: orderError?.message ?? 'Failed to create order' })
      }

      const orderId = createdOrder.id
      const itemRows = normalizedItems.map((it) => ({
        order_id: orderId,
        product_id: it.productId,
        name_snapshot: it.snapshot.name,
        image_url_snapshot: it.snapshot.imageUrl,
        unit_price_cents: it.snapshot.priceCents,
        qty: it.qty,
        line_total_cents: it.qty * it.snapshot.priceCents,
      }))

      const { error: itemsError } = await serviceClient.from('order_items').insert(itemRows)
      if (itemsError) {
        return json(400, { error: itemsError.message })
      }

      return json(200, {
        order: createdOrder,
        itemsCreated: normalizedItems.length,
      })
    }

    return json(400, { error: 'Unsupported action' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return json(500, { error: message })
  }
})

