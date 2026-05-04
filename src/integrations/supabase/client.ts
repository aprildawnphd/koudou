import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

// Koudou shares the Supabase project with the legacy Lovable build.
// Field-name mapping the UI applies on top of the live schema:
//   jobs.title       → role
//   jobs.urgency     → priority (low | medium | high)
//   jobs.fit_score   → match score (0–5)
//   jobs.applied_date → "applied N days ago" / due-date display
//   jobs.company is a free-text string, not an FK to target_companies.
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})
