// ---------------------------------------------------------------------------
// ProtectedRoute — redirects unauthenticated users to /login
// ---------------------------------------------------------------------------

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/app/store/authStore'
import { Spinner } from '@/components/ui/Spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isInitialized, sessionExpired } = useAuthStore()
  const location = useLocation()

  if (isLoading || !isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-900">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`
    const params = new URLSearchParams()
    if (sessionExpired) params.set('reason', 'expired')
    if (next && next !== '/') params.set('next', next)
    const search = params.toString()
    return <Navigate to={`/login${search ? `?${search}` : ''}`} replace />
  }

  return <>{children}</>
}
