// ---------------------------------------------------------------------------
// import-feats.ts - PF1e feat importer
//
// Usage:
//   npm run import:feats
//   npm run import:feats -- --dry-run
//   npm run import:feats -- --debug --limit 50
// ---------------------------------------------------------------------------

import 'dotenv/config'
import { prisma } from '../src/common/db/prisma'
import { parseCliOptions } from './lib/base-importer'
import { parseFeatListPage, parseFeatPage, type ParsedFeat, type ParsedFeatIndex } from './lib/parser-feats'
import { fetchHtml, sleep } from './lib/scraper'

const BASE_URL = 'https://www.d20pfsrd.com'
const LIST_URL = `${BASE_URL}/feats/`
const CONCURRENCY = 6
const REQUEST_DELAY_MS = 250

async function upsertFeat(feat: ParsedFeat): Promise<'created' | 'updated'> {
  const existing = await prisma.referenceFeat.findUnique({
    where: { sourceUrl: feat.sourceUrl },
    select: { id: true },
  })

  await prisma.referenceFeat.upsert({
    where: { sourceUrl: feat.sourceUrl },
    create: {
      name: feat.name,
      featType: feat.featType,
      prerequisites: feat.prerequisites,
      benefit: feat.benefit,
      normalText: feat.normalText,
      specialText: feat.specialText,
      description: feat.description,
      sourceName: 'd20pfsrd.com',
      sourceUrl: feat.sourceUrl,
    },
    update: {
      name: feat.name,
      featType: feat.featType,
      prerequisites: feat.prerequisites,
      benefit: feat.benefit,
      normalText: feat.normalText,
      specialText: feat.specialText,
      description: feat.description,
    },
  })

  return existing ? 'updated' : 'created'
}

function createLimiter(max: number) {
  let active = 0
  const queue: Array<() => void> = []

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++
        fn().then(resolve, reject).finally(() => {
          active--
          if (queue.length > 0) queue.shift()?.()
        })
      }

      if (active < max) run()
      else queue.push(run)
    })
  }
}

async function fetchAndParseFeat(entry: ParsedFeatIndex): Promise<ParsedFeat | null> {
  await sleep(REQUEST_DELAY_MS)
  const html = await fetchHtml(entry.sourceUrl)
  return parseFeatPage(html, entry.sourceUrl, entry)
}

async function main() {
  const opts = parseCliOptions()

  console.log('─'.repeat(55))
  console.log('  Pathfinder 1e - Feat Importer')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.limit) console.log(`  Limit   : ${opts.limit}`)
  console.log('─'.repeat(55))

  const listHtml = await fetchHtml(LIST_URL)
  let entries = parseFeatListPage(listHtml, BASE_URL)

  console.log(`Parsed ${entries.length} feat links from source page.`)

  if (opts.limit) entries = entries.slice(0, opts.limit)

  const total = entries.length
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 }
  const limit = createLimiter(CONCURRENCY)

  console.log(`\nEntities to process: ${total}\n`)

  await Promise.all(entries.map((entry, index) =>
    limit(async () => {
      try {
        const feat = await fetchAndParseFeat(entry)
        if (!feat) {
          process.stdout.write(`[${index + 1}/${total}] SKIP (unparseable): ${entry.sourceUrl}\n`)
          stats.skipped++
          return
        }

        process.stdout.write(`[${index + 1}/${total}] ${feat.name}\n`)

        if (opts.debug) {
          console.log(JSON.stringify(feat, null, 2))
        }

        if (opts.dryRun) {
          stats.skipped++
          return
        }

        const result = await upsertFeat(feat)
        if (result === 'created') stats.created++
        else stats.updated++
      } catch (error) {
        process.stdout.write(`[${index + 1}/${total}] FAIL: ${entry.sourceUrl} - ${String(error)}\n`)
        stats.failed++
      }
    })
  ))

  console.log('\n' + '─'.repeat(55))
  console.log(`  Imported : ${stats.created}`)
  console.log(`  Updated  : ${stats.updated}`)
  console.log(`  Skipped  : ${stats.skipped}`)
  console.log(`  Failed   : ${stats.failed}`)
  console.log('─'.repeat(55))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
