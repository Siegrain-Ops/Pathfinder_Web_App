import { prisma } from '../../../common/db/prisma'
import type { ReferenceRace } from '../types'

export const referenceRaceRepository = {
  async search(params: {
    q?: string
    category?: string
    limit?: number
    offset?: number
  }): Promise<ReferenceRace[]> {
    const { q, category, limit = 50, offset = 0 } = params
    return prisma.referenceRace.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(category ? { category: { equals: category } } : {}),
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    })
  },

  async findById(id: string): Promise<ReferenceRace | null> {
    return prisma.referenceRace.findUnique({ where: { id } })
  },
}
