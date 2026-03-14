import { prisma } from '../../../common/db/prisma'
import type { BloodlineSearchParams, ReferenceBloodline } from '../types'

export const referenceBloodlineRepository = {
  async search(params: BloodlineSearchParams): Promise<ReferenceBloodline[]> {
    const { q, className, limit = 50, offset = 0 } = params
    return prisma.referenceBloodline.findMany({
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
