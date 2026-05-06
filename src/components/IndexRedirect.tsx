import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'

// Routes the index path based on whether the signed-in account has any
// data. Empty account → /getting-started (where the demo seed lives).
// Populated account → /today. Catches both first-time sign-in via magic
// link AND post-wipe empty states.
export function IndexRedirect() {
  const { session, loading: sessionLoading } = useSession()

  const { data, isLoading } = useQuery({
    queryKey: ['index-redirect-job-count', session?.user.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
      if (error) throw error
      return count ?? 0
    },
    enabled: !!session?.user.id,
    staleTime: 0,
  })

  if (sessionLoading || isLoading) return null
  if (!session) return <Navigate to="/auth" replace />

  return (
    <Navigate
      to={data && data > 0 ? '/today' : '/getting-started'}
      replace
    />
  )
}
