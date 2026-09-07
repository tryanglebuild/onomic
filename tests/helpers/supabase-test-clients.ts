import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name} in .env.test.local — run 'supabase status' to get it`)
  }
  return value
}

export function adminClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
}

export async function createTestUser(email: string, password: string) {
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  return data.user
}

export async function signInAsTestUser(email: string, password: string) {
  const client = createSupabaseClient<Database>(SUPABASE_URL, requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

export async function deleteTestUser(userId: string) {
  await adminClient().auth.admin.deleteUser(userId)
}
