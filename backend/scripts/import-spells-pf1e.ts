#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// import-spells-pf1e.ts — offline Pathfinder 1e spell importer
//
// Source:  https://www.d20pfsrd.com/magic/all-spells/
// Method:  1. Fetch alphabetical index pages to collect spell URLs.
//          2. Fetch each spell's detail page and parse it.
//          3. Upsert into MySQL via Prisma.
//
// Usage:
//   npm run import:spells                  # full import
//   npm run import:spells -- --limit 20    # test with 20 spells
//   npm run import:spells -- --letter a    # import only letter A
//   npm run import:spells -- --dry-run     # parse but don't write to DB
// ---------------------------------------------------------------------------

import dotenv from 'dotenv'
dotenv.config()

import { prisma }           from '../src/common/db/prisma'
import { fetchHtml, sleep } from './lib/scraper'
import { parseSpellPage, parseSpellIndexPage } from './lib/parser-spells'

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL   = 'https://www.d20pfsrd.com'
const INDEX_BASE = `${BASE_URL}/magic/all-spells`
const DELAY_MS   = 600   // ms between HTTP requests — be polite
const EDITION    = 'PF1e'

const args       = process.argv.slice(2)
const limitArg   = args.includes('--limit')   ? Number(args[args.indexOf('--limit')   + 1]) : Infinity
const letterArg  = args.includes('--letter')  ? args[args.indexOf('--letter')  + 1]         : null
const dryRun     = args.includes('--dry-run')

// ── Counters ─────────────────────────────────────────────────────────────────

const stats = { imported: 0, updated: 0, skipped: 0, failed: 0 }

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) { process.stdout.write(msg + '\n') }
function warn(msg: string) { process.stderr.write('[warn] ' + msg + '\n') }

// ── Main ─────────────────────────────────────────────────────────────────────

async function importSpell(url: string): Promise<void> {
  let html: string
  try {
    html = await fetchHtml(url)
  } catch (err) {
    warn(`fetch failed: ${url} — ${(err as Error).message}`)
    stats.failed++
    return
  }

  const parsed = parseSpellPage(html, url)
  if (!parsed) {
    warn(`parse failed (no name extracted): ${url}`)
    stats.failed++
    return
  }

  if (!parsed.name) {
    warn(`skipping: empty name at ${url}`)
    stats.skipped++
    return
  }

  if (dryRun) {
    log(`  [dry-run] would upsert: ${parsed.name}`)
    stats.imported++
    return
  }

  try {
    const existing = await prisma.referenceSpell.findUnique({ where: { sourceUrl: url } })

    await prisma.referenceSpell.upsert({
      where:  { sourceUrl: url },
      create: {
        name:            parsed.name,
        school:          parsed.school,
        subschool:       parsed.subschool,
        descriptor:      parsed.descriptor,
        spellLevelJson:  parsed.spellLevelJson,
        castingTime:     parsed.castingTime,
        components:      parsed.components,
        rangeText:       parsed.rangeText,
        targetText:      parsed.targetText,
        areaText:        parsed.areaText,
        effectText:      parsed.effectText,
        durationText:    parsed.durationText,
        savingThrow:     parsed.savingThrow,
        spellResistance: parsed.spellResistance,
        description:     parsed.description,
        sourceName:      'd20pfsrd.com',
        sourceUrl:       url,
        edition:         EDITION,
      },
      update: {
        name:            parsed.name,
        school:          parsed.school,
        subschool:       parsed.subschool,
        descriptor:      parsed.descriptor,
        spellLevelJson:  parsed.spellLevelJson,
        castingTime:     parsed.castingTime,
        components:      parsed.components,
        rangeText:       parsed.rangeText,
        targetText:      parsed.targetText,
        areaText:        parsed.areaText,
        effectText:      parsed.effectText,
        durationText:    parsed.durationText,
        savingThrow:     parsed.savingThrow,
        spellResistance: parsed.spellResistance,
        description:     parsed.description,
        sourceName:      'd20pfsrd.com',
      },
    })

    existing ? stats.updated++ : stats.imported++
    log(`  ✔ ${parsed.name}`)
  } catch (err) {
    warn(`db write failed for ${parsed.name}: ${(err as Error).message}`)
    stats.failed++
  }
}

async function collectSpellUrls(): Promise<string[]> {
  const letters = letterArg ? [letterArg] : 'abcdefghijklmnopqrstuvwxyz'.split('')
  const all: string[] = []

  for (const letter of letters) {
    const indexUrl = `${INDEX_BASE}/${letter}/`
    log(`Fetching index page: ${indexUrl}`)
    try {
      const html = await fetchHtml(indexUrl)
      const urls = parseSpellIndexPage(html, BASE_URL)
      log(`  Found ${urls.length} spells under '${letter}'`)
      all.push(...urls)
    } catch (err) {
      warn(`index fetch failed for letter '${letter}': ${(err as Error).message}`)
    }
    await sleep(DELAY_MS)
  }

  return all
}

async function main() {
  log('─────────────────────────────────────────')
  log('  Pathfinder 1e — Spell Importer')
  log(`  Source:  ${BASE_URL}`)
  log(`  Dry run: ${dryRun}`)
  log('─────────────────────────────────────────')

  const allUrls = await collectSpellUrls()
  const urls    = allUrls.slice(0, Number.isFinite(limitArg) ? limitArg : allUrls.length)

  log(`\nStarting import of ${urls.length} spells…\n`)

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    process.stdout.write(`[${i + 1}/${urls.length}] `)
    await importSpell(url)
    if (i < urls.length - 1) await sleep(DELAY_MS)
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
