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
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.',
  )
}

// Using service role so the store can read active catalog items without relying on auth/RLS.
const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const getAction = (request: Request) => request
  .json()
  .catch(() => ({}))
  .then((payload) => (typeof payload?.action === 'string' ? payload.action : ''))

const payloadToJson = async (request: Request): Promise<JsonRecord> =>
  (await request.json().catch(() => ({}))) as JsonRecord

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
    const selectStr =
      'id,name,slug,description,currency,is_active,created_at,canvas_sizes,' +
      'product_categories(category_id,categories(id,name,slug)),' +
      'product_images(id,image_url,cloudinary_public_id,alt_text,sort_order)'

    if (action === 'list-products') {
      const { data, error } = await serviceClient
        .from('products')
        .select(selectStr)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) return json(400, { error: error.message })
      return json(200, { products: data ?? [] })
    }

    if (action === 'get-product') {
      const productId = typeof payload.productId === 'string' ? payload.productId : ''
      if (!productId) return json(400, { error: 'productId is required' })

      const { data, error } = await serviceClient
        .from('products')
        .select(selectStr)
        .eq('id', productId)
        .eq('is_active', true)
        .single()

      if (error) return json(400, { error: error.message })
      return json(200, { product: data })
    }

    if (action === 'list-categories') {
      const { data, error } = await serviceClient
        .from('categories')
        .select('id,name,slug,description,is_active,created_at')
        .order('name')

      if (error) return json(400, { error: error.message })
      return json(200, { categories: data ?? [] })
    }

    if (action === 'list-products-by-category') {
      const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId : ''
      if (!categoryId) return json(400, { error: 'categoryId is required' })

      const { data: relRows, error: relError } = await serviceClient
        .from('product_categories')
        .select('product_id')
        .eq('category_id', categoryId)

      if (relError) return json(400, { error: relError.message })

      const productIds = [...new Set((relRows ?? []).map((r) => r.product_id).filter(Boolean))]
      if (productIds.length === 0) return json(200, { products: [] })

      const { data, error } = await serviceClient
        .from('products')
        .select(selectStr)
        .eq('is_active', true)
        .in('id', productIds)
        .order('created_at', { ascending: false })

      if (error) return json(400, { error: error.message })
      return json(200, { products: data ?? [] })
    }

    return json(400, { error: 'Unsupported action' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return json(500, { error: message })
  }
})

