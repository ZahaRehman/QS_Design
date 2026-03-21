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
const cloudinaryCloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME') ?? ''
const cloudinaryApiKey = Deno.env.get('CLOUDINARY_API_KEY') ?? ''
const cloudinaryApiSecret = Deno.env.get('CLOUDINARY_API_SECRET') ?? ''
const cloudinaryUploadFolder = Deno.env.get('CLOUDINARY_UPLOAD_FOLDER') ?? 'products'

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.',
  )
}

if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
  throw new Error(
    'Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET in Edge Function secrets.',
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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const sha1Hex = async (value: string) => {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-1', data)
  return [...new Uint8Array(digest)]
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('')
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
  if (!isAdmin) {
    return { error: 'Admin access required', status: 403 as const }
  }

  return { userId: userData.user.id, status: 200 as const }
}

const MAX_CANVAS_SIZES = 20

/** Normalizes payload.canvasSizes to DB jsonb: [{ id, label, price_cents }] */
const parseCanvasSizes = (
  payload: JsonRecord,
): { ok: true; value: JsonRecord[] } | { ok: false; error: string } => {
  const raw = payload.canvasSizes
  if (raw == null) return { ok: false, error: 'canvasSizes is required' }
  if (!Array.isArray(raw)) return { ok: false, error: 'canvasSizes must be an array' }
  if (raw.length > MAX_CANVAS_SIZES) {
    return { ok: false, error: `At most ${MAX_CANVAS_SIZES} canvas sizes allowed` }
  }
  const seenIds = new Set<string>()
  const seenLabels = new Set<string>()
  const out: JsonRecord[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid canvas size entry' }
    }
    const rec = item as JsonRecord
    const id = typeof rec.id === 'string' ? rec.id.trim() : ''
    const label = typeof rec.label === 'string' ? rec.label.trim() : ''
    const priceRaw = rec.price_cents ?? rec.priceCents
    const priceCents = Number(priceRaw)
    if (!id) return { ok: false, error: 'Each canvas size must have a non-empty id' }
    if (!label) return { ok: false, error: 'Each canvas size must have a non-empty label' }
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      return { ok: false, error: 'Each canvas size must have a valid price (integer cents >= 0)' }
    }
    if (seenIds.has(id)) return { ok: false, error: 'Duplicate canvas size id' }
    const labelKey = label.toLowerCase()
    if (seenLabels.has(labelKey)) return { ok: false, error: 'Duplicate canvas size label' }
    seenIds.add(id)
    seenLabels.add(labelKey)
    out.push({ id, label, price_cents: priceCents })
  }
  if (out.length === 0) {
    return { ok: false, error: 'At least one canvas size with label and price is required' }
  }
  return { ok: true, value: out }
}

