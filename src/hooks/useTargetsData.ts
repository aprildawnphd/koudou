import { useQueries } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'

// Fetches target_companies + the jobs and contacts needed for per-row aggregation
// (jobs tracked, contacts, active apps). Pulls all rows once and counts client-side
// — fine at expected data sizes. If lists ever grow large, swap for a Supabase view.
export function useTargetsData() {
  const queries = useQueries({
    queries: [
      {
        queryKey: ['target_companies'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('target_companies')
            .select('*')
            .order('name', { ascending: true })
          if (error) throw error
          return (data ?? []) as Tables<'target_companies'>[]
        },
      },
      {
        queryKey: ['jobs'],
        queryFn: async () => {
          const { data, error } = await supabase.from('jobs').select('*')
          if (error) throw error
          return (data ?? []) as Tables<'jobs'>[]
        },
      },
      {
        queryKey: ['contacts'],
        queryFn: async () => {
          const { data, error } = await supabase.from('contacts').select('*')
          if (error) throw error
          return (data ?? []) as Tables<'contacts'>[]
        },
      },
    ],
  })

  const [tcQ, jobsQ, contactsQ] = queries
  return {
    targetCompanies: tcQ.data ?? [],
    jobs: jobsQ.data ?? [],
    contacts: contactsQ.data ?? [],
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error ?? null,
  }
}
