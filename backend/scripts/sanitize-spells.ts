#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// sanitize-spells.ts — ReferenceSpell data sanitisation  (v2)
//
// Rules applied
// ─────────────
// R1  castingTime/components split  (≈2 333 records)
//     castingTime = text before "Components?" keyword
//     components  = text after "Components?" keyword (only if currently null)
//
// R2  Cascade contamination — ALL records (generic, not just 4 hardcoded IDs)
//     For each of: rangeText, targetText, areaText, effectText, durationText
//       • Trim the field at the first Title-Case field marker (case-sensitive)
//         so that downstream label text is removed from the current field.
//       • Forward-propagate: if a downstream field (savingThrow, spellResistance,
//         etc.) is NULL, extract its value from the contaminated text and set it.
//     This handles both the widespread cascade AND the 7 records where
//     savingThrow/spellResistance were null but embedded in another field.
//
// R3  savingThrow / spellResistance  ": " prefix   (handful of records)
//     Strip leading ": " from both columns.
//     savingThrow of Guards and Wards is ambiguous → logged as MANUAL.
//
// Usage:
//   DATABASE_URL="mysql://pathfinder:pathfinder@127.0.0.1:3307/pathfinder" \
//   npx tsx scripts/sanitize-spells.ts
//   npx tsx scripts/sanitize-spells.ts --dry-run
// ---------------------------------------------------------------------------

import dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma  = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// ── Paths ────────────────────────────────────────────────────────────────────

const REPORT_DIR  = path.resolve(process.cwd(), 'reports')
fs.mkdirSync(REPORT_DIR, { recursive: true })
const LOG_PATH    = path.join(REPORT_DIR, 'sanitize-spells.log.json')
const REPORT_PATH = path.join(REPORT_DIR, 'sanitize-spells-report.md')

// ── Logging ──────────────────────────────────────────────────────────────────

type ChangeLog = {
  id:     string
  name:   string
  rule:   string
  before: Record<string, string | null>
  after:  Record<string, string | null>
}

type ManualRecord = {
  id:     string
  name:   string
  field:  string
  value:  string
  reason: string
}

const changes: ChangeLog[]    = []
const manuals: ManualRecord[] = []
let   skipped = 0

function log(msg: string) { process.stdout.write(msg + '\n') }

// ── Cascade helpers ───────────────────────────────────────────────────────────
//
// PRIMARY markers: Title-Case (case-sensitive) — safe for all fields.
// SECONDARY markers: lowercase "duration " and "saving throw" — used ONLY
//   when the field is targetText/areaText/effectText, where a duration value
//   is semantically impossible and "duration " can only mean a leaked label.
//   ("area" and "effect" in lowercase are skipped — too common as nouns.)

type MarkerKey = 'target' | 'area' | 'effect' | 'duration' | 'savingThrow' | 'spellResistance'

const CASCADE_MARKERS: { key: MarkerKey; re: RegExp }[] = [
  { key: 'target',          re: /Target[s]?\s*:?\s*/   },
  { key: 'area',            re: /Area\s*:?\s*/          },
  { key: 'effect',          re: /Effect\s*:?\s*/        },
  { key: 'duration',        re: /Duration\s*:?\s*/      },
  { key: 'savingThrow',     re: /Saving Throw\s*:?\s*/  },
  { key: 'spellResistance', re: /Spell Resistance\s*:?\s*/ },
]

// Lowercase variants — only used in fields where duration is semantically wrong
const CASCADE_MARKERS_LOWERCASE: { key: MarkerKey; re: RegExp }[] = [
  { key: 'duration',    re: /duration\s+/   },
  { key: 'savingThrow', re: /saving throw\s*:?\s*/ },
]

// Fields for which we apply lowercase markers in addition to Title-Case ones
const LOWERCASE_MARKER_FIELDS = new Set(['targetText', 'areaText', 'effectText'])

/**
 * Parse a contaminated field value into its constituent segments.
 *
 * E.g. "medium (100 ft.) Target one creature Duration 1 round Saving Throw Will"
 * → { base: "medium (100 ft.)", target: "one creature", duration: "1 round", savingThrow: "Will" }
 *
 * Returns only non-empty segments.
 */
