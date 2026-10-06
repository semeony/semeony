import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
let validSupabaseUrl = false

if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl)
    validSupabaseUrl =
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
  } catch {
    validSupabaseUrl = false
  }
}

export const supabaseConfigured = Boolean(validSupabaseUrl && supabaseAnonKey)

export const supabase =
  supabaseUrl && supabaseAnonKey && validSupabaseUrl
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null
