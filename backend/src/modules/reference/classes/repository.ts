import { prisma } from '../../../common/db/prisma'
import type { ReferenceClass } from '../types'

export const referenceClassRepository = {
  async search(params: {
    q?: string
    category?: string
    limit?: number
    offset?: number
  }): Promise<ReferenceClass[]> {
    const { q, category, limit = 50, offset = 0 } = params
    return prisma.referenceClass.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(category ? { category: { equals: category } } : {}),
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    })
  },

  async findById(id: string): Promise<ReferenceClass | null> {
    return prisma.referenceClass.findUnique({ where: { id } })
  },
}
