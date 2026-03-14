import { useState, useEffect } from 'react'
import type { ReferenceDomain } from '@/types'
import { referenceDomainService } from '../services/reference-domain.service'

export function useReferenceDomains(className: string) {
  const [domains, setDomains]   = useState<ReferenceDomain[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!className) {
      setDomains([])
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    referenceDomainService
      .search({ className })
      .then(data => { if (!cancelled) setDomains(data) })
      .catch(err => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [className])

  return { domains, isLoading, error }
}
