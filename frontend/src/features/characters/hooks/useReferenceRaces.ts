import { useEffect, useState } from 'react'
import type { ReferenceRace } from '@/types'
import { referenceRaceService } from '../services/reference-race.service'

export function useReferenceRaces() {
  const [races, setRaces] = useState<ReferenceRace[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await referenceRaceService.search()
        if (!cancelled) setRaces(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load races')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { races, isLoading, error }
}
