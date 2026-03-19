const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const functionUrl = `${supabaseUrl}/functions/v1/admin-auth`
const storageKey = 'admin_auth_session'

if (!supabaseUrl || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).',
  )
}

const parseResponse = async (response) => {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : 'Request failed'
    throw new Error(message)
  }
  return body
}

const callAdminAuth = async (action, payload = {}, accessToken) => {
  const headers = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  })

  return parseResponse(response)
}

export const getStoredSession = () => {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

export const persistSession = (session) => {
  localStorage.setItem(storageKey, JSON.stringify(session))
}

export const clearSession = () => {
  localStorage.removeItem(storageKey)
}

export const adminLogin = async ({ email, password }) => {
  return callAdminAuth('login', { email, password })
}

export const adminMe = async ({ accessToken }) => {
  return callAdminAuth('me', {}, accessToken)
}

export const adminLogout = async ({ accessToken }) => {
  return callAdminAuth('logout', {}, accessToken)
}
