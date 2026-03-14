import { prisma } from '../../../common/db/prisma'
import type { DomainSearchParams, ReferenceDomain } from '../types'

export const referenceDomainRepository = {
  async search(params: DomainSearchParams): Promise<ReferenceDomain[]> {
    const { q, className, limit = 50, offset = 0 } = params
    return prisma.referenceDomain.findMany({
      where: {
        ...(q         ? { name:      { contains: q         } } : {}),
        ...(className ? { className: { contains: className } } : {}),
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    })
  },
}
