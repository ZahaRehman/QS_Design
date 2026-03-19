import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const loadEnvFromFile = (filePath) => {
  if (!existsSync(filePath)) return

  const raw = readFileSync(filePath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

// Load admin app env as fallback for local convenience.
loadEnvFromFile(resolve(process.cwd(), 'apps/admin/.env'))

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.ADMIN_EMAIL || 'sadia@gmail.com'
const adminPassword = process.env.ADMIN_PASSWORD

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing Supabase admin credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  )
  process.exit(1)
}

if (!adminPassword) {
  console.error('Missing ADMIN_PASSWORD. Example: ADMIN_PASSWORD="SecurePassword123#"')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const findUserByEmail = async (email) => {
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) throw error

    const users = data?.users ?? []
    const found = users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (users.length < perPage) return null
    page += 1
  }
}

const ensureAdmin = async () => {
  const existingUser = await findUserByEmail(adminEmail)
  let userId = ''

  if (existingUser) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password: adminPassword,
      email_confirm: true,
      app_metadata: {
        ...(existingUser.app_metadata ?? {}),
        role: 'admin',
      },
    })
    if (error) throw error
    userId = existingUser.id
    console.log(`Updated existing admin user: ${adminEmail}`)
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      app_metadata: { role: 'admin' },
    })

    if (error) throw error
    userId = data.user?.id ?? ''
    console.log(`Created admin user: ${data.user?.email}`)
  }

  if (!userId) {
    throw new Error('Missing user id after admin upsert')
  }

  const { error: adminRowError } = await supabaseAdmin.from('admin_users').upsert({
    user_id: userId,
    is_active: true,
  })

  if (adminRowError) throw adminRowError
  console.log(`Upserted admin_users row for: ${adminEmail}`)
}

ensureAdmin()
  .then(() => {
    console.log('Admin seeding complete.')
  })
  .catch((error) => {
    console.error('Failed to seed admin:', error.message)
    process.exit(1)
  })
