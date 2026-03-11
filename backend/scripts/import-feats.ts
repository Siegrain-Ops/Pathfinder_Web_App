// ---------------------------------------------------------------------------
// import-feats.ts — PF1e feat importer (refactored with base framework)
//
// Usage:
//   npm run import:feats
//   npm run import:feats -- --dry-run
//   npm run import:feats -- --debug --limit 50
// ---------------------------------------------------------------------------

import 'dotenv/config'
import { prisma }                from '../src/common/db/prisma'
import { parseFeatListPage }     from './lib/parser-feats'
import { load }                  from './lib/html-utils'
import { runImport,
         parseCliOptions,
         type EntityImporter }   from './lib/base-importer'

const BASE_URL  = 'https://www.d20pfsrd.com'
const LIST_URL  = `${BASE_URL}/feats/all-feats`

interface FlatFeat {
  name:         string
  featType:     string | null
  prerequisites: string | null
  benefit:      string | null
  description:  string | null
  sourceUrl:    string
}

const importer: EntityImporter<FlatFeat> = {
  label: 'Feat',
  concurrency:    1,     // feat list is a single page — no concurrency needed
  requestDelayMs: 0,

  listUrls() {
    // All feats are on a single list page — no per-letter index needed.
    // We return a sentinel so extractLinks is called once with the full list HTML.
    return [LIST_URL]
  },

  extractLinks(_html, _baseUrl) {
    // For feats we parse all data directly from the list page, so we return
    // a single synthetic "url" that causes parsePage to be called once.
    return [`${LIST_URL}#all`]
  },

  // parsePage is not used here — all feats come from the index
  parsePage(_html, _url) { return null },

  async upsert(feat) {
    const existing = await prisma.referenceFeat.findUnique({
      where: { sourceUrl: feat.sourceUrl },
      select: { id: true },
    })

    await prisma.referenceFeat.upsert({
      where:  { sourceUrl: feat.sourceUrl },
      create: {
        name:          feat.name,
        featType:      feat.featType,
        prerequisites: feat.prerequisites,
        benefit:       feat.benefit,
        description:   feat.description,
        sourceName:    'd20pfsrd.com',
        sourceUrl:     feat.sourceUrl,
      },
      update: {
        name:          feat.name,
        featType:      feat.featType,
        prerequisites: feat.prerequisites,
        benefit:       feat.benefit,
        description:   feat.description,
      },
    })

    return existing ? 'updated' : 'created'
  },
}

// ── Override: feat list needs a different flow — fetch once, parse many ───────

async function main() {
  const opts = parseCliOptions()

  console.log('─'.repeat(55))
  console.log('  Pathfinder 1e — Feat Importer')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  console.log('─'.repeat(55))

  const { fetchHtml } = await import('./lib/scraper')
  const html  = await fetchHtml(LIST_URL)
  let feats   = parseFeatListPage(html, BASE_URL)

  console.log(`Parsed ${feats.length} feats from source page.`)

  if (opts.limit) feats = feats.slice(0, opts.limit)

  let created = 0, updated = 0, failed = 0

  for (let i = 0; i < feats.length; i++) {
    const f = feats[i]
    process.stdout.write(`[${i + 1}/${feats.length}] ${f.name}`)

    if (opts.debug) {
      console.log('\n' + JSON.stringify(f, null, 2))
    }

    if (opts.dryRun) {
      process.stdout.write(' (dry-run)\n')
      continue
    }

    try {
      const r = await importer.upsert(f as FlatFeat)
      process.stdout.write(r === 'created' ? ' ✓\n' : ' ~\n')
      if (r === 'created') created++; else updated++
    } catch (err) {
      process.stdout.write(` FAIL: ${String(err)}\n`)
      failed++
    }
  }

  console.log('\n' + '─'.repeat(55))
  console.log(`  Imported : ${created}`)
  console.log(`  Updated  : ${updated}`)
  console.log(`  Failed   : ${failed}`)
  console.log('─'.repeat(55))
}

main().catch(err => { console.error(err); process.exit(1) })
