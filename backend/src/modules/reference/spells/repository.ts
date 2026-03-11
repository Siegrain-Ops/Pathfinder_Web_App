import { prisma }   from '../../../common/db/prisma'
import type { ReferenceSpell } from '../types'
import { toSpell }  from '../types'

export const referenceSpellRepository = {
  /** Search by name and/or school. Class/level filtering happens in the service. */
  async search(params: {
    q?:      string
    school?: string
    limit?:  number
    offset?: number
  }): Promise<ReferenceSpell[]> {
    const { q, school, limit = 50, offset = 0 } = params
    const rows = await prisma.referenceSpell.findMany({
      where: {
        ...(q      ? { name:   { contains: q      } } : {}),
        ...(school ? { school: { equals:   school } } : {}),
      },
      orderBy: { name: 'asc' },
      take:    limit,
      skip:    offset,
    })
    return rows.map(toSpell)
  },

  /** Same as search but without take/skip — used when class/level post-filter is needed. */
  async searchAll(params: { q?: string; school?: string }): Promise<ReferenceSpell[]> {
    const { q, school } = params
    const rows = await prisma.referenceSpell.findMany({
      where: {
        ...(q      ? { name:   { contains: q      } } : {}),
        ...(school ? { school: { equals:   school } } : {}),
      },
      orderBy: { name: 'asc' },
    })
    return rows.map(toSpell)
  },

  async findById(id: string): Promise<ReferenceSpell | null> {
    const row = await prisma.referenceSpell.findUnique({ where: { id } })
    return row ? toSpell(row) : null
  },

  /** Used by the importer for upsert. */
  async upsertBySourceUrl(
    sourceUrl: string,
    data: Omit<ReferenceSpell, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ReferenceSpell> {
    const row = await prisma.referenceSpell.upsert({
      where:  { sourceUrl },
      create: { ...data, spellLevelJson: data.spellLevelJson as never },
      update: { ...data, spellLevelJson: data.spellLevelJson as never },
    })
    return toSpell(row)
  },
}
