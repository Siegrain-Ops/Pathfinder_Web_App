import 'dotenv/config'
import { prisma } from '../src/common/db/prisma'
import { parseCliOptions } from './lib/base-importer'

type RaceTrait = {
  name?: string
  description?: string
  type?: string
}

type ClassFeature = {
  level?: number
  name?: string
  description?: string
}

type ArchetypeFeature = {
  level?: number
  name?: string
  description?: string
}

type ParsedAbility = {
  name: string
  abilityType: 'spell-like' | 'supernatural' | 'extraordinary'
  sourceCategory: 'race' | 'class' | 'archetype'
  sourceUrl: string
  sourceParentName: string
  sourceOptionName: string | null
  levelRequirement: number | null
  frequencyText: string | null
  usesPerDay: number | null
  casterLevelText: string | null
  dcText: string | null
  description: string
  referenceSpellId: string | null
}

const FREQUENCY_SEGMENT_RE = /((?:at will|constant|once per day|twice per day|three times per day|\d+\/day|\d+\/week|\d+\/month))\s*[—-]\s*([^.;]+)/gi
const EXPLICIT_FREQUENCY_RE = /\b(at will|constant|once per day|twice per day|three times per day|\d+\/day|\d+\/week|\d+\/month)\b/i
async function main() {
  const opts = parseCliOptions()

  console.log('='.repeat(55))
  console.log('  Pathfinder 1e - Ability Importer (Races + Classes + Archetypes)')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.limit) console.log(`  Limit   : ${opts.limit}`)
  console.log('='.repeat(55))

  const spellRows = await prisma.referenceSpell.findMany({
    select: { id: true, name: true },
  })
  const spellMap = new Map<string, { id: string; name: string }>()
  for (const spell of spellRows) {
    spellMap.set(normalizeSpellKey(spell.name), spell)
  }

  const raceStats = await importRaceAbilities({ ...opts, spellMap })
  const classStats = await importClassAbilities({ ...opts, spellMap })
  const archetypeStats = await importArchetypeAbilities({ ...opts, spellMap })

  console.log('\n' + '='.repeat(55))
  console.log(`  Imported : ${raceStats.created + classStats.created + archetypeStats.created}`)
  console.log(`  Updated  : ${raceStats.updated + classStats.updated + archetypeStats.updated}`)
  console.log(`  Skipped  : ${raceStats.skipped + classStats.skipped + archetypeStats.skipped}`)
  console.log(`  Failed   : ${raceStats.failed + classStats.failed + archetypeStats.failed}`)
  console.log('='.repeat(55))
}

async function importRaceAbilities(input: ReturnType<typeof parseCliOptions> & {
  spellMap: Map<string, { id: string; name: string }>
}) {
  const races = await prisma.referenceRace.findMany({
    where: { traits: { not: null } },
    orderBy: { name: 'asc' },
    select: {
      name: true,
      sourceUrl: true,
      traits: true,
    },
  })

  const work = input.limit ? races.slice(0, input.limit) : races
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 }

  for (let index = 0; index < work.length; index++) {
    const race = work[index]
    const traits = Array.isArray(race.traits) ? race.traits as RaceTrait[] : []
    const projected = projectRaceAbilities({
      raceName: race.name,
      raceSourceUrl: race.sourceUrl,
      traits,
      spellMap: input.spellMap,
    })

    if (projected.length === 0) {
      process.stdout.write(`[race ${index + 1}/${work.length}] ${race.name} (no racial abilities)\n`)
      stats.skipped++
      continue
    }

    if (input.debug) {
      console.log(`\n[DEBUG][race] ${race.name}`)
      console.log(JSON.stringify(projected, null, 2))
    }

    process.stdout.write(`[race ${index + 1}/${work.length}] ${race.name} -> ${projected.length} abilities`)

    if (input.dryRun) {
      process.stdout.write(' (dry-run)\n')
      stats.skipped++
      continue
    }

    try {
      for (const ability of projected) {
        const result = await upsertAbility(ability)
        if (result === 'created') stats.created++
        else stats.updated++
      }
      process.stdout.write(' +\n')
    } catch (error) {
      process.stdout.write(` FAIL: ${String(error)}\n`)
      stats.failed++
    }
  }

  return stats
}

