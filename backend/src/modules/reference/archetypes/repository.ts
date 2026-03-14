import { prisma } from '../../../common/db/prisma'
import type { ArchetypeSearchParams, ReferenceArchetype } from '../types'

export const referenceArchetypeRepository = {
  async search(params: ArchetypeSearchParams): Promise<ReferenceArchetype[]> {
    const { q, className, limit = 50, offset = 0 } = params
    return prisma.referenceArchetype.findMany({
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
