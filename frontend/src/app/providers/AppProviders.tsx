import { type ReactNode, useEffect } from 'react'
import { useAuthStore } from '@/app/store/authStore'

/** Wrap any future providers (query client, theme, etc.) here. */
export function AppProviders({ children }: { children: ReactNode }) {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return <>{children}</>
}
