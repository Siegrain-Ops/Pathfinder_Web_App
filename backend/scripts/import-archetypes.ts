import 'dotenv/config'
import { prisma } from '../src/common/db/prisma'
import { fetchHtml } from './lib/scraper'
import { parseCliOptions } from './lib/base-importer'
import {
  parseArchetypeListPage,
  parseArchetypePage,
} from './lib/parser-archetypes'

function toArchetypesUrl(classUrl: string): string {
  return `${classUrl.replace(/\/+$/, '')}/archetypes/`
}

async function upsertArchetype(entry: {
  name: string
  className: string | null
  description: string | null
  replacedFeatures: Array<{ level?: number; name: string }> | null
  gainedFeatures: Array<{ level?: number; name: string; description: string }> | null
  sourceName: string
  sourceUrl: string
}) {
  const classRecord = entry.className
    ? await prisma.referenceClass.findFirst({
        where: { name: entry.className },
        select: { id: true },
      })
    : null

  const existing = await prisma.referenceArchetype.findUnique({
    where: { sourceUrl: entry.sourceUrl },
    select: { id: true },
  })

  await prisma.referenceArchetype.upsert({
    where: { sourceUrl: entry.sourceUrl },
    create: {
      name: entry.name,
      className: entry.className,
      classId: classRecord?.id ?? null,
      description: entry.description,
      replacedFeatures: entry.replacedFeatures as never,
      gainedFeatures: entry.gainedFeatures as never,
      sourceName: entry.sourceName,
      sourceUrl: entry.sourceUrl,
    },
    update: {
      name: entry.name,
      className: entry.className,
      classId: classRecord?.id ?? null,
      description: entry.description,
      replacedFeatures: entry.replacedFeatures as never,
      gainedFeatures: entry.gainedFeatures as never,
      sourceName: entry.sourceName,
    },
  })

  return existing ? 'updated' : 'created'
}

async function main() {
  const opts = parseCliOptions()

  console.log('='.repeat(55))
  console.log('  Pathfinder 1e - Archetype Importer')
  console.log('  Scope   : Paizo only')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.limit) console.log(`  Limit   : ${opts.limit}`)
  console.log('='.repeat(55))

  const classes = await prisma.referenceClass.findMany({
    select: {
      name: true,
      sourceUrl: true,
    },
    orderBy: { name: 'asc' },
  })

  const archetypeEntries: Array<{ name: string; className: string | null; sourceUrl: string }> = []
  const seen = new Set<string>()

  for (const referenceClass of classes) {
    if (!referenceClass.sourceUrl) continue

    const archetypesUrl = toArchetypesUrl(referenceClass.sourceUrl)

    try {
      const html = await fetchHtml(archetypesUrl)
      const entries = parseArchetypeListPage(html, referenceClass.name, referenceClass.sourceUrl)

      for (const entry of entries) {
        if (seen.has(entry.sourceUrl)) continue
        seen.add(entry.sourceUrl)
        archetypeEntries.push(entry)
      }

      process.stdout.write(`${referenceClass.name}: ${entries.length} Paizo archetypes\n`)
    } catch (error) {
      process.stdout.write(`${referenceClass.name}: index failed (${String(error)})\n`)
    }
  }

  const work = opts.limit ? archetypeEntries.slice(0, opts.limit) : archetypeEntries
  console.log(`\nArchetypes to process: ${work.length}\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < work.length; i++) {
    const entry = work[i]

    try {
      const html = await fetchHtml(entry.sourceUrl)
      const detail = parseArchetypePage(html, entry.sourceUrl, entry.className)
      if (!detail) {
        process.stdout.write(`[${i + 1}/${work.length}] SKIP: ${entry.sourceUrl}\n`)
        skipped++
        continue
      }

      process.stdout.write(`[${i + 1}/${work.length}] ${detail.name}`)
      if (opts.debug) console.log('\n' + JSON.stringify(detail, null, 2))

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertArchetype(detail)
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
