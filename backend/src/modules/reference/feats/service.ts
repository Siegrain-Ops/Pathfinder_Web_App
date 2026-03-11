import { referenceFeatRepository } from './repository'
import { AppError }                from '../../../common/errors/AppError'
import type { FeatSearchParams, ReferenceFeat } from '../types'

export const referenceFeatService = {
  async search(params: FeatSearchParams): Promise<ReferenceFeat[]> {
    const { q, type, limit, offset } = params
    return referenceFeatRepository.search({ q, type, limit, offset })
  },

  async getById(id: string): Promise<ReferenceFeat> {
    const feat = await referenceFeatRepository.findById(id)
    if (!feat) throw AppError.notFound('Feat')
    return feat
  },
}
