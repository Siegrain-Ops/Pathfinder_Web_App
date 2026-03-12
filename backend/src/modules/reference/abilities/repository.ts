import { prisma } from '../../../common/db/prisma'
import type {
  AbilitySearchParams,
  ReferenceAbilityResult,
} from '../types'

export const referenceAbilityRepository = {
  async search(params: AbilitySearchParams): Promise<ReferenceAbilityResult[]> {
    const { q, kind, className, category, limit = 30, offset = 0 } = params

    const [abilities, talents] = await Promise.all([
      kind === 'talent'
        ? Promise.resolve([])
        : prisma.referenceAbility.findMany({
            where: {
              ...(q ? { name: { contains: q } } : {}),
              ...(className ? { sourceParentName: { contains: className } } : {}),
              ...(category ? { sourceCategory: { equals: category } } : {}),
            },
            orderBy: { name: 'asc' },
            take: limit,
            skip: offset,
          }),
      kind === 'ability'
        ? Promise.resolve([])
        : prisma.referenceTalent.findMany({
            where: {
              ...(q ? { name: { contains: q } } : {}),
              ...(className ? { className: { contains: className } } : {}),
              ...(category ? { talentFamily: { contains: category } } : {}),
            },
            orderBy: { name: 'asc' },
            take: limit,
            skip: offset,
          }),
    ])

    return [
      ...abilities.map((row): ReferenceAbilityResult => ({
        id: row.id,
        name: row.name,
        kind: 'ability',
        abilityType: row.abilityType,
        category: row.sourceCategory,
        className: null,
        sourceParentName: row.sourceParentName,
        sourceOptionName: row.sourceOptionName,
        usesPerDay: row.usesPerDay,
        frequencyText: row.frequencyText,
        levelRequirement: row.levelRequirement,
        description: row.description,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl,
      })),
      ...talents.map((row): ReferenceAbilityResult => ({
        id: row.id,
        name: row.name,
        kind: 'talent',
        abilityType: row.abilityType,
        category: row.talentFamily,
        className: row.className,
        sourceParentName: row.className,
        sourceOptionName: null,
        usesPerDay: null,
        frequencyText: null,
        levelRequirement: extractLevelRequirement(row.prerequisites),
        description: row.description,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl,
      })),
    ]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
  },
}

function extractLevelRequirement(prerequisites: string | null): number | null {
  if (!prerequisites) return null
  const match = prerequisites.match(/\b(?:level)\s+(\d+)\+?/i) ?? prerequisites.match(/\b(\d+)(?:st|nd|rd|th)-level\b/i)
  return match ? Number(match[1]) : null
}
