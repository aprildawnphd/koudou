import { useQueries } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'

export function useTodayData() {
  const queries = useQueries({
    queries: [
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
      {
        queryKey: ['interviews'],
        queryFn: async () => {
          const { data, error } = await supabase.from('interviews').select('*')
          if (error) throw error
          return (data ?? []) as Tables<'interviews'>[]
        },
      },
      {
        queryKey: ['activities'],
        queryFn: async () => {
          const { data, error } = await supabase.from('activities').select('*')
          if (error) throw error
          return (data ?? []) as Tables<'activities'>[]
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
      {
        queryKey: ['milestones', 'undismissed'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('milestones')
            .select('*')
            .is('dismissed_at', null)
            .order('fired_at', { ascending: false })
            .limit(1)
          if (error) throw error
          return (data ?? []) as Tables<'milestones'>[]
        },
      },
      {
        queryKey: ['profile', 'me'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(1)
            .maybeSingle()
          if (error) throw error
          return (data ?? null) as Tables<'profiles'> | null
        },
      },
    ],
  })

  const [jobsQ, contactsQ, interviewsQ, activitiesQ, tcQ, milestoneQ, profileQ] = queries

  return {
    jobs: jobsQ.data ?? [],
    contacts: contactsQ.data ?? [],
    interviews: interviewsQ.data ?? [],
    activities: activitiesQ.data ?? [],
    targetCompanies: tcQ.data ?? [],
    milestone: milestoneQ.data?.[0] ?? null,
    profile: profileQ.data ?? null,
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error ?? null,
  }
}