function parseCascade(text: string): Partial<Record<'base' | MarkerKey, string>> {
  const result: Partial<Record<'base' | MarkerKey, string>> = {}

  let remaining = text
  let isFirst   = true

  while (remaining.length > 0) {
    // Find the earliest marker in what remains
    let earliest: { index: number; key: MarkerKey; endIdx: number } | null = null
    for (const { key, re } of CASCADE_MARKERS) {
      const m = re.exec(remaining)
      if (m && (!earliest || m.index < earliest.index)) {
        earliest = { index: m.index, key, endIdx: m.index + m[0].length }
      }
    }

    if (!earliest) {
      // No more markers — everything remaining is the last segment's value
      const value = remaining.trim()
      if (isFirst) result.base = value || undefined
      // If not first, the caller must track what key is currently active;
      // we handle this outside by passing the segment to the right field.
      // Since this loop sets the *current* segment to a MarkerKey via the
      // pending variable (see below), we don't need extra logic here.
      break
    }

    const segValue = remaining.slice(0, earliest.index).trim()
    if (isFirst) {
      if (segValue) result.base = segValue
      isFirst = false
    }
    // We'll track the open marker's segment in the next iteration
    // by consuming up to the NEXT marker after this one.
    remaining = remaining.slice(earliest.endIdx)

    // Now find what follows THIS marker (up to the next marker)
    let nextEarliest: { index: number; key: MarkerKey; endIdx: number } | null = null
    for (const { key, re } of CASCADE_MARKERS) {
      const m = re.exec(remaining)
      if (m && (!nextEarliest || m.index < nextEarliest.index)) {
        nextEarliest = { index: m.index, key, endIdx: m.index + m[0].length }
      }
    }

    const segEnd   = nextEarliest ? nextEarliest.index : remaining.length
    const segText  = remaining.slice(0, segEnd).trim()
    if (segText) result[earliest.key] = segText

    remaining = nextEarliest ? remaining.slice(nextEarliest.endIdx) : ''

    // If there was a next marker, its segment follows in the next outer loop
    // iteration — but we consumed up to and including its keyword already.
    // Handle its segment value here as well:
    if (nextEarliest) {
      isFirst = false
      // Continue: "remaining" is now what comes after nextEarliest.keyword
      // and the while loop will process it; but we need to credit the just-
      // consumed nextEarliest.key. We do that by re-inserting a sentinel so the
      // loop captures it. Simpler: fully parse in one pass with index tracking.
    }
  }

  return result
}

/**
 * Single-pass cascade parser.
 * @param text     The field value to parse.
 * @param extraMarkers  Additional (e.g. lowercase) markers to include.
 * Returns a map { base?: "...", target?: "...", duration?: "...", ... }
 */
function cascadeParse(
  text: string,
  extraMarkers: { key: MarkerKey; re: RegExp }[] = [],
): Partial<Record<'base' | MarkerKey, string>> {
  // Find all marker positions sorted by index
  type Found = { index: number; endIdx: number; key: MarkerKey }
  const found: Found[] = []

  for (const { key, re } of [...CASCADE_MARKERS, ...extraMarkers]) {
    let match: RegExpExecArray | null
    const gRe = new RegExp(re.source, 'g')
    while ((match = gRe.exec(text)) !== null) {
      found.push({ index: match.index, endIdx: match.index + match[0].length, key })
      break // only first occurrence of each key
    }
  }

  found.sort((a, b) => a.index - b.index)

  const result: Partial<Record<'base' | MarkerKey, string>> = {}

  // Segment before first marker → "base"
  const baseEnd = found[0]?.index ?? text.length
  const baseVal = text.slice(0, baseEnd).trim()
  if (baseVal) result.base = baseVal

  // Each marker → value is text until next marker
  found.forEach((f, i) => {
    const end   = found[i + 1]?.index ?? text.length
    const value = text.slice(f.endIdx, end).trim()
    if (value) result[f.key] = value
  })

  return result
}

// ── Types ────────────────────────────────────────────────────────────────────

type SpellRow = {
  id:              string
  name:            string
  castingTime:     string | null
  components:      string | null
  rangeText:       string | null
  targetText:      string | null
  areaText:        string | null
  effectText:      string | null
  durationText:    string | null
  savingThrow:     string | null
  spellResistance: string | null
}

