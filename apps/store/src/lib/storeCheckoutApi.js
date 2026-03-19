const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const functionUrl = `${supabaseUrl}/functions/v1/store-checkout`

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL env var.')
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
    const msg = typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`
    throw new Error(msg)
  }

  return body
}

export const createOrder = ({ customer, cartItems }) =>
  (async () => {
    if (!anonKey) {
      // anonKey isn't strictly needed, but supabase edge functions may expect apikey.
      // We'll still send Content-Type, and the server can handle it.
    }

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anonKey ? { apikey: anonKey } : {}),
      },
      body: JSON.stringify({
        action: 'create-order',
        customerName: customer?.name,
        customerEmail: customer?.email,
        customerPhone: customer?.phone,
        address1: customer?.address1,
        address2: customer?.address2,
        city: customer?.city,
        state: customer?.state,
        postalCode: customer?.postalCode,
        country: customer?.country,
        notes: customer?.notes,
        cartItems,
      }),
    })

    return parseResponse(response)
  })()

