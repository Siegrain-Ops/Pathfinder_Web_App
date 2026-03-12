import 'dotenv/config'
import { prisma } from '../src/common/db/prisma'
import { fetchHtml } from './lib/scraper'
import { parseCliOptions } from './lib/base-importer'
import {
  parseDomainListPage,
  parseDomainPage,
} from './lib/parser-domains'

const DOMAINS_URL = 'https://www.d20pfsrd.com/classes/core-classes/cleric/domains/paizo-domains/'

async function upsertDomain(entry: ReturnType<typeof parseDomainPage> extends infer T ? T extends object ? T : never : never) {
  const existing = await prisma.referenceDomain.findUnique({
    where: { sourceUrl: entry.sourceUrl },
    select: { id: true },
  })

  await prisma.referenceDomain.upsert({
    where: { sourceUrl: entry.sourceUrl },
    create: {
      name: entry.name,
      parentDomainName: entry.parentDomainName,
      className: entry.className,
      description: entry.description,
      grantedPowers: entry.grantedPowers as never,
      domainSpells: entry.domainSpells as never,
      sourceName: entry.sourceName,
      sourceUrl: entry.sourceUrl,
    },
    update: {
      name: entry.name,
      parentDomainName: entry.parentDomainName,
      className: entry.className,
      description: entry.description,
      grantedPowers: entry.grantedPowers as never,
      domainSpells: entry.domainSpells as never,
      sourceName: entry.sourceName,
    },
  })

  return existing ? 'updated' : 'created'
}

async function main() {
  const opts = parseCliOptions()

  console.log('='.repeat(55))
  console.log('  Pathfinder 1e - Domain Importer')
  console.log('  Scope   : Paizo only')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.limit) console.log(`  Limit   : ${opts.limit}`)
  console.log('='.repeat(55))

  const listHtml = await fetchHtml(DOMAINS_URL)
  let domains = parseDomainListPage(listHtml)
  if (opts.limit) domains = domains.slice(0, opts.limit)

  console.log(`Discovered ${domains.length} domains/subdomains.\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (let index = 0; index < domains.length; index++) {
    const entry = domains[index]

    try {
      const html = await fetchHtml(entry.sourceUrl)
      const detail = parseDomainPage(html, entry.sourceUrl)
      if (!detail) {
        process.stdout.write(`[${index + 1}/${domains.length}] SKIP: ${entry.sourceUrl}\n`)
        skipped++
        continue
      }

      process.stdout.write(`[${index + 1}/${domains.length}] ${detail.name}`)
      if (opts.debug) console.log('\n' + JSON.stringify(detail, null, 2))

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertDomain(detail as never)
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

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
