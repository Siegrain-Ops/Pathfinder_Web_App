import 'dotenv/config'
import { prisma } from '../src/common/db/prisma'
import { fetchHtml } from './lib/scraper'
import { parseCliOptions } from './lib/base-importer'
import {
  parseArcaneDiscoveryListPage,
  parseDiscoveryListPage,
  parseDiscoveryPage,
} from './lib/parser-discoveries'

const DISCOVERIES_URL = 'https://www.d20pfsrd.com/classes/base-classes/alchemist/discoveries/'
const ARCANE_DISCOVERIES_URL = 'https://www.d20pfsrd.com/classes/core-classes/wizard/arcane-discoveries/'

type ParsedDiscovery = NonNullable<ReturnType<typeof parseDiscoveryPage>>

async function upsertDiscovery(discovery: ParsedDiscovery) {
  const existing = await prisma.referenceDiscovery.findUnique({
    where: { sourceUrl: discovery.sourceUrl },
    select: { id: true },
  })

  await prisma.referenceDiscovery.upsert({
    where: { sourceUrl: discovery.sourceUrl },
    create: {
      name: discovery.name,
      className: discovery.className,
      prerequisites: discovery.prerequisites,
      abilityType: discovery.abilityType,
      description: discovery.description,
      sourceName: discovery.sourceName,
      sourceUrl: discovery.sourceUrl,
    },
    update: {
      name: discovery.name,
      className: discovery.className,
      prerequisites: discovery.prerequisites,
      abilityType: discovery.abilityType,
      description: discovery.description,
      sourceName: discovery.sourceName,
    },
  })

  return existing ? 'updated' : 'created'
}

async function main() {
  const opts = parseCliOptions()

  console.log('='.repeat(55))
  console.log('  Pathfinder 1e - Discovery Importer')
  console.log('  Scope   : Paizo alchemist discoveries + wizard arcane discoveries')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.limit) console.log(`  Limit   : ${opts.limit}`)
  console.log('='.repeat(55))

  const listHtml = await fetchHtml(DISCOVERIES_URL)
  const arcaneListHtml = await fetchHtml(ARCANE_DISCOVERIES_URL)
  let discoveries = dedupeDiscoveryEntries([
    ...parseDiscoveryListPage(listHtml),
    ...parseArcaneDiscoveryListPage(arcaneListHtml),
  ])
  if (opts.limit) discoveries = discoveries.slice(0, opts.limit)

  console.log(`Discovered ${discoveries.length} discoveries.\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (let index = 0; index < discoveries.length; index++) {
    const entry = discoveries[index]

    try {
      const html = await fetchHtml(entry.sourceUrl)
      const discovery = parseDiscoveryPage(html, entry.sourceUrl, entry)
      if (!discovery) {
        process.stdout.write(`[${index + 1}/${discoveries.length}] SKIP: ${entry.sourceUrl}\n`)
        skipped++
        continue
      }

      process.stdout.write(`[${index + 1}/${discoveries.length}] ${discovery.name}`)
      if (opts.debug) console.log('\n' + JSON.stringify(discovery, null, 2))

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertDiscovery(discovery)
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

function dedupeDiscoveryEntries<T extends { sourceUrl: string }>(entries: T[]): T[] {
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
