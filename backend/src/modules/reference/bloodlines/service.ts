import { referenceBloodlineRepository } from './repository'
import type { BloodlineSearchParams, ReferenceBloodline } from '../types'

export const referenceBloodlineService = {
  async search(params: BloodlineSearchParams): Promise<ReferenceBloodline[]> {
    return referenceBloodlineRepository.search(params)
  },
}
