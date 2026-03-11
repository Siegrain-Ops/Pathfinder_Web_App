import type { ReactNode } from 'react'

/** Wrap any future providers (query client, theme, etc.) here. */
export function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>
}
