import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

// Cache the client on globalThis so HMR re-evaluations of this module don't
// spawn a fresh GoTrueClient each time (which logs a "Multiple GoTrueClient
// instances detected" warning in dev). Production builds skip this branch
// because no module re-evaluation happens after initial load.
type Cached = { __koudou_supabase?: SupabaseClient<Database> }
const g = globalThis as unknown as Cached

export const supabase: SupabaseClient<Database> =
  g.__koudou_supabase ??
  (g.__koudou_supabase = createClient<Database>(url, anonKey, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }))
