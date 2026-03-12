import { AppError } from '../../../common/errors/AppError'
import { referenceClassRepository } from './repository'
import type { ClassSearchParams, ReferenceClass } from '../types'

export const referenceClassService = {
  async search(params: ClassSearchParams): Promise<ReferenceClass[]> {
    const { q, category, limit = 50, offset = 0 } = params
    return referenceClassRepository.search({ q, category, limit, offset })
  },

  async getById(id: string): Promise<ReferenceClass> {
    const classRecord = await referenceClassRepository.findById(id)
    if (!classRecord) throw AppError.notFound('Class')
    return classRecord
  },
}
