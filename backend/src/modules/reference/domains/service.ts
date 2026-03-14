import { referenceDomainRepository } from './repository'
import type { DomainSearchParams, ReferenceDomain } from '../types'

export const referenceDomainService = {
  async search(params: DomainSearchParams): Promise<ReferenceDomain[]> {
    return referenceDomainRepository.search(params)
  },
}