// Mapping from cascade segment key → SpellRow column
const SEGMENT_TO_COL: Record<MarkerKey, keyof SpellRow> = {
  target:          'targetText',
  area:            'areaText',
  effect:          'effectText',
  duration:        'durationText',
  savingThrow:     'savingThrow',
  spellResistance: 'spellResistance',
}

// Which SpellRow column owns the "base" segment for each contaminated field
const FIELD_BASE_COL: Record<string, keyof SpellRow> = {
  rangeText:    'rangeText',
  targetText:   'targetText',
  areaText:     'areaText',
  effectText:   'effectText',
  durationText: 'durationText',
}

// ── Rule R1 ──────────────────────────────────────────────────────────────────

async function applyR1(rows: SpellRow[]) {
  log('\n── R1: castingTime / components split ──────────────────────')
  let fixed = 0

  for (const row of rows) {
    if (!row.castingTime) continue

    const match = row.castingTime.match(/^(.*?)\s*Components?\s+(.*?)$/si)
    if (!match) continue

    const newCast = match[1].trim() || null
    const newComp = match[2].trim() || null
    const updateComp = row.components === null ? newComp : row.components

    if (newCast === row.castingTime && updateComp === row.components) { skipped++; continue }

    changes.push({
      id: row.id, name: row.name, rule: 'R1',
      before: { castingTime: row.castingTime, components: row.components },
      after:  { castingTime: newCast,         components: updateComp    },
    })

    if (!DRY_RUN) {
      await prisma.referenceSpell.update({
        where: { id: row.id },
        data:  { castingTime: newCast, components: updateComp },
      })
    }
    fixed++
    if (fixed % 200 === 0) log(`  … ${fixed} records processed`)
  }

  log(`  R1 applied to ${fixed} records${DRY_RUN ? ' (DRY RUN)' : ''}`)
}

// ── Rule R2 ──────────────────────────────────────────────────────────────────

const GUARDS_AND_WARDS_ID = '60790ece-f075-4dc4-86cd-fdca9dba4b0c'

async function applyR2(rows: SpellRow[]) {
  log('\n── R2: cascade field contamination (all records) ───────────')
  let fixed = 0

  for (const row of rows) {
    type PatchKey = 'rangeText'|'targetText'|'areaText'|'effectText'|'durationText'|'savingThrow'|'spellResistance'
    const patch:  Partial<Record<PatchKey, string | null>> = {}
    const before: Partial<Record<PatchKey, string | null>> = {}

    // Process each potentially contaminated field
    const sourceFields: Array<keyof typeof FIELD_BASE_COL> = [
      'rangeText', 'targetText', 'areaText', 'effectText', 'durationText',
    ]

    for (const srcField of sourceFields) {
      const value = row[srcField as keyof SpellRow] as string | null
      if (!value) continue

      // For fields where duration values are semantically impossible,
      // also apply lowercase marker variants to catch lowercase label leaks.
      const extra = LOWERCASE_MARKER_FIELDS.has(srcField) ? CASCADE_MARKERS_LOWERCASE : []
      const parsed = cascadeParse(value, extra)

      // 1) Clean the current field (keep only the "base" segment)
      const baseCol   = FIELD_BASE_COL[srcField] as PatchKey
      const cleanBase = parsed.base ?? null

      if (cleanBase !== value) {
        // Sanity guard: if the extracted base is ≤ 3 chars it is likely a
        // parsing artefact (e.g. "or", "and"), not a valid field value.
        // Flag as manual rather than writing junk.
        if (cleanBase !== null && cleanBase.trim().length <= 3) {
          manuals.push({
            id:     row.id,
            name:   row.name,
            field:  srcField,
            value:  value,
            reason: `Cascade split produced a suspiciously short base value: "${cleanBase}". ` +
                    `Manual inspection required.`,
          })
          continue
        }
        before[baseCol] = value
        patch[baseCol]  = cleanBase
      }

      // 2) Forward-propagate segments to NULL downstream fields
      for (const [segKey, segVal] of Object.entries(parsed) as [MarkerKey, string][]) {
        if (segKey === 'base' as unknown) continue
        const destCol = SEGMENT_TO_COL[segKey] as PatchKey
        const currentVal = row[destCol as keyof SpellRow] as string | null

        // Only populate if currently null AND we haven't already set it
        if (currentVal === null && !(destCol in patch)) {
          before[destCol] = null
          patch[destCol]  = segVal
        }
      }
    }

    // Special: Guards and Wards savingThrow is ambiguous — don't auto-set it
    if (row.id === GUARDS_AND_WARDS_ID && 'savingThrow' in patch) {
      const extracted = patch.savingThrow
      manuals.push({
        id:     row.id,
        name:   row.name,
        field:  'savingThrow',
        value:  row.savingThrow ?? `(null — extracted: "${extracted}")`,
        reason: 'Multiple conflicting savingThrow values found. ' +
                'The savingThrow column contains ": Will negates. Spell Resistance: yes." ' +
                'while the cascade also contains "see text". Manual review required.',
      })
      delete patch.savingThrow
      delete before.savingThrow
      log(`  MANUAL ${row.name} — savingThrow ambiguous, skipped`)
    }

    if (Object.keys(patch).length === 0) continue

    changes.push({
      id: row.id, name: row.name, rule: 'R2',
      before: before as Record<string, string | null>,
      after:  patch  as Record<string, string | null>,
    })

    if (!DRY_RUN) {
      await prisma.referenceSpell.update({ where: { id: row.id }, data: patch })
    }

    fixed++
    if (fixed % 200 === 0) log(`  … ${fixed} records processed`)
  }

  log(`  R2 applied to ${fixed} records${DRY_RUN ? ' (DRY RUN)' : ''}`)
}

