const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const functionUrl = `${supabaseUrl}/functions/v1/admin-orders`

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.')
}

const parseResponse = async (response) => {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Request failed')
  }
  return body
}

const callOrders = async ({ action, accessToken, payload = {} }) => {
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action, ...payload }),
  })
  return parseResponse(response)
}

export const listOrders = ({ accessToken, status = 'all' }) =>
  callOrders({ action: 'list-orders', accessToken, payload: { status } })

export const updateOrderStatus = ({ accessToken, orderId, status }) =>
  callOrders({
    action: 'update-order-status',
    accessToken,
    payload: { orderId, status },
  })

