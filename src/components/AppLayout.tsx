import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useSession } from '@/hooks/useSession'

export function AppLayout() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <div className="grid h-screen place-items-center bg-app-bg text-[13px] text-ink-muted">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="grid h-screen grid-cols-[232px_1fr] overflow-hidden">
      <Sidebar />
      <main className="flex flex-col overflow-hidden bg-app-bg">
        <Outlet />
      </main>
    </div>
  )
}
