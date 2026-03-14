import { useState, useEffect } from 'react'
import type { ReferenceMystery } from '@/types'
import { referenceMysteryService } from '../services/reference-mystery.service'

export function useReferenceMysteries(className: string) {
  const [mysteries, setMysteries] = useState<ReferenceMystery[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!className) {
      setMysteries([])
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    referenceMysteryService
      .search({ className })
      .then(data => { if (!cancelled) setMysteries(data) })
      .catch(err => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [className])

  return { mysteries, isLoading, error }
}
