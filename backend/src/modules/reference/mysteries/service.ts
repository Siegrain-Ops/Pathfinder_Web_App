import { referenceMysteryRepository } from './repository'
import type { MysterySearchParams, ReferenceMystery } from '../types'

export const referenceMysteryService = {
  async search(params: MysterySearchParams): Promise<ReferenceMystery[]> {
    return referenceMysteryRepository.search(params)
  },
}