// ── Rule R3 ──────────────────────────────────────────────────────────────────

async function applyR3(rows: SpellRow[]) {
  log('\n── R3: savingThrow / spellResistance ": " prefix ───────────')
  let fixed = 0

  for (const row of rows) {
    const stFix = row.savingThrow?.startsWith(': ')     ? row.savingThrow.replace(/^:\s*/, '')     : null
    const srFix = row.spellResistance?.startsWith(': ') ? row.spellResistance.replace(/^:\s*/, '') : null

    if (!stFix && !srFix) continue

    // Guards and Wards savingThrow is ambiguous — log as manual, don't auto-fix
    if (row.id === GUARDS_AND_WARDS_ID && stFix) {
      const alreadyLogged = manuals.some(m => m.id === GUARDS_AND_WARDS_ID && m.field === 'savingThrow')
      if (!alreadyLogged) {
        manuals.push({
          id:     row.id,
          name:   row.name,
          field:  'savingThrow',
          value:  row.savingThrow ?? '',
          reason: 'savingThrow contains an embedded "Spell Resistance:" label: "' + (row.savingThrow ?? '') +
                  '". The value is ambiguous (conflicts with the spellResistance column). Manual review required.',
        })
        log(`  MANUAL ${row.name} — savingThrow ambiguous, not auto-fixed`)
      }
    }

    type Patch = { savingThrow?: string; spellResistance?: string }
    const before: Patch = {}
    const after:  Patch = {}

    if (stFix && row.id !== GUARDS_AND_WARDS_ID) {
      before.savingThrow = row.savingThrow!; after.savingThrow = stFix
    }
    if (srFix) {
      before.spellResistance = row.spellResistance!; after.spellResistance = srFix
    }

    if (Object.keys(after).length === 0) continue

    changes.push({
      id: row.id, name: row.name, rule: 'R3',
      before: before as Record<string, string | null>,
      after:  after  as Record<string, string | null>,
    })

    if (!DRY_RUN) {
      await prisma.referenceSpell.update({ where: { id: row.id }, data: after })
    }

    log(`  FIXED ${row.name}: ${Object.keys(after).join(', ')}${DRY_RUN ? ' (DRY RUN)' : ''}`)
    fixed++
  }

  log(`  R3 applied to ${fixed} records${DRY_RUN ? ' (DRY RUN)' : ''}`)
}

// ── Backup ───────────────────────────────────────────────────────────────────

