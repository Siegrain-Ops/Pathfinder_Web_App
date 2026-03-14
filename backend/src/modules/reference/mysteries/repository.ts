import { prisma } from '../../../common/db/prisma'
import type { MysterySearchParams, ReferenceMystery } from '../types'

export const referenceMysteryRepository = {
  async search(params: MysterySearchParams): Promise<ReferenceMystery[]> {
    const { q, className, limit = 50, offset = 0 } = params
    return prisma.referenceMystery.findMany({
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
