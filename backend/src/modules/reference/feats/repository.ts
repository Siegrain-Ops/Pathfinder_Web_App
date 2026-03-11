import { prisma }       from '../../../common/db/prisma'
import type { ReferenceFeat } from '../types'

export const referenceFeatRepository = {
  async search(params: {
    q?:     string
    type?:  string
    limit?: number
    offset?: number
  }): Promise<ReferenceFeat[]> {
    const { q, type, limit = 50, offset = 0 } = params
    return prisma.referenceFeat.findMany({
      where: {
        ...(q    ? { name:     { contains: q    } } : {}),
        ...(type ? { featType: { equals:   type } } : {}),
      },
      orderBy: { name: 'asc' },
      take:    limit,
      skip:    offset,
    })
  },

  async findById(id: string): Promise<ReferenceFeat | null> {
    return prisma.referenceFeat.findUnique({ where: { id } })
  },

  /** Used by the importer for upsert. */
  async upsertBySourceUrl(
    sourceUrl: string,
    data: Omit<ReferenceFeat, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ReferenceFeat> {
    return prisma.referenceFeat.upsert({
      where:  { sourceUrl },
      create: { ...data },
      update: { ...data },
    })
  },
}