async function createBackup() {
  log('\n── Creating backup table ────────────────────────────────────')
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ReferenceSpell_backup_sanitize`)
  await prisma.$executeRawUnsafe(`CREATE TABLE ReferenceSpell_backup_sanitize AS SELECT * FROM ReferenceSpell`)
  const [{ cnt }] = await prisma.$queryRaw<{ cnt: bigint }[]>`SELECT COUNT(*) AS cnt FROM ReferenceSpell_backup_sanitize`
  log(`  Backup created: ReferenceSpell_backup_sanitize (${cnt} rows)`)
}

// ── Reports ──────────────────────────────────────────────────────────────────

function writeReports(totalRows: number) {
  fs.writeFileSync(LOG_PATH, JSON.stringify({ changes, manuals }, null, 2), 'utf8')

  const byRule: Record<string, number> = {}
  for (const c of changes) byRule[c.rule] = (byRule[c.rule] ?? 0) + 1

  const md = [
    '# ReferenceSpell Sanitisation Report',
    '',
    `**Run date**: ${new Date().toISOString()}`,
    `**Mode**: ${DRY_RUN ? 'DRY RUN (no DB changes)' : 'LIVE'}`,
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '|---|---|',
    `| Total records analysed | ${totalRows} |`,
    `| Records modified       | ${changes.length} |`,
    `| Records skipped        | ${skipped} |`,
    `| Manual review required | ${manuals.length} |`,
    '',
    '## Rules applied',
    '',
    '| Rule | Description | Records fixed |',
    '|---|---|---|',
    `| R1 | castingTime / components split                    | ${byRule['R1'] ?? 0} |`,
    `| R2 | Cascade field contamination (all records, generic) | ${byRule['R2'] ?? 0} |`,
    `| R3 | savingThrow / spellResistance ": " prefix         | ${byRule['R3'] ?? 0} |`,
    '',
    '## Before / After examples (first 10 per rule)',
    '',
  ]

  for (const rule of ['R1', 'R2', 'R3']) {
    const subset = changes.filter(c => c.rule === rule).slice(0, 10)
    if (!subset.length) continue
    md.push(`### ${rule}`)
    md.push('')
    for (const c of subset) {
      md.push(`**${c.name}** (\`${c.id}\`)`)
      for (const field of Object.keys(c.before)) {
        md.push(`- \`${field}\`  before: \`${c.before[field]}\`  →  after: \`${c.after[field]}\``)
      }
      md.push('')
    }
  }

  if (manuals.length) {
    md.push('## Records requiring manual review')
    md.push('')
    for (const m of manuals) {
      md.push(`### ${m.name} — \`${m.field}\``)
      md.push(`- **id**: \`${m.id}\``)
      md.push(`- **current value**: \`${m.value}\``)
      md.push(`- **reason**: ${m.reason}`)
      md.push('')
    }
  }

  fs.writeFileSync(REPORT_PATH, md.join('\n'), 'utf8')
  log(`\nJSON log   → ${LOG_PATH}`)
  log(`MD report  → ${REPORT_PATH}`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('═══════════════════════════════════════════════════════════')
  log('  ReferenceSpell — Sanitisation Script  (v2)')
  log(`  Mode : ${DRY_RUN ? 'DRY RUN' : 'LIVE — changes will be written to DB'}`)
  log('═══════════════════════════════════════════════════════════')

  if (!DRY_RUN) await createBackup()

  const rows = await prisma.$queryRaw<SpellRow[]>`
    SELECT id, name, castingTime, components,
           rangeText, targetText, areaText, effectText, durationText,
           savingThrow, spellResistance
    FROM   ReferenceSpell
  `
  log(`\nFetched ${rows.length} rows from ReferenceSpell`)

  await applyR1(rows)
  await applyR2(rows)
  await applyR3(rows)

  writeReports(rows.length)

  const byRule: Record<string, number> = {}
  for (const c of changes) byRule[c.rule] = (byRule[c.rule] ?? 0) + 1

  log('\n═══════════════════════════════════════════════════════════')
  log('  SANITISATION COMPLETE')
  log(`  Total rows analysed    : ${rows.length}`)
  log(`  Records modified       : ${changes.length}`)
  log(`    R1 (cast/comp split) : ${byRule['R1'] ?? 0}`)
  log(`    R2 (cascade, all)    : ${byRule['R2'] ?? 0}`)
  log(`    R3 (": " prefix)     : ${byRule['R3'] ?? 0}`)
  log(`  Records skipped        : ${skipped}`)
  log(`  Manual review needed   : ${manuals.length}`)
  if (manuals.length) for (const m of manuals) log(`    → ${m.name} [${m.field}]`)
  if (DRY_RUN) log('\n  ⚠  DRY RUN — no changes written. Remove --dry-run to apply.')
  log('═══════════════════════════════════════════════════════════')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => void prisma.$disconnect())
