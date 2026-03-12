import { referenceAbilityRepository } from './repository'
import type { AbilitySearchParams, ReferenceAbilityResult } from '../types'

export const referenceAbilityService = {
  async search(params: AbilitySearchParams): Promise<ReferenceAbilityResult[]> {
    return referenceAbilityRepository.search(params)
  },
}
