import { useState, useEffect } from 'react'
import type { ReferenceArchetype } from '@/types'
import { referenceArchetypeService } from '../services/reference-archetype.service'

export function useReferenceArchetypes(className: string) {
  const [archetypes, setArchetypes] = useState<ReferenceArchetype[]>([])
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (!className) {
      setArchetypes([])
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    referenceArchetypeService
      .search({ className })
      .then(data => { if (!cancelled) setArchetypes(data) })
      .catch(err => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [className])

  return { archetypes, isLoading, error }
}