const productSelectWithRelations =
  'id,name,slug,description,currency,is_active,created_at,canvas_sizes,product_categories(category_id,categories(id,name,slug)),product_images(id,image_url,cloudinary_public_id,alt_text,sort_order)'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const payload = (await request.json().catch(() => ({}))) as JsonRecord
  const action = typeof payload.action === 'string' ? payload.action : ''

  const auth = await requireAdmin(request)
  if (!('userId' in auth)) {
    return json(auth.status, { error: auth.error })
  }

  try {
    if (action === 'list-categories') {
      const { data, error } = await serviceClient
        .from('categories')
        .select('id,name,slug,description,is_active,created_at')
        .order('name')
      if (error) return json(400, { error: error.message })
      return json(200, { categories: data ?? [] })
    }

    if (action === 'create-category') {
      const name = typeof payload.name === 'string' ? payload.name.trim() : ''
      const description =
        typeof payload.description === 'string' ? payload.description.trim() : null

      if (!name) return json(400, { error: 'Category name is required' })
      const slug =
        typeof payload.slug === 'string' && payload.slug.trim()
          ? slugify(payload.slug)
          : slugify(name)

      const { data, error } = await serviceClient
        .from('categories')
        .insert({ name, slug, description })
        .select('id,name,slug,description,is_active,created_at')
        .single()

      if (error) return json(400, { error: error.message })
      return json(200, { category: data })
    }

    if (action === 'delete-category') {
      const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId : ''
      if (!categoryId) return json(400, { error: 'categoryId is required' })

      const { error: updateError } = await serviceClient
        .from('categories')
        .update({ is_active: false })
        .eq('id', categoryId)
      if (updateError) return json(400, { error: updateError.message })
      return json(200, { ok: true })
    }

    if (action === 'reactivate-category') {
      const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId : ''
      if (!categoryId) return json(400, { error: 'categoryId is required' })

      const { error: updateError } = await serviceClient
        .from('categories')
        .update({ is_active: true })
        .eq('id', categoryId)
      if (updateError) return json(400, { error: updateError.message })
      return json(200, { ok: true })
    }

    if (action === 'list-products') {
      const { data, error } = await serviceClient
        .from('products')
        .select(productSelectWithRelations)
        .order('created_at', { ascending: false })

      if (error) return json(400, { error: error.message })
      return json(200, { products: data ?? [] })
    }

    if (action === 'create-product') {
      const name = typeof payload.name === 'string' ? payload.name.trim() : ''
      const description =
        typeof payload.description === 'string' ? payload.description.trim() : null
      const currency =
        typeof payload.currency === 'string' && payload.currency.trim()
          ? payload.currency.trim().toUpperCase()
          : 'USD'
      const categoryIds = Array.isArray(payload.categoryIds) ? payload.categoryIds : []
      const images = Array.isArray(payload.images) ? payload.images : []

      if (!name) return json(400, { error: 'Product name is required' })
      if (images.length > 10) {
        return json(400, { error: 'A product can have at most 10 images' })
      }

      const canvasParsed = parseCanvasSizes(payload)
      if (!canvasParsed.ok) return json(400, { error: canvasParsed.error })

      const slug =
        typeof payload.slug === 'string' && payload.slug.trim()
          ? slugify(payload.slug)
          : slugify(name)

      const { data: createdProduct, error: productError } = await serviceClient
        .from('products')
        .insert({
          name,
          slug,
          description,
          currency,
          canvas_sizes: canvasParsed.value,
          created_by: auth.userId,
        })
        .select(productSelectWithRelations)
        .single()

      if (productError) return json(400, { error: productError.message })

      if (categoryIds.length > 0) {
        const rows = categoryIds.map((categoryId: string) => ({
          product_id: createdProduct.id,
          category_id: categoryId,
        }))
        const { error: relError } = await serviceClient.from('product_categories').insert(rows)
        if (relError) return json(400, { error: relError.message })
      }

      if (images.length > 0) {
        const rows = images.map((image: JsonRecord, index: number) => ({
          product_id: createdProduct.id,
          image_url: String(image.url ?? ''),
          cloudinary_public_id:
            image.publicId == null ? null : String(image.publicId),
          alt_text: image.altText == null ? null : String(image.altText),
          sort_order: Number.isInteger(image.sortOrder) ? Number(image.sortOrder) : index,
        }))
        const { error: imageError } = await serviceClient.from('product_images').insert(rows)
        if (imageError) return json(400, { error: imageError.message })
      }

      return json(200, { product: createdProduct })
    }

    if (action === 'delete-product') {
      const productId = typeof payload.productId === 'string' ? payload.productId : ''
      if (!productId) return json(400, { error: 'productId is required' })

      const { error: updateError } = await serviceClient
        .from('products')
        .update({ is_active: false })
        .eq('id', productId)
      if (updateError) return json(400, { error: updateError.message })
      return json(200, { ok: true })
    }

    if (action === 'reactivate-product') {
      const productId = typeof payload.productId === 'string' ? payload.productId : ''
      if (!productId) return json(400, { error: 'productId is required' })

      const { error: updateError } = await serviceClient
        .from('products')
        .update({ is_active: true })
        .eq('id', productId)
      if (updateError) return json(400, { error: updateError.message })
      return json(200, { ok: true })
    }

    if (action === 'update-product') {
      const productId = typeof payload.productId === 'string' ? payload.productId : ''
      if (!productId) return json(400, { error: 'productId is required' })

      const name = typeof payload.name === 'string' ? payload.name.trim() : ''
      const description =
        typeof payload.description === 'string' ? payload.description.trim() : null
      const currency =
        typeof payload.currency === 'string' && payload.currency.trim()
          ? payload.currency.trim().toUpperCase()
          : 'USD'
      const categoryIds = Array.isArray(payload.categoryIds) ? payload.categoryIds : []
      const imagesToAdd = Array.isArray(payload.imagesToAdd) ? payload.imagesToAdd : []
      const imageIdsToRemove = Array.isArray(payload.imageIdsToRemove)
        ? payload.imageIdsToRemove
        : []

      if (!name) return json(400, { error: 'Product name is required' })

      const canvasParsed = parseCanvasSizes(payload)
      if (!canvasParsed.ok) return json(400, { error: canvasParsed.error })

      // Ensure we only process valid string inputs.
      const sanitizedCategoryIds = categoryIds.filter(
        (id) => typeof id === 'string' && id.trim(),
      )
      const uniqueImageIdsToRemove = [...new Set(imageIdsToRemove.filter((id) => typeof id === 'string' && id.trim()))]

      // Enforce "max 10 images total" (existing kept + newly added).
      const {
        data: existingImages,
        error: existingImagesError,
      } = await serviceClient
        .from('product_images')
        .select('id')
        .eq('product_id', productId)

      if (existingImagesError) return json(400, { error: existingImagesError.message })

      const existingIds = new Set((existingImages ?? []).map((img) => img.id))
      const removeIntersectionCount = uniqueImageIdsToRemove.filter((id) =>
        existingIds.has(id),
      ).length
      const keptCount = (existingImages?.length ?? 0) - removeIntersectionCount

      if (keptCount + imagesToAdd.length > 10) {
        return json(400, { error: 'A product can have at most 10 images' })
      }

      const slug = slugify(name)

      // 1) Update base product data (name, slug, description, currency, canvas sizes).
      const { error: productError } = await serviceClient
        .from('products')
        .update({
          name,
          slug,
          description,
          currency,
          canvas_sizes: canvasParsed.value,
        })
        .eq('id', productId)

      if (productError) return json(400, { error: productError.message })

      // 2) Replace product<->category links.
      const { error: categoriesClearError } = await serviceClient
        .from('product_categories')
        .delete()
        .eq('product_id', productId)

      if (categoriesClearError) {
        return json(400, { error: categoriesClearError.message })
      }

      if (sanitizedCategoryIds.length > 0) {
        const rows = sanitizedCategoryIds.map((categoryId: string) => ({
          product_id: productId,
          category_id: categoryId,
        }))

        const { error: relError } = await serviceClient
          .from('product_categories')
          .insert(rows)

        if (relError) return json(400, { error: relError.message })
      }

      // 3) Remove selected images, then append newly uploaded images.
      if (uniqueImageIdsToRemove.length > 0) {
        const { error: deleteImagesError } = await serviceClient
          .from('product_images')
          .delete()
          .in('id', uniqueImageIdsToRemove)

        if (deleteImagesError) return json(400, { error: deleteImagesError.message })
      }

      const { data: remainingImages, error: remainingImagesError } = await serviceClient
        .from('product_images')
        .select('id')
        .eq('product_id', productId)

      if (remainingImagesError) return json(400, { error: remainingImagesError.message })

      const baseSortOrder = remainingImages?.length ?? 0

      const sanitizedImagesToAdd = imagesToAdd.filter(
        (img) => img && typeof img === 'object' && typeof img.url === 'string' && img.url.trim(),
      ) as Array<JsonRecord>

      if (sanitizedImagesToAdd.length > 0) {
        const rows = sanitizedImagesToAdd.map((image: JsonRecord, index: number) => ({
          product_id: productId,
          image_url: String(image.url ?? ''),
          cloudinary_public_id:
            image.publicId == null ? null : String(image.publicId),
          alt_text: image.altText == null ? null : String(image.altText),
          sort_order: baseSortOrder + index,
        }))

        const { error: imageError } = await serviceClient.from('product_images').insert(rows)
        if (imageError) return json(400, { error: imageError.message })
      }

      const { data: updatedProduct, error: fetchError } = await serviceClient
        .from('products')
        .select(productSelectWithRelations)
        .eq('id', productId)
        .single()

      if (fetchError) return json(400, { error: fetchError.message })

      return json(200, { product: updatedProduct })
    }

    if (action === 'create-upload-signature') {
      const timestamp = Math.floor(Date.now() / 1000)
      const folder = `${cloudinaryUploadFolder}/${auth.userId}`
      const signatureBase = `folder=${folder}&timestamp=${timestamp}${cloudinaryApiSecret}`
      const signature = await sha1Hex(signatureBase)

      return json(200, {
        cloudName: cloudinaryCloudName,
        apiKey: cloudinaryApiKey,
        timestamp,
        folder,
        signature,
      })
    }

    return json(400, { error: 'Unsupported action' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return json(500, { error: message })
  }
})
