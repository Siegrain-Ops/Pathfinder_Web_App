import { prisma } from '../../../common/db/prisma'
import type {
  AbilitySearchParams,
  ReferenceAbilityResult,
} from '../types'

// Shape of embedded power entries in ReferenceDomain.grantedPowers
// and ReferenceBloodline.powers JSON arrays.
type JsonPower = {
  name?: string
  abilityType?: string
  description?: string
  level?: number
}

type JsonRaceTrait = {
  name?: string
  description?: string
  type?: string
}

export const referenceAbilityRepository = {
  async search(params: AbilitySearchParams): Promise<ReferenceAbilityResult[]> {
    const {
      q, kind, className, category,
      race, bloodlineName, mysteryName, domainName, archetypeName,
      limit = 30, offset = 0,
    } = params

    const qLower = q?.trim().toLowerCase() ?? ''

    // Build OR filters for contextual matching on ReferenceAbility.
    // Each non-null option adds a sourceOptionName filter so abilities from
    // that bloodline/mystery/domain/archetype surface alongside class abilities.
    const optionFilters = [
      bloodlineName ? { sourceOptionName: { contains: bloodlineName } } : undefined,
      mysteryName   ? { sourceOptionName: { contains: mysteryName   } } : undefined,
      domainName    ? { sourceOptionName: { contains: domainName    } } : undefined,
      archetypeName ? { sourceOptionName: { contains: archetypeName } } : undefined,
    ].filter((f): f is NonNullable<typeof f> => f !== undefined)

    const classFilters = className
      ? [{ sourceParentName: { contains: className } }, ...optionFilters]
      : optionFilters

    // Include racial abilities when race is provided (without double-counting
    // when className is also set — race abilities are always included as extra).
    const raceFilters = race
      ? [{ AND: [{ sourceCategory: { equals: 'race' } }, { sourceParentName: { contains: race } }] }]
      : []

    const orFilters = [...classFilters, ...raceFilters]

    // ── 1. ReferenceAbility + ReferenceTalent (existing sources) ─────────────
    const fetchLimit = limit * 3 // fetch extra to account for merge + dedup
    const [abilities, talents] = await Promise.all([
      kind === 'talent'
        ? Promise.resolve([])
        : prisma.referenceAbility.findMany({
            where: {
              ...(q              ? { name:          { contains: q        } } : {}),
              ...(category       ? { sourceCategory: { equals:   category } } : {}),
              ...(orFilters.length > 0 ? { OR: orFilters } : {}),
            },
            orderBy: { name: 'asc' },
            take: fetchLimit,
            skip: offset,
          }),
      kind === 'ability'
        ? Promise.resolve([])
        : prisma.referenceTalent.findMany({
            where: {
              ...(q         ? { name:        { contains: q         } } : {}),
              ...(className ? { className:   { contains: className } } : {}),
              ...(category  ? { talentFamily: { contains: category  } } : {}),
            },
            orderBy: { name: 'asc' },
            take: fetchLimit,
            skip: offset,
          }),
    ])

    // ── 2. ReferenceRevelation (oracle revelations — normalized table) ────────
    // Searched whenever a query is present; filtered by mystery/class if provided.
    const revelations = (kind === 'talent' || !qLower || !mysteryName)
      ? []
      : await prisma.referenceRevelation.findMany({
          where: {
            ...(q           ? { name:        { contains: q           } } : {}),
            ...(mysteryName ? { mysteryName: { contains: mysteryName } } : {}),
            ...(className   ? { className:   { contains: className   } } : {}),
          },
          orderBy: { name: 'asc' },
          take: fetchLimit,
        })

    // ── 3. ReferenceDiscovery (alchemist/wizard discoveries — normalized) ─────
    const discoveries = (kind === 'talent' || !qLower)
      ? []
      : await prisma.referenceDiscovery.findMany({
          where: {
            ...(q         ? { name:      { contains: q         } } : {}),
            ...(className ? { className: { contains: className } } : {}),
          },
          orderBy: { name: 'asc' },
          take: fetchLimit,
        })

    // ── 4. Domain granted powers (embedded JSON in ReferenceDomain) ───────────
    // Fetches domains matching the character's domain (if set) or all domains,
    // then filters powers whose name contains the query string in JavaScript.
    const domainPowerResults: ReferenceAbilityResult[] = []
    if (kind !== 'talent' && qLower && domainName) {
      const domains = await prisma.referenceDomain.findMany({
        where: { name: { contains: domainName } },
        select: { id: true, name: true, grantedPowers: true, sourceName: true, sourceUrl: true },
        // Domains in PF1e are ~100 records; fetching all is acceptable.
      })
      for (const domain of domains) {
        const powers = (domain.grantedPowers as JsonPower[] | null) ?? []
        for (const power of powers) {
          if (!power.name) continue
          if (!power.name.toLowerCase().includes(qLower)) continue
          domainPowerResults.push({
            id:               `domain-power-${domain.id}-${slugify(power.name)}`,
            name:             power.name,
            kind:             'ability',
            abilityType:      power.abilityType ?? null,
            category:         'domain power',
            className:        null,
            sourceParentName: domain.name,
            sourceOptionName: `${domain.name} Domain`,
            usesPerDay:       null,
            frequencyText:    null,
            levelRequirement: power.level ?? null,
            description:      power.description ?? null,
            sourceName:       domain.sourceName,
            sourceUrl:        domain.sourceUrl,
          })
        }
      }
    }

    // ── 5. Bloodline powers (embedded JSON in ReferenceBloodline) ─────────────
    // Same pattern as domains: fetch matching bloodlines, filter powers in JS.
    const bloodlinePowerResults: ReferenceAbilityResult[] = []
    if (kind !== 'talent' && qLower && bloodlineName) {
      const bloodlines = await prisma.referenceBloodline.findMany({
        where: { name: { contains: bloodlineName } },
        select: { id: true, name: true, className: true, powers: true, sourceName: true, sourceUrl: true },
        // Bloodlines in PF1e are ~50 records; fetching all is acceptable.
      })
      for (const bloodline of bloodlines) {
        const powers = (bloodline.powers as JsonPower[] | null) ?? []
        for (const power of powers) {
          if (!power.name) continue
          if (!power.name.toLowerCase().includes(qLower)) continue
          bloodlinePowerResults.push({
            id:               `bloodline-power-${bloodline.id}-${slugify(power.name)}`,
            name:             power.name,
            kind:             'ability',
            abilityType:      power.abilityType ?? null,
            category:         'bloodline power',
            className:        bloodline.className,
            sourceParentName: bloodline.className,
            sourceOptionName: `${bloodline.name} Bloodline`,
            usesPerDay:       null,
            frequencyText:    null,
            levelRequirement: power.level ?? null,
            description:      power.description ?? null,
            sourceName:       bloodline.sourceName,
            sourceUrl:        bloodline.sourceUrl,
          })
        }
      }
    }

    // ── 6. Merge, map, deduplicate, sort, paginate ────────────────────────────

    const raceTraitResults: ReferenceAbilityResult[] = []
    if (kind !== 'talent' && qLower && race) {
      const raceRows = await prisma.referenceRace.findMany({
        where: { name: { contains: race } },
        select: { id: true, name: true, traits: true, sourceName: true, sourceUrl: true },
      })

      for (const raceRow of raceRows) {
        const traits = (raceRow.traits as JsonRaceTrait[] | null) ?? []
        for (const trait of traits) {
          if (!trait.name) continue
          const haystack = `${trait.name} ${trait.description ?? ''}`.toLowerCase()
          if (!haystack.includes(qLower)) continue
          raceTraitResults.push({
            id:               `race-trait-${raceRow.id}-${slugify(trait.name)}`,
            name:             trait.name,
            kind:             'ability',
            abilityType:      trait.type ?? null,
            category:         'race',
            className:        null,
            sourceParentName: raceRow.name,
            sourceOptionName: `${raceRow.name} Race`,
            usesPerDay:       null,
            frequencyText:    null,
            levelRequirement: null,
            description:      trait.description ?? null,
            sourceName:       raceRow.sourceName,
            sourceUrl:        raceRow.sourceUrl,
          })
        }
      }
    }

    const mapped: ReferenceAbilityResult[] = [
      ...abilities.map((row): ReferenceAbilityResult => ({
        id:               row.id,
        name:             row.name,
        kind:             'ability',
        abilityType:      row.abilityType,
        category:         row.sourceCategory,
        className:        null,
        sourceParentName: row.sourceParentName,
        sourceOptionName: row.sourceOptionName,
        usesPerDay:       row.usesPerDay,
        frequencyText:    row.frequencyText,
        levelRequirement: row.levelRequirement,
        description:      row.description,
        sourceName:       row.sourceName,
        sourceUrl:        row.sourceUrl,
      })),
      ...talents.map((row): ReferenceAbilityResult => ({
        id:               row.id,
        name:             row.name,
        kind:             'talent',
        abilityType:      row.abilityType,
        category:         row.talentFamily,
        className:        row.className,
        sourceParentName: row.className,
        sourceOptionName: null,
        usesPerDay:       null,
        frequencyText:    null,
        levelRequirement: extractLevelRequirement(row.prerequisites),
        description:      row.description,
        sourceName:       row.sourceName,
        sourceUrl:        row.sourceUrl,
      })),
      ...revelations.map((row): ReferenceAbilityResult => ({
        id:               row.id,
        name:             row.name,
        kind:             'ability',
        abilityType:      row.abilityType,
        category:         'revelation',
        className:        row.className,
        sourceParentName: row.className,
        sourceOptionName: row.mysteryName ? `${row.mysteryName} Mystery` : null,
        usesPerDay:       null,
        frequencyText:    null,
        levelRequirement: row.levelRequirement,
        description:      row.description,
        sourceName:       row.sourceName,
        sourceUrl:        row.sourceUrl,
      })),
      ...discoveries.map((row): ReferenceAbilityResult => ({
        id:               row.id,
        name:             row.name,
        kind:             'ability',
        abilityType:      row.abilityType,
        category:         'discovery',
        className:        row.className,
        sourceParentName: row.className,
        sourceOptionName: null,
        usesPerDay:       null,
        frequencyText:    null,
        levelRequirement: extractLevelRequirement(row.prerequisites),
        description:      row.description,
        sourceName:       row.sourceName,
        sourceUrl:        row.sourceUrl,
      })),
      ...domainPowerResults,
      ...bloodlinePowerResults,
      ...raceTraitResults,
    ]

    // Deduplicate by name (case-insensitive). When the same ability exists in
    // both ReferenceAbility (fully normalized) and as an embedded JSON power,
    // prefer the ReferenceAbility record (it comes first in the array).
    const seen = new Set<string>()
    const deduped = mapped.filter(r => {
      const key = r.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return deduped
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractLevelRequirement(prerequisites: string | null): number | null {
  if (!prerequisites) return null
  const match =
    prerequisites.match(/\b(?:level)\s+(\d+)\+?/i) ??
    prerequisites.match(/\b(\d+)(?:st|nd|rd|th)-level\b/i)
  return match ? Number(match[1]) : null
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