async function importArchetypeAbilities(input: ReturnType<typeof parseCliOptions> & {
  spellMap: Map<string, { id: string; name: string }>
}) {
  const archetypes = await prisma.referenceArchetype.findMany({
    where: { gainedFeatures: { not: null } },
    orderBy: { name: 'asc' },
    select: {
      name: true,
      className: true,
      sourceUrl: true,
      gainedFeatures: true,
    },
  })

  const work = input.limit ? archetypes.slice(0, input.limit) : archetypes
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 }

  for (let index = 0; index < work.length; index++) {
    const archetype = work[index]
    const gainedFeatures = Array.isArray(archetype.gainedFeatures)
      ? archetype.gainedFeatures as ArchetypeFeature[]
      : []

    const projected = projectArchetypeAbilities({
      archetypeName: archetype.name,
      className: archetype.className,
      archetypeSourceUrl: archetype.sourceUrl,
      gainedFeatures,
      spellMap: input.spellMap,
    })

    if (projected.length === 0) {
      process.stdout.write(`[archetype ${index + 1}/${work.length}] ${archetype.name} (no archetype abilities)\n`)
      stats.skipped++
      continue
    }

    if (input.debug) {
      console.log(`\n[DEBUG][archetype] ${archetype.name}`)
      console.log(JSON.stringify(projected, null, 2))
    }

    process.stdout.write(`[archetype ${index + 1}/${work.length}] ${archetype.name} -> ${projected.length} abilities`)

    if (input.dryRun) {
      process.stdout.write(' (dry-run)\n')
      stats.skipped++
      continue
    }

    try {
      for (const ability of projected) {
        const result = await upsertAbility(ability)
        if (result === 'created') stats.created++
        else stats.updated++
      }
      process.stdout.write(' +\n')
    } catch (error) {
      process.stdout.write(` FAIL: ${String(error)}\n`)
      stats.failed++
    }
  }

  return stats
}

async function importClassAbilities(input: ReturnType<typeof parseCliOptions> & {
  spellMap: Map<string, { id: string; name: string }>
}) {
  const classes = await prisma.referenceClass.findMany({
    where: { classFeatures: { not: null } },
    orderBy: { name: 'asc' },
    select: {
      name: true,
      sourceUrl: true,
      classFeatures: true,
    },
  })

  const work = input.limit ? classes.slice(0, input.limit) : classes
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 }

  for (let index = 0; index < work.length; index++) {
    const referenceClass = work[index]
    const classFeatures = Array.isArray(referenceClass.classFeatures)
      ? referenceClass.classFeatures as ClassFeature[]
      : []

    const projected = projectClassAbilities({
      className: referenceClass.name,
      classSourceUrl: referenceClass.sourceUrl,
      classFeatures,
      spellMap: input.spellMap,
    })

    if (projected.length === 0) {
      process.stdout.write(`[class ${index + 1}/${work.length}] ${referenceClass.name} (no class abilities)\n`)
      stats.skipped++
      continue
    }

    if (input.debug) {
      console.log(`\n[DEBUG][class] ${referenceClass.name}`)
      console.log(JSON.stringify(projected, null, 2))
    }

    process.stdout.write(`[class ${index + 1}/${work.length}] ${referenceClass.name} -> ${projected.length} abilities`)

    if (input.dryRun) {
      process.stdout.write(' (dry-run)\n')
      stats.skipped++
      continue
    }

    try {
      for (const ability of projected) {
        const result = await upsertAbility(ability)
        if (result === 'created') stats.created++
        else stats.updated++
      }
      process.stdout.write(' +\n')
    } catch (error) {
      process.stdout.write(` FAIL: ${String(error)}\n`)
      stats.failed++
    }
  }

  return stats
}

async function upsertAbility(ability: ParsedAbility): Promise<'created' | 'updated'> {
  const existing = await prisma.referenceAbility.findUnique({
    where: { sourceUrl: ability.sourceUrl },
    select: { id: true },
  })

  await prisma.referenceAbility.upsert({
    where: { sourceUrl: ability.sourceUrl },
    create: {
      name: ability.name,
      abilityType: ability.abilityType,
      sourceCategory: ability.sourceCategory,
      sourceParentName: ability.sourceParentName,
      sourceOptionName: ability.sourceOptionName,
      levelRequirement: ability.levelRequirement,
      frequencyText: ability.frequencyText,
      usesPerDay: ability.usesPerDay,
      casterLevelText: ability.casterLevelText,
      dcText: ability.dcText,
      description: ability.description,
      referenceSpellId: ability.referenceSpellId,
      sourceName: 'd20pfsrd.com',
      sourceUrl: ability.sourceUrl,
    },
    update: {
      name: ability.name,
      abilityType: ability.abilityType,
      sourceCategory: ability.sourceCategory,
      sourceParentName: ability.sourceParentName,
      sourceOptionName: ability.sourceOptionName,
      levelRequirement: ability.levelRequirement,
      frequencyText: ability.frequencyText,
      usesPerDay: ability.usesPerDay,
      casterLevelText: ability.casterLevelText,
      dcText: ability.dcText,
      description: ability.description,
      referenceSpellId: ability.referenceSpellId,
    },
  })

  return existing ? 'updated' : 'created'
}

