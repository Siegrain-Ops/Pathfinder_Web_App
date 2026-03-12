import 'dotenv/config'
import { prisma } from '../src/common/db/prisma'
import { fetchHtml } from './lib/scraper'
import { parseCliOptions } from './lib/base-importer'
import {
  parseBloodlinePage,
  parseBloodragerBloodlineListPage,
  parseSorcererBloodlineListPage,
  type ParsedBloodlineIndexEntry,
} from './lib/parser-bloodlines'

const SORCERER_BLOODLINES_URL = 'https://www.d20pfsrd.com/classes/core-classes/sorcerer/bloodlines/'
const BLOODRAGER_BLOODLINES_URL = 'https://www.d20pfsrd.com/classes/hybrid-classes/bloodrager/bloodrager-bloodlines/'

async function upsertBloodline(entry: ReturnType<typeof parseBloodlinePage> extends infer T ? T extends object ? T : never : never) {
  const existing = await prisma.referenceBloodline.findUnique({
    where: { sourceUrl: entry.sourceUrl },
    select: { id: true },
  })

  await prisma.referenceBloodline.upsert({
    where: { sourceUrl: entry.sourceUrl },
    create: {
      name: entry.name,
      className: entry.className,
      description: entry.description,
      arcanaText: entry.arcanaText,
      powers: entry.powers as never,
      bonusSpells: entry.bonusSpells as never,
      bonusFeats: entry.bonusFeats as never,
      sourceName: entry.sourceName,
      sourceUrl: entry.sourceUrl,
    },
    update: {
      name: entry.name,
      className: entry.className,
      description: entry.description,
      arcanaText: entry.arcanaText,
      powers: entry.powers as never,
      bonusSpells: entry.bonusSpells as never,
      bonusFeats: entry.bonusFeats as never,
      sourceName: entry.sourceName,
    },
  })

  return existing ? 'updated' : 'created'
}

async function main() {
  const opts = parseCliOptions()

  console.log('='.repeat(55))
  console.log('  Pathfinder 1e - Bloodline Importer')
  console.log('  Scope   : Paizo only')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.limit) console.log(`  Limit   : ${opts.limit}`)
  console.log('='.repeat(55))

  const entries = await collectBloodlineEntries()
  const work = opts.limit ? entries.slice(0, opts.limit) : entries

  console.log(`Discovered ${entries.length} bloodlines.`)
  console.log(`To process : ${work.length}\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (let index = 0; index < work.length; index++) {
    const entry = work[index]

    try {
      const html = await fetchHtml(entry.sourceUrl)
      const detail = parseBloodlinePage(html, entry.sourceUrl, entry.className)
      if (!detail) {
        process.stdout.write(`[${index + 1}/${work.length}] SKIP: ${entry.sourceUrl}\n`)
        skipped++
        continue
      }

      process.stdout.write(`[${index + 1}/${work.length}] ${detail.name}`)

      if (opts.debug) {
        console.log('\n' + JSON.stringify(detail, null, 2))
      }

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertBloodline(detail as never)
      process.stdout.write(result === 'created' ? ' +\n' : ' ~\n')
      if (result === 'created') created++
      else updated++
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

async function collectBloodlineEntries(): Promise<ParsedBloodlineIndexEntry[]> {
  const sorcererHtml = await fetchHtml(SORCERER_BLOODLINES_URL)
  const bloodragerHtml = await fetchHtml(BLOODRAGER_BLOODLINES_URL)

  const entries = [
    ...parseSorcererBloodlineListPage(sorcererHtml),
    ...parseBloodragerBloodlineListPage(bloodragerHtml),
  ]

  const seen = new Set<string>()
  return entries.filter(entry => {
    if (seen.has(entry.sourceUrl)) return false
    seen.add(entry.sourceUrl)
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
