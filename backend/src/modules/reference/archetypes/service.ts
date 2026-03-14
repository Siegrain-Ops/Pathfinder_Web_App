import { referenceArchetypeRepository } from './repository'
import type { ArchetypeSearchParams, ReferenceArchetype } from '../types'

export const referenceArchetypeService = {
  async search(params: ArchetypeSearchParams): Promise<ReferenceArchetype[]> {
    return referenceArchetypeRepository.search(params)
  },
}
