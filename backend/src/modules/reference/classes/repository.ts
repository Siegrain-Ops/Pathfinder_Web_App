import { prisma } from '../../../common/db/prisma'
import type { ReferenceClass } from '../types'

type JsonClassFeature = {
  level?: number | null
  name?: string | null
  description?: string | null
}

type JsonProgressionRow = {
  level?: number | null
  special?: unknown
}

export const referenceClassRepository = {
  async search(params: {
    q?: string
    category?: string
    limit?: number
    offset?: number
  }): Promise<ReferenceClass[]> {
    const { q, category, limit = 50, offset = 0 } = params
    const rows = await prisma.referenceClass.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(category ? { category: { equals: category } } : {}),
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    })

    return rows.map(normalizeReferenceClass)
  },

  async findById(id: string): Promise<ReferenceClass | null> {
    const row = await prisma.referenceClass.findUnique({ where: { id } })
    return row ? normalizeReferenceClass(row) : null
  },
}

function normalizeReferenceClass(referenceClass: ReferenceClass): ReferenceClass {
  const classFeatures = mergeClassFeatures(
    referenceClass.classFeatures,
    referenceClass.progressionTable,
  )

  return {
    ...referenceClass,
    classFeatures: classFeatures.length > 0 ? classFeatures as never : referenceClass.classFeatures,
  }
}

function mergeClassFeatures(
  rawFeatures: ReferenceClass['classFeatures'],
  rawProgressionTable: ReferenceClass['progressionTable'],
): JsonClassFeature[] {
  const fromArchive = Array.isArray(rawFeatures)
    ? rawFeatures
        .map(feature => normalizeArchiveFeature(feature as JsonClassFeature))
        .filter((feature): feature is JsonClassFeature => Boolean(feature?.name))
    : []

  const merged = new Map<string, JsonClassFeature>()

  for (const feature of fromArchive) {
    merged.set(makeFeatureKey(feature.level ?? null, feature.name ?? null), feature)
  }

  const synthesized = synthesizeFeaturesFromProgression(rawProgressionTable)
  for (const feature of synthesized) {
    const key = makeFeatureKey(feature.level ?? null, feature.name ?? null)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, feature)
      continue
    }

    if ((!existing.description || existing.description.trim().length === 0) && feature.description) {
      merged.set(key, { ...existing, description: feature.description })
    }
  }

  return [...merged.values()].sort((a, b) => {
    const levelA = a.level ?? Number.MAX_SAFE_INTEGER
    const levelB = b.level ?? Number.MAX_SAFE_INTEGER
    if (levelA !== levelB) return levelA - levelB
    return (a.name ?? '').localeCompare(b.name ?? '')
  })
}

function normalizeArchiveFeature(feature: JsonClassFeature): JsonClassFeature | null {
  const name = normalizeFeatureName(feature.name)
  if (!name) return null

  return {
    level: typeof feature.level === 'number' ? feature.level : null,
    name,
    description: normalizeFeatureDescription(feature.description),
  }
}

function synthesizeFeaturesFromProgression(
  rawProgressionTable: ReferenceClass['progressionTable'],
): JsonClassFeature[] {
  if (!Array.isArray(rawProgressionTable)) return []

  const synthesized: JsonClassFeature[] = []

  for (const row of rawProgressionTable as JsonProgressionRow[]) {
    if (typeof row.level !== 'number') continue
    if (!Array.isArray(row.special)) continue

    for (const special of row.special) {
      if (typeof special !== 'string') continue
      const name = normalizeFeatureName(special)
      if (!name) continue
      synthesized.push({
        level: row.level,
        name,
        description: `${name} (listed in the class progression table at level ${row.level}).`,
      })
    }
  }

  return synthesized
}

function normalizeFeatureName(value: string | null | undefined): string | null {
  const cleaned = value
    ?.replace(/[–—−]/g, '-')
    .replace(/\s*\((?:ex|su|sp)\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned ? cleaned : null
}

function normalizeFeatureDescription(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned : null
}

function makeFeatureKey(level: number | null, name: string | null): string {
  return `${level ?? 'unknown'}::${(name ?? '').toLowerCase()}`
}
