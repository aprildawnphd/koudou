import { useQueries } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'

export function useNetworkData() {
  const queries = useQueries({
    queries: [
      {
        queryKey: ['contacts'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('name', { ascending: true })
          if (error) throw error
          return (data ?? []) as Tables<'contacts'>[]
        },
      },
      {
        queryKey: ['target_companies'],
        queryFn: async () => {
          const { data, error } = await supabase.from('target_companies').select('*')
          if (error) throw error
          return (data ?? []) as Tables<'target_companies'>[]
        },
      },
    ],
  })

  const [contactsQ, tcQ] = queries
  return {
    contacts: contactsQ.data ?? [],
    targetCompanies: tcQ.data ?? [],
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error ?? null,
  }
}
