import 'dotenv/config'
import { prisma } from '../src/common/db/prisma'
import { fetchHtml } from './lib/scraper'
import { parseCliOptions } from './lib/base-importer'
import {
  parseMysteryListPage,
  parseMysteryPage,
} from './lib/parser-mysteries'

const MYSTERIES_URL = 'https://www.d20pfsrd.com/classes/base-classes/oracle/mysteries/'

type ParsedMystery = NonNullable<ReturnType<typeof parseMysteryPage>>

async function upsertMystery(mystery: ParsedMystery) {
  const existing = await prisma.referenceMystery.findUnique({
    where: { sourceUrl: mystery.sourceUrl },
    select: { id: true },
  })

  await prisma.referenceMystery.upsert({
    where: { sourceUrl: mystery.sourceUrl },
    create: {
      name: mystery.name,
      className: mystery.className,
      description: mystery.description,
      classSkills: mystery.classSkills as never,
      bonusSpells: mystery.bonusSpells as never,
      revelations: mystery.revelations as never,
      finalRevelation: mystery.finalRevelation,
      sourceName: mystery.sourceName,
      sourceUrl: mystery.sourceUrl,
    },
    update: {
      name: mystery.name,
      className: mystery.className,
      description: mystery.description,
      classSkills: mystery.classSkills as never,
      bonusSpells: mystery.bonusSpells as never,
      revelations: mystery.revelations as never,
      finalRevelation: mystery.finalRevelation,
      sourceName: mystery.sourceName,
    },
  })

  return existing ? 'updated' : 'created'
}

async function upsertRevelations(mystery: ParsedMystery) {
  let created = 0
  let updated = 0

  for (const revelation of mystery.revelations ?? []) {
    const sourceUrl = `${mystery.sourceUrl.replace(/\/+$/, '')}#${slugify(revelation.name)}`
    const existing = await prisma.referenceRevelation.findUnique({
      where: { sourceUrl },
      select: { id: true },
    })

    await prisma.referenceRevelation.upsert({
      where: { sourceUrl },
      create: {
        name: revelation.name,
        mysteryName: mystery.name,
        className: mystery.className,
        levelRequirement: revelation.levelRequirement ?? null,
        abilityType: revelation.abilityType ?? null,
        description: revelation.description,
        sourceName: mystery.sourceName,
        sourceUrl,
      },
      update: {
        name: revelation.name,
        mysteryName: mystery.name,
        className: mystery.className,
        levelRequirement: revelation.levelRequirement ?? null,
        abilityType: revelation.abilityType ?? null,
        description: revelation.description,
        sourceName: mystery.sourceName,
      },
    })

    if (existing) updated++
    else created++
  }

  return { created, updated }
}

async function main() {
  const opts = parseCliOptions()

  console.log('='.repeat(55))
  console.log('  Pathfinder 1e - Mystery Importer')
  console.log('  Scope   : Paizo only')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.limit) console.log(`  Limit   : ${opts.limit}`)
  console.log('='.repeat(55))

  const listHtml = await fetchHtml(MYSTERIES_URL)
  let mysteries = parseMysteryListPage(listHtml)
  if (opts.limit) mysteries = mysteries.slice(0, opts.limit)

  console.log(`Discovered ${mysteries.length} mysteries.\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (let index = 0; index < mysteries.length; index++) {
    const entry = mysteries[index]

    try {
      const html = await fetchHtml(entry.sourceUrl)
      const mystery = parseMysteryPage(html, entry.sourceUrl)
      if (!mystery) {
        process.stdout.write(`[${index + 1}/${mysteries.length}] SKIP: ${entry.sourceUrl}\n`)
        skipped++
        continue
      }

      process.stdout.write(`[${index + 1}/${mysteries.length}] ${mystery.name}`)
      if (opts.debug) console.log('\n' + JSON.stringify(mystery, null, 2))

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const mysteryResult = await upsertMystery(mystery)
      const revelationStats = await upsertRevelations(mystery)
      if (mysteryResult === 'created') created++
      else updated++
      created += revelationStats.created
      updated += revelationStats.updated

      process.stdout.write(' +\n')
    } catch (error) {
      process.stdout.write(` FAIL: ${String(error)}\n`)
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
