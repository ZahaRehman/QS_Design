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

type CartLine = {
  productId: string
  qty: number
  snapshot: {
    name: string
    imageUrl: string | null
    priceCents: number
    currency: string
    canvasSizeId: string | null
    canvasSizeLabel: string | null
  }
  canvas_size_id: string | null
  canvas_size_label: string | null
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

      const parsedItems = cartItems
        .map((item) => {
          const productId = typeof item?.productId === 'string' ? item.productId.trim() : ''
          const qty = Number(item?.qty)
          const snapshot = item?.snapshot

          const priceCents = Number(snapshot?.priceCents)
          const currency = typeof snapshot?.currency === 'string' ? snapshot.currency : 'USD'
          const name = clampString(snapshot?.name, 200)
          const imageUrl = typeof snapshot?.imageUrl === 'string' ? snapshot.imageUrl : null
          const canvasSizeIdRaw =
            typeof snapshot?.canvasSizeId === 'string' ? snapshot.canvasSizeId.trim() : ''
          const canvasSizeLabel = clampString(snapshot?.canvasSizeLabel, 200) || null

          const unitPriceCents = Number.isFinite(priceCents) ? Math.round(priceCents) : 0
          const safeQty = Number.isFinite(qty) ? Math.floor(qty) : 0

          if (!productId || !name || safeQty <= 0 || unitPriceCents < 0) return null

          return {
            productId,
            qty: safeQty,
            clientPriceCents: unitPriceCents,
            snapshot: {
              name,
              imageUrl,
              priceCents: unitPriceCents,
              currency,
              canvasSizeId: canvasSizeIdRaw || null,
              canvasSizeLabel,
            },
          }
        })
        .filter(Boolean) as Array<{
        productId: string
        qty: number
        clientPriceCents: number
        snapshot: CartLine['snapshot']
      }>

      if (parsedItems.length === 0) {
        return json(400, { error: 'Invalid cart items' })
      }

      const productIds = [...new Set(parsedItems.map((it) => it.productId))]
      const { data: dbProducts, error: productsError } = await serviceClient
        .from('products')
        .select('id,currency,canvas_sizes,is_active')
        .in('id', productIds)

      if (productsError) {
        return json(400, { error: productsError.message })
      }

      const productMap = new Map((dbProducts ?? []).map((p) => [p.id, p]))

      const normalizedItems: CartLine[] = []

      for (const it of parsedItems) {
        const p = productMap.get(it.productId)
        if (!p || !p.is_active) {
          return json(400, { error: 'Invalid or inactive product in cart' })
        }

        const prodCurrency = String(p.currency ?? 'USD').toUpperCase()
        const clientCurrency = String(it.snapshot.currency ?? 'USD').toUpperCase()
        if (clientCurrency !== prodCurrency) {
          return json(400, { error: 'Currency mismatch for a product in cart' })
        }

        const sizes = Array.isArray(p.canvas_sizes) ? p.canvas_sizes : []
        if (sizes.length === 0) {
          return json(400, { error: 'Product has no canvas sizes configured' })
        }

        const sid = it.snapshot.canvasSizeId
        if (!sid) {
          return json(400, { error: 'Canvas size is required for this product' })
        }
        const entry = sizes.find(
          (s: JsonRecord) => s && typeof s === 'object' && typeof s.id === 'string' && s.id === sid,
        ) as JsonRecord | undefined
        if (!entry) {
          return json(400, { error: 'Invalid canvas size for product' })
        }
        const entryPrice = Math.round(Number(entry.price_cents))
        if (!Number.isInteger(entryPrice) || entryPrice < 0) {
          return json(400, { error: 'Invalid canvas size price' })
        }
        if (it.clientPriceCents !== entryPrice) {
          return json(400, { error: 'Price does not match selected canvas size' })
        }
        const unitPriceCents = entryPrice
        const canvas_size_id = sid
        const lbl = typeof entry.label === 'string' ? entry.label.trim() : ''
        const canvas_size_label = lbl ? lbl.slice(0, 200) : null

        normalizedItems.push({
          productId: it.productId,
          qty: it.qty,
          snapshot: {
            name: it.snapshot.name,
            imageUrl: it.snapshot.imageUrl,
            priceCents: unitPriceCents,
            currency: prodCurrency,
            canvasSizeId: canvas_size_id,
            canvasSizeLabel: canvas_size_label,
          },
          canvas_size_id,
          canvas_size_label,
        })
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

      const FREE_SHIPPING_THRESHOLD_CENTS = 5000 * 100
      const SHIPPING_CHARGE_CENTS = 250 * 100
      const shippingCents =
        subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_CHARGE_CENTS
      const orderTotalCents = subtotalCents + shippingCents

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
          shipping_cents: shippingCents,
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
        canvas_size_id: it.canvas_size_id,
        canvas_size_label: it.canvas_size_label,
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

