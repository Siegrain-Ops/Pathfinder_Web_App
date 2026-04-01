import { prisma } from '../../../common/db/prisma'
import type { ReferenceRace } from '../types'

type JsonRaceTrait = {
  name?: string | null
  description?: string | null
  type?: string | null
}

export const referenceRaceRepository = {
  async search(params: {
    q?: string
    category?: string
    limit?: number
    offset?: number
  }): Promise<ReferenceRace[]> {
    const { q, category, limit = 50, offset = 0 } = params
    const rows = await prisma.referenceRace.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(category ? { category: { equals: category } } : {}),
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    })

    return rows.map(normalizeReferenceRace)
  },

  async findById(id: string): Promise<ReferenceRace | null> {
    const row = await prisma.referenceRace.findUnique({ where: { id } })
    return row ? normalizeReferenceRace(row) : null
  },
}

function normalizeReferenceRace(referenceRace: ReferenceRace): ReferenceRace {
  const traits = mergeRaceTraits(referenceRace.raceType, referenceRace.traits)

  return {
    ...referenceRace,
    traits: traits.length > 0 ? traits as never : referenceRace.traits,
  }
}

function mergeRaceTraits(
  raceType: string | null,
  rawTraits: ReferenceRace['traits'],
): JsonRaceTrait[] {
  const traits = Array.isArray(rawTraits)
    ? rawTraits
        .map(trait => normalizeTrait(trait as JsonRaceTrait))
        .filter((trait): trait is JsonRaceTrait => Boolean(trait?.name || trait?.description))
    : []

  const hasAquatic = traits.some(trait => (trait.name ?? '').trim().toLowerCase() === 'aquatic')
  if (!hasAquatic && raceType?.toLowerCase().includes('aquatic')) {
    traits.unshift({
      name: 'Aquatic',
      description: raceType,
      type: 'standard',
    })
  }

  return traits
}

function normalizeTrait(trait: JsonRaceTrait): JsonRaceTrait | null {
  const name = trait.name?.replace(/\s+/g, ' ').trim() ?? null
  const description = trait.description?.replace(/\s+/g, ' ').trim() ?? null
  const type = trait.type?.replace(/\s+/g, ' ').trim() ?? null

  if (!name && !description) return null
  return { name, description, type }
}
