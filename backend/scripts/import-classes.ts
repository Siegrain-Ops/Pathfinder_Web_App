import 'dotenv/config'
import { prisma } from '../src/common/db/prisma'
import { fetchHtml } from './lib/scraper'
import {
  parseClassListPage,
  parseClassPage,
  type ParsedClassIndexEntry,
} from './lib/parser-classes'
import { parseCliOptions } from './lib/base-importer'

const CLASSES_URL = 'https://www.d20pfsrd.com/classes/'

async function upsertClass(entry: ParsedClassIndexEntry & ReturnType<typeof parseClassPage> extends infer T ? T extends object ? Omit<T, 'name'> : never : never) {
  const existing = await prisma.referenceClass.findUnique({
    where: { sourceUrl: entry.sourceUrl },
    select: { id: true },
  })

  await prisma.referenceClass.upsert({
    where: { sourceUrl: entry.sourceUrl },
    create: {
      name: entry.name,
      category: entry.category,
      role: entry.role,
      alignmentText: entry.alignmentText,
      description: entry.description,
      hitDie: entry.hitDie,
      skillRanks: entry.skillRanks,
      classSkills: entry.classSkills as never,
      weaponArmorProficiency: entry.weaponArmorProficiency,
      startingWealth: entry.startingWealth,
      babProgression: entry.babProgression,
      goodSaves: entry.goodSaves,
      spellcastingType: entry.spellcastingType,
      castingStat: entry.castingStat,
      progressionTable: entry.progressionTable as never,
      classFeatures: entry.classFeatures as never,
      sourceName: 'd20pfsrd.com',
      sourceUrl: entry.sourceUrl,
    },
    update: {
      name: entry.name,
      category: entry.category,
      role: entry.role,
      alignmentText: entry.alignmentText,
      description: entry.description,
      hitDie: entry.hitDie,
      skillRanks: entry.skillRanks,
      classSkills: entry.classSkills as never,
      weaponArmorProficiency: entry.weaponArmorProficiency,
      startingWealth: entry.startingWealth,
      babProgression: entry.babProgression,
      goodSaves: entry.goodSaves,
      spellcastingType: entry.spellcastingType,
      castingStat: entry.castingStat,
      progressionTable: entry.progressionTable as never,
      classFeatures: entry.classFeatures as never,
    },
  })

  return existing ? 'updated' : 'created'
}

async function main() {
  const opts = parseCliOptions()

  console.log('='.repeat(55))
  console.log('  Pathfinder 1e - Class Importer')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.limit) console.log(`  Limit   : ${opts.limit}`)
  console.log('='.repeat(55))

  const listHtml = await fetchHtml(CLASSES_URL)
  let classes = parseClassListPage(listHtml)

  console.log(`Parsed ${classes.length} class entries from source page.`)

  if (opts.limit) classes = classes.slice(0, opts.limit)

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < classes.length; i++) {
    const entry = classes[i]

    try {
      const detailHtml = await fetchHtml(entry.sourceUrl)
      const detail = parseClassPage(detailHtml, entry.sourceUrl)
      if (!detail) {
        process.stdout.write(`[${i + 1}/${classes.length}] SKIP: ${entry.sourceUrl}\n`)
        skipped++
        continue
      }

      const merged = {
        ...entry,
        ...detail,
      }

      process.stdout.write(`[${i + 1}/${classes.length}] ${merged.name}`)

      if (opts.debug) {
        console.log('\n' + JSON.stringify(merged, null, 2))
      }

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertClass(merged as never)
      process.stdout.write(result === 'created' ? ' +\n' : ' ~\n')
      if (result === 'created') created++
      else updated++
    } catch (err) {
      process.stdout.write(` FAIL: ${String(err)}\n`)
      failed++
    }
  }

  console.log('\n' + '='.repeat(55))
  console.log(`  Imported : ${created}`)
  console.log(`  Updated  : ${updated}`)
  console.log(`  Skipped  : ${skipped}`)
  console.log(`  Failed   : ${failed}`)
  console.log('='.repeat(55))
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
