#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// import-feats-pf1e.ts — offline Pathfinder 1e feat importer
//
// Source:  https://www.d20pfsrd.com/feats/all-feats
// Method:  Fetches the single all-feats table page and upserts each row.
//          Much faster than the spell importer — typically one HTTP request.
//
// Usage:
//   npm run import:feats                # full import
//   npm run import:feats -- --dry-run  # parse but don't write to DB
// ---------------------------------------------------------------------------

import dotenv from 'dotenv'
dotenv.config()

import { prisma }           from '../src/common/db/prisma'
import { fetchHtml, sleep } from './lib/scraper'
import { parseFeatListPage } from './lib/parser-feats'

// ── Config ──────────────────────────────────────────────────────────────────

const SOURCE_URL  = 'https://www.d20pfsrd.com/feats/all-feats'
const SOURCE_NAME = 'd20pfsrd.com'
const EDITION     = 'PF1e'
const DELAY_MS    = 300   // between individual page fetches (if detail pages added later)

const args   = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

// ── Counters ─────────────────────────────────────────────────────────────────

const stats = { imported: 0, updated: 0, skipped: 0, failed: 0 }

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) { process.stdout.write(msg + '\n') }
function warn(msg: string) { process.stderr.write('[warn] ' + msg + '\n') }

// ── Main ─────────────────────────────────────────────────────────────────────

async function importFeat(feat: ReturnType<typeof parseFeatListPage>[number]): Promise<void> {
  if (dryRun) {
    log(`  [dry-run] would upsert: ${feat.name} (${feat.featType ?? 'General'})`)
    stats.imported++
    return
  }

  try {
    const existing = await prisma.referenceFeat.findUnique({ where: { sourceUrl: feat.sourceUrl } })

    await prisma.referenceFeat.upsert({
      where:  { sourceUrl: feat.sourceUrl },
      create: {
        name:          feat.name,
        featType:      feat.featType,
        prerequisites: feat.prerequisites,
        benefit:       feat.benefit,
        normalText:    null,
        specialText:   null,
        description:   feat.description,
        sourceName:    SOURCE_NAME,
        sourceUrl:     feat.sourceUrl,
        edition:       EDITION,
      },
      update: {
        name:          feat.name,
        featType:      feat.featType,
        prerequisites: feat.prerequisites,
        benefit:       feat.benefit,
        description:   feat.description,
        sourceName:    SOURCE_NAME,
      },
    })

    existing ? stats.updated++ : stats.imported++
  } catch (err) {
    warn(`db write failed for "${feat.name}": ${(err as Error).message}`)
    stats.failed++
  }
}

async function main() {
  log('─────────────────────────────────────────')
  log('  Pathfinder 1e — Feat Importer')
  log(`  Source:  ${SOURCE_URL}`)
  log(`  Dry run: ${dryRun}`)
  log('─────────────────────────────────────────')
  log('\nFetching feat list page…')

  let html: string
  try {
    html = await fetchHtml(SOURCE_URL)
  } catch (err) {
    console.error('Failed to fetch feat list:', err)
    process.exit(1)
  }

  const feats = parseFeatListPage(html)
  log(`Parsed ${feats.length} feats from source page.\n`)

  for (let i = 0; i < feats.length; i++) {
    const feat = feats[i]
    process.stdout.write(`[${i + 1}/${feats.length}] ${feat.name} `)

    if (!feat.name) {
      log('← skipped (empty name)')
      stats.skipped++
      continue
    }

    await importFeat(feat)
    log(`← ${feat.featType ?? 'General'}`)

    // Small delay every 100 feats to avoid any rate-limiting edge cases
    if (i > 0 && i % 100 === 0) await sleep(DELAY_MS)
  }

  log('\n─────────────────────────────────────────')
  log('  Import complete')
  log(`  Imported : ${stats.imported}`)
  log(`  Updated  : ${stats.updated}`)
  log(`  Skipped  : ${stats.skipped}`)
  log(`  Failed   : ${stats.failed}`)
  log('─────────────────────────────────────────')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => void prisma.$disconnect())
