const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const functionUrl = `${supabaseUrl}/functions/v1/store-catalog`

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.')
}

const parseResponse = async (response) => {
  const text = await response.text().catch(() => '')
  let body = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { error: text || 'Non-JSON response' }
  }

  if (!response.ok) {
    const msg =
      typeof body?.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}`
    throw new Error(msg)
  }

  return body
}

const callCatalog = async ({ action, payload = {} }) => {
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({ action, ...payload }),
  })
  return parseResponse(response)
}

export const listProducts = () => callCatalog({ action: 'list-products' })

export const listCategories = () => callCatalog({ action: 'list-categories' })

export const listProductsByCategory = ({ categoryId }) =>
  callCatalog({
    action: 'list-products-by-category',
    payload: { categoryId },
  })

export const getProduct = ({ productId }) =>
  callCatalog({ action: 'get-product', payload: { productId } })

