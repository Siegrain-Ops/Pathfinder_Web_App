// ---------------------------------------------------------------------------
// base-importer.ts — generic import pipeline
//
// Usage:
//   const importer: EntityImporter<MyParsed> = { ... }
//   const opts = parseCliOptions()
//   await runImport(importer, opts)
// ---------------------------------------------------------------------------

import { fetchHtml, sleep } from './scraper'

// ── Public types ─────────────────────────────────────────────────────────────

export interface RunOptions {
  /** Skip DB writes; only fetch and parse. */
  dryRun:  boolean
  /** Print parsed object before every upsert. */
  debug:   boolean
  /** Cap total entities processed after link discovery. */
  limit?:  number
  /** For alphabetical sources — process only this single letter (e.g. "f"). */
  letter?: string
}

export type UpsertResult = 'created' | 'updated'

export interface ImportStats {
  created: number
  updated: number
  skipped: number
  failed:  number
}

/**
 * Implement this interface for each entity type.
 *
 * T must have at least { name: string } so progress lines can be printed.
 */
export interface EntityImporter<T extends { name: string }> {
  /** Human label shown in the banner, e.g. "Spell", "Feat", "Monster". */
  label: string

  /**
   * Return the list of *index* URLs to crawl.
   * These are pages that contain links to individual entity pages.
   * opts.letter may be used to narrow the list.
   */
  listUrls: (opts: RunOptions) => string[]

  /**
   * Given the HTML of an index page, return all entity-page URLs.
   * baseUrl is the origin of that index page (for resolving relative links).
   */
  extractLinks: (html: string, baseUrl: string) => string[]

  /**
   * Parse one entity-detail HTML page.
   * Return null if the page cannot be meaningfully parsed.
   */
  parsePage: (html: string, url: string) => T | null

  /**
   * Write one entity to the database.
   * Must be idempotent (upsert by sourceUrl or equivalent natural key).
   */
  upsert: (entity: T) => Promise<UpsertResult>

  /** Max simultaneous in-flight HTTP requests (default 8). */
  concurrency?: number

  /** Milliseconds to sleep before each HTTP request (default 200). */
  requestDelayMs?: number
}

// ── CLI option parser ─────────────────────────────────────────────────────────

export function parseCliOptions(): RunOptions {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    debug:  args.includes('--debug'),
    limit:  parseIntFlag(args, '--limit'),
    letter: parseStrFlag(args, '--letter'),
  }
}

function parseIntFlag(args: string[], flag: string): number | undefined {
  const i = args.indexOf(flag)
  if (i === -1 || i + 1 >= args.length) return undefined
  const n = parseInt(args[i + 1], 10)
  return isNaN(n) ? undefined : n
}

function parseStrFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  if (i === -1 || i + 1 >= args.length) return undefined
  return args[i + 1]
}

// ── Concurrency limiter ───────────────────────────────────────────────────────

type Limiter = <T>(fn: () => Promise<T>) => Promise<T>

function createLimiter(max: number): Limiter {
  let active = 0
  const queue: Array<() => void> = []

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++
        fn().then(resolve, reject).finally(() => {
          active--
          if (queue.length) queue.shift()!()
        })
      }
      active < max ? run() : queue.push(run)
    })
  }
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runImport<T extends { name: string }>(
  importer: EntityImporter<T>,
  opts:     RunOptions,
): Promise<void> {
  const delay = importer.requestDelayMs ?? 200
  const conc  = importer.concurrency   ?? 8
  const limit = createLimiter(conc)

  // Banner
  console.log('─'.repeat(55))
  console.log(`  Pathfinder 1e — ${importer.label} Importer`)
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.letter) console.log(`  Letter  : ${opts.letter}`)
  if (opts.limit)  console.log(`  Limit   : ${opts.limit}`)
  console.log('─'.repeat(55))

  // ── Step 1: collect entity URLs from all index pages ──────────────────────
  const indexUrls = importer.listUrls(opts)
  const allLinks: string[] = []

  for (const pageUrl of indexUrls) {
    try {
      await sleep(delay)
      const html  = await fetchHtml(pageUrl)
      const links = importer.extractLinks(html, new URL(pageUrl).origin)
      allLinks.push(...links)
      console.log(`  index: ${pageUrl} → ${links.length} links`)
    } catch (err) {
      console.warn(`  [warn] index page failed: ${pageUrl} — ${String(err)}`)
    }
  }

  // Deduplicate and cap
  const unique = [...new Set(allLinks)]
  const work   = opts.limit ? unique.slice(0, opts.limit) : unique
  const total  = work.length

  console.log(`\nEntities to process: ${total}\n`)

  // ── Step 2: fetch + parse + upsert (concurrent) ────────────────────────────
  const stats: ImportStats = { created: 0, updated: 0, skipped: 0, failed: 0 }
  let idx = 0

  const tasks = work.map(url =>
    limit(async () => {
      const n = ++idx
      try {
        await sleep(delay)
        const html   = await fetchHtml(url)
        const entity = importer.parsePage(html, url)

        if (!entity) {
          process.stdout.write(`[${n}/${total}] SKIP (unparseable): ${url}\n`)
          stats.skipped++
          return
        }

        if (opts.debug) {
          console.log(`\n[DEBUG] ${entity.name}:`)
          console.log(JSON.stringify(entity, null, 2))
        }

        process.stdout.write(`[${n}/${total}] ${entity.name}\n`)

        if (opts.dryRun) {
          stats.skipped++
          return
        }

        const result = await importer.upsert(entity)
        if (result === 'created') stats.created++
        else                      stats.updated++
      } catch (err) {
        process.stdout.write(`[${n}/${total}] FAIL: ${url} — ${String(err)}\n`)
        stats.failed++
      }
    })
  )

  await Promise.all(tasks)

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(55))
  console.log(`  Imported : ${stats.created}`)
  console.log(`  Updated  : ${stats.updated}`)
  console.log(`  Skipped  : ${stats.skipped}`)
  console.log(`  Failed   : ${stats.failed}`)
  console.log('─'.repeat(55))
}
