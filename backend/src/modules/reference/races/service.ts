import { AppError } from '../../../common/errors/AppError'
import { referenceRaceRepository } from './repository'
import type { RaceSearchParams, ReferenceRace } from '../types'

export const referenceRaceService = {
  async search(params: RaceSearchParams): Promise<ReferenceRace[]> {
    const { q, category, limit = 50, offset = 0 } = params
    return referenceRaceRepository.search({ q, category, limit, offset })
  },

  async getById(id: string): Promise<ReferenceRace> {
    const race = await referenceRaceRepository.findById(id)
    if (!race) throw AppError.notFound('Race')
    return race
  },
}