function projectRaceAbilities(input: {
  raceName: string
  raceSourceUrl: string | null
  traits: RaceTrait[]
  spellMap: Map<string, { id: string; name: string }>
}): ParsedAbility[] {
  const result: ParsedAbility[] = []
  const raceBaseUrl = input.raceSourceUrl ?? `race:${slugify(input.raceName)}`

  for (const trait of input.traits) {
    const description = cleanText(trait.description)
    if (!description || !looksLikeSpellLikeAbility(description)) continue

    const spellEntries = extractSpellEntries(description)
    if (spellEntries.length === 0) continue

    const casterLevelText = extractCasterLevelText(description)
    const dcText = extractDcText(description)
    const optionName = cleanText(trait.name)

    for (const spellEntry of spellEntries) {
      const normalizedKey = normalizeSpellKey(spellEntry.spellName)
      const matchedSpell = input.spellMap.get(normalizedKey) ?? null
      const name = matchedSpell?.name ?? spellEntry.spellName
      const sourceUrl = `${raceBaseUrl}#${slugify(optionName ?? 'racial-ability')}-${slugify(spellEntry.frequency)}-${slugify(name)}`

      result.push({
        name,
        abilityType: 'spell-like',
        sourceCategory: 'race',
        sourceUrl,
        sourceParentName: input.raceName,
        sourceOptionName: optionName,
        levelRequirement: null,
        frequencyText: spellEntry.frequency,
        usesPerDay: parseUsesPerDay(spellEntry.frequency),
        casterLevelText,
        dcText,
        description,
        referenceSpellId: matchedSpell?.id ?? null,
      })
    }
  }

  return dedupeBySourceUrl(result)
}

function projectClassAbilities(input: {
  className: string
  classSourceUrl: string | null
  classFeatures: ClassFeature[]
  spellMap: Map<string, { id: string; name: string }>
}): ParsedAbility[] {
  const result: ParsedAbility[] = []
  const classBaseUrl = input.classSourceUrl ?? `class:${slugify(input.className)}`

  for (const feature of input.classFeatures) {
    const rawName = cleanText(feature.name)
    const description = cleanText(feature.description)
    if (!rawName || !description) continue

    const abilityType = inferClassAbilityType(rawName, description)
    if (!abilityType) continue

    const cleanName = rawName
    if (!cleanName) continue

    const matchedSpell = input.spellMap.get(normalizeSpellKey(cleanName)) ?? null
    const sourceUrl = `${classBaseUrl}#${slugify(cleanName)}`

    result.push({
      name: cleanName,
      abilityType,
      sourceCategory: 'class',
      sourceUrl,
      sourceParentName: input.className,
      sourceOptionName: cleanName,
      levelRequirement: feature.level ?? null,
      frequencyText: extractFrequencyText(description),
      usesPerDay: parseUsesFromDescription(description),
      casterLevelText: extractCasterLevelText(description),
      dcText: extractDcText(description),
      description,
      referenceSpellId: matchedSpell?.id ?? null,
    })
  }

  return dedupeBySourceUrl(result)
}

function projectArchetypeAbilities(input: {
  archetypeName: string
  className: string | null
  archetypeSourceUrl: string | null
  gainedFeatures: ArchetypeFeature[]
  spellMap: Map<string, { id: string; name: string }>
}): ParsedAbility[] {
  const result: ParsedAbility[] = []
  const archetypeBaseUrl = input.archetypeSourceUrl ?? `archetype:${slugify(input.archetypeName)}`

  for (const feature of input.gainedFeatures) {
    const rawName = cleanText(feature.name)
    const description = cleanText(feature.description)
    if (!rawName || !description) continue

    const abilityType = inferClassAbilityType(rawName, description)
    if (!abilityType) continue

    const matchedSpell = input.spellMap.get(normalizeSpellKey(rawName)) ?? null
    const sourceUrl = `${archetypeBaseUrl}#${slugify(rawName)}`

    result.push({
      name: rawName,
      abilityType,
      sourceCategory: 'archetype',
      sourceUrl,
      sourceParentName: input.className ?? input.archetypeName,
      sourceOptionName: input.archetypeName,
      levelRequirement: feature.level ?? null,
      frequencyText: extractFrequencyText(description),
      usesPerDay: parseUsesFromDescription(description),
      casterLevelText: extractCasterLevelText(description),
      dcText: extractDcText(description),
      description,
      referenceSpellId: matchedSpell?.id ?? null,
    })
  }

  return dedupeBySourceUrl(result)
}

