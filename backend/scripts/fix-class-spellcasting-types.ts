import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SPELLCASTING_TYPE_BY_CLASS: Record<string, 'prepared' | 'spontaneous' | 'custom' | 'none'> = {
  Adept: 'prepared',
  Alchemist: 'custom',
  Antipaladin: 'prepared',
  Arcanist: 'prepared',
  Aristocrat: 'none',
  Barbarian: 'none',
  Bard: 'spontaneous',
  Bloodrager: 'spontaneous',
  Brawler: 'none',
  Cavalier: 'none',
  Cleric: 'prepared',
  Commoner: 'none',
  Druid: 'prepared',
  Expert: 'none',
  Fighter: 'none',
  Gunslinger: 'none',
  Hunter: 'prepared',
  Inquisitor: 'spontaneous',
  Investigator: 'custom',
  Magus: 'prepared',
  Monk: 'none',
  Ninja: 'none',
  Omdura: 'spontaneous',
  Oracle: 'spontaneous',
  Paladin: 'prepared',
  Ranger: 'prepared',
  Rogue: 'none',
  Samurai: 'none',
  Shaman: 'prepared',
  Shifter: 'none',
  Skald: 'spontaneous',
  Slayer: 'none',
  Sorcerer: 'spontaneous',
  Summoner: 'spontaneous',
  Swashbuckler: 'none',
  'Unchained Barbarian': 'none',
  'Unchained Monk': 'none',
  'Unchained Rogue': 'none',
  'Unchained Summoner': 'spontaneous',
  'Vampire Hunter': 'custom',
  Vigilante: 'none',
  Warpriest: 'prepared',
  Warrior: 'none',
  Witch: 'prepared',
  Wizard: 'prepared',
}

async function main() {
  const existing = await prisma.referenceClass.findMany({
    select: { id: true, name: true, spellcastingType: true },
    orderBy: { name: 'asc' },
  })

  const dbNames = new Set(existing.map(row => row.name))
  const mappedNames = new Set(Object.keys(SPELLCASTING_TYPE_BY_CLASS))

  const unmappedDbClasses = existing
    .map(row => row.name)
    .filter(name => !mappedNames.has(name))

  if (unmappedDbClasses.length > 0) {
    throw new Error(`Unmapped classes found in DB: ${unmappedDbClasses.join(', ')}`)
  }

  const extraMappedClasses = [...mappedNames].filter(name => !dbNames.has(name))
  if (extraMappedClasses.length > 0) {
    console.warn(`[fix-class-spellcasting-types] mappings not present in DB: ${extraMappedClasses.join(', ')}`)
  }

  let updated = 0

  for (const row of existing) {
    const nextType = SPELLCASTING_TYPE_BY_CLASS[row.name]
    if (!nextType || row.spellcastingType === nextType) continue

    await prisma.referenceClass.update({
      where: { id: row.id },
      data: { spellcastingType: nextType },
    })

    updated += 1
    console.log(`updated ${row.name}: ${row.spellcastingType ?? 'null'} -> ${nextType}`)
  }

  console.log(`[fix-class-spellcasting-types] done, updated ${updated} class records`)
}

main()
  .catch(error => {
    console.error('[fix-class-spellcasting-types] failed')
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
