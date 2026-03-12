import { useEffect, useState } from 'react'
import type { ReferenceClass } from '@/types'
import { referenceClassService } from '../services/reference-class.service'

export function useReferenceClasses() {
  const [classes, setClasses] = useState<ReferenceClass[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await referenceClassService.search()
        if (!cancelled) setClasses(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load classes')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { classes, isLoading, error }
}