function looksLikeSpellLikeAbility(description: string): boolean {
  const normalized = description.toLowerCase()
  return normalized.includes('spell-like ability') || normalized.includes('spell-like abilities')
}

function extractSpellEntries(description: string): Array<{ frequency: string; spellName: string }> {
  const entries: Array<{ frequency: string; spellName: string }> = []
  const normalized = description.replace(/[–—]/g, '-')

  for (const match of normalized.matchAll(FREQUENCY_SEGMENT_RE)) {
    const frequency = cleanText(match[1])
    const rawList = cleanText(match[2])
    if (!frequency || !rawList) continue

    for (const spellName of splitSpellList(rawList)) {
      entries.push({ frequency, spellName })
    }
  }

  return entries
}

function splitSpellList(rawList: string): string[] {
  return rawList
    .replace(/\band\b/gi, ',')
    .split(',')
    .map(part => cleanText(part))
    .filter((value): value is string => Boolean(value))
    .map(value => value.replace(/\bas\b.*$/i, '').trim())
    .map(value => value.replace(/\([^)]*\)/g, '').trim())
    .map(value => value.replace(/\s+/g, ' '))
    .filter(value => value.length > 0)
}

function extractSentence(text: string, pattern: RegExp): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/)
  for (const sentence of sentences) {
    if (pattern.test(sentence)) return cleanText(sentence)
  }
  return null
}

function extractCasterLevelText(text: string): string | null {
  return extractSentence(text, /caster level/i)
}

function extractDcText(text: string): string | null {
  return (
    extractSentence(text, /\bDC\s+for\b/i) ??
    extractSentence(text, /\bsave DC\b/i) ??
    extractSentence(text, /\bdifficulty class\b/i)
  )
}

function extractFrequencyText(text: string): string | null {
  const match = text.match(EXPLICIT_FREQUENCY_RE)
  return cleanText(match?.[1] ?? null)
}

function parseUsesPerDay(frequency: string): number | null {
  const normalized = frequency.trim().toLowerCase()
  if (normalized === 'once per day') return 1
  if (normalized === 'twice per day') return 2
  if (normalized === 'three times per day') return 3

  const match = normalized.match(/^(\d+)\/day$/)
  return match ? Number(match[1]) : null
}

function parseUsesFromDescription(description: string): number | null {
  const frequency = extractFrequencyText(description)
  return frequency ? parseUsesPerDay(frequency) : null
}

function inferClassAbilityType(name: string, description: string): ParsedAbility['abilityType'] | null {
  if (/\((sp|su|ex)\)\s*$/i.test(name)) {
    const marker = name.match(/\((sp|su|ex)\)\s*$/i)?.[1]?.toLowerCase()
    if (marker === 'sp') return 'spell-like'
    if (marker === 'su') return 'supernatural'
    if (marker === 'ex') return 'extraordinary'
  }

  if (/\bas a spell-like ability\b/i.test(description)) {
    return 'spell-like'
  }
  if (/\bcan use [a-z0-9'\/ -]+, as the spell\b/i.test(description)) {
    return 'spell-like'
  }
  if (/\bcan cast [a-z0-9'\/ -]+(?: once per day| at will| \d+\/day)? as a spell-like ability\b/i.test(description)) {
    return 'spell-like'
  }
  if (/\bthis ability is the equivalent of a spell\b/i.test(description)) {
    return 'spell-like'
  }

  if (/\bgains the supernatural ability to\b/i.test(description)) {
    return 'supernatural'
  }
  if (/\bthis is a supernatural ability\b/i.test(description)) {
    return 'supernatural'
  }

  if (/\bgains the extraordinary ability to\b/i.test(description)) {
    return 'extraordinary'
  }
  if (/\bthis is an extraordinary ability\b/i.test(description)) {
    return 'extraordinary'
  }

  return null
}

function normalizeSpellKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned || null
}

function dedupeBySourceUrl<T extends { sourceUrl: string }>(abilities: T[]): T[] {
  const seen = new Set<string>()
  return abilities.filter(ability => {
    if (seen.has(ability.sourceUrl)) return false
    seen.add(ability.sourceUrl)
    return true
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
