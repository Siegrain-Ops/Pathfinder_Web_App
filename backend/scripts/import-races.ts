import 'dotenv/config'
import { prisma } from '../src/common/db/prisma'
import { fetchHtml } from './lib/scraper'
import {
  parseRaceListPage,
  parseRacePage,
  type ParsedRaceIndexEntry,
} from './lib/parser-races'
import { parseCliOptions } from './lib/base-importer'

const RACES_URL = 'https://www.d20pfsrd.com/races/'

async function upsertRace(race: ParsedRaceIndexEntry & {
  raceType: string | null
  size: string | null
  baseSpeed: number | null
  abilityModifiers: Record<string, number> | null
  languages: string[] | null
  description: string | null
  traits: Array<{ name?: string; description?: string; type?: string }> | null
}) {
  const existing = await prisma.referenceRace.findUnique({
    where: { sourceUrl: race.sourceUrl },
    select: { id: true },
  })

  await prisma.referenceRace.upsert({
    where: { sourceUrl: race.sourceUrl },
    create: {
      name: race.name,
      raceType: race.raceType,
      category: race.category,
      size: race.size,
      baseSpeed: race.baseSpeed,
      abilityModifiers: race.abilityModifiers as never,
      languages: race.languages as never,
      traits: race.traits as never,
      description: race.description,
      sourceName: 'd20pfsrd.com',
      sourceUrl: race.sourceUrl,
    },
    update: {
      name: race.name,
      raceType: race.raceType,
      category: race.category,
      size: race.size,
      baseSpeed: race.baseSpeed,
      abilityModifiers: race.abilityModifiers as never,
      languages: race.languages as never,
      traits: race.traits as never,
      description: race.description,
    },
  })

  return existing ? 'updated' : 'created'
}

async function main() {
  const opts = parseCliOptions()

  console.log('='.repeat(55))
  console.log('  Pathfinder 1e - Race Importer')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.limit) console.log(`  Limit   : ${opts.limit}`)
  console.log('='.repeat(55))

  const listHtml = await fetchHtml(RACES_URL)
  let races = parseRaceListPage(listHtml)

  console.log(`Parsed ${races.length} race entries from source page.`)

  if (opts.limit) races = races.slice(0, opts.limit)

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < races.length; i++) {
    const race = races[i]

    try {
      const detailHtml = await fetchHtml(race.sourceUrl)
      const detail = parseRacePage(detailHtml, race.sourceUrl)
      const merged = {
        ...race,
        raceType: detail?.raceType ?? null,
        size: detail?.size ?? null,
        baseSpeed: detail?.baseSpeed ?? null,
        abilityModifiers: detail?.abilityModifiers ?? null,
        languages: detail?.languages ?? null,
        description: detail?.description ?? null,
        traits: detail?.traits ?? null,
      }

      process.stdout.write(`[${i + 1}/${races.length}] ${merged.name}`)

      if (opts.debug) {
        console.log('\n' + JSON.stringify(merged, null, 2))
      }

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertRace(merged)
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
