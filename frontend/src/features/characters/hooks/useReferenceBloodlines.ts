import { useState, useEffect } from 'react'
import type { ReferenceBloodline } from '@/types'
import { referenceBloodlineService } from '../services/reference-bloodline.service'

export function useReferenceBloodlines(className: string) {
  const [bloodlines, setBloodlines] = useState<ReferenceBloodline[]>([])
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (!className) {
      setBloodlines([])
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    referenceBloodlineService
      .search({ className })
      .then(data => { if (!cancelled) setBloodlines(data) })
      .catch(err => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [className])

  return { bloodlines, isLoading, error }
}
