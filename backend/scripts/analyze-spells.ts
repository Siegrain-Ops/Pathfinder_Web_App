#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// analyze-spells.ts — Phase 1: analyse dirty data in ReferenceSpell
//
// Looks for the following contamination patterns:
//   A) rangeText  contains a keyword that belongs to targetText/areaText/effectText
//   B) targetText contains keywords belonging to areaText/effectText/durationText
//   C) effectText contains keywords belonging to durationText/savingThrow/spellResistance
//   D) areaText   contains keywords belonging to effectText/targetText
//   E) durationText contains keywords belonging to savingThrow/spellResistance
//
// Run: DATABASE_URL="mysql://pathfinder:pathfinder@127.0.0.1:3307/pathfinder" \
//       npx tsx scripts/analyze-spells.ts
// ---------------------------------------------------------------------------

import dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Field labels used as anchor keywords ────────────────────────────────────
//
// These are the bold-label strings that d20pfsrd.com injects before each
// value.  If one of these appears inside the *value* of a different field it
// is almost certainly a concatenation artefact.
const FIELD_MARKERS: Record<string, RegExp> = {
  target:           /\bTarget[s]?\s*:/i,
  area:             /\bArea\s*:/i,
  effect:           /\bEffect\s*:/i,
  duration:         /\bDuration\s*:/i,
  savingThrow:      /\bSaving Throw\s*:/i,
  spellResistance:  /\bSpell Resistance\s*:/i,
  range:            /\bRange\s*:/i,
  castingTime:      /\bCasting Time\s*:/i,
  components:       /\bComponents?\s*:/i,
}

// For each DB column, which OTHER field markers should never appear in it?
const CONTAMINATION_RULES: Record<string, string[]> = {
  rangeText:       ['target', 'area', 'effect', 'duration', 'savingThrow', 'spellResistance'],
  targetText:      ['area', 'effect', 'duration', 'savingThrow', 'spellResistance'],
  areaText:        ['target', 'effect', 'duration', 'savingThrow', 'spellResistance'],
  effectText:      ['target', 'area', 'duration', 'savingThrow', 'spellResistance'],
  durationText:    ['savingThrow', 'spellResistance'],
  castingTime:     ['components', 'range', 'target', 'area', 'effect', 'duration', 'savingThrow', 'spellResistance'],
}

type SpellRow = {
  id: string
  name: string
  rangeText:       string | null
  targetText:      string | null
  areaText:        string | null
  effectText:      string | null
  durationText:    string | null
  savingThrow:     string | null
  spellResistance: string | null
  castingTime:     string | null
}

type Contamination = {
  field:       string
  value:       string
  foundMarkers: string[]
}

type DirtyRecord = {
  id:   string
  name: string
  contaminations: Contamination[]
}

function checkContamination(row: SpellRow): DirtyRecord | null {
  const contaminations: Contamination[] = []

  for (const [field, forbiddenMarkers] of Object.entries(CONTAMINATION_RULES)) {
    const value = (row as Record<string, string | null>)[field]
    if (!value) continue

    const found = forbiddenMarkers.filter(marker => FIELD_MARKERS[marker].test(value))
    if (found.length) {
      contaminations.push({ field, value, foundMarkers: found })
    }
  }

  return contaminations.length ? { id: row.id, name: row.name, contaminations } : null
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  ReferenceSpell — Dirty-Data Analysis Report (Phase 1)')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Fetch all rows (metadata fields only — no description)
  const spells = await prisma.$queryRaw<SpellRow[]>`
    SELECT id, name, rangeText, targetText, areaText, effectText,
           durationText, savingThrow, spellResistance, castingTime
    FROM   ReferenceSpell
  `

  console.log(`Total records fetched: ${spells.length}\n`)

  const dirty: DirtyRecord[] = []
  for (const row of spells) {
    const result = checkContamination(row)
    if (result) dirty.push(result)
  }

  console.log(`Suspected dirty records: ${dirty.length} / ${spells.length}`)
  console.log(`Clean records          : ${spells.length - dirty.length}\n`)

  // ── Breakdown by contamination type ────────────────────────────────────────
  const byType: Record<string, number> = {}
  for (const r of dirty) {
    for (const c of r.contaminations) {
      const key = `${c.field} ← ${c.foundMarkers.join(', ')}`
      byType[key] = (byType[key] ?? 0) + 1
    }
  }

  console.log('── Contamination types ───────────────────────────────────')
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(4)}  ${type}`)
  }

  // ── Sample records (up to 20) ───────────────────────────────────────────────
  console.log('\n── Sample dirty records (up to 20) ──────────────────────')
  for (const r of dirty.slice(0, 20)) {
    console.log(`\n  id   : ${r.id}`)
    console.log(`  name : ${r.name}`)
    for (const c of r.contaminations) {
      console.log(`  ┌─ contaminated field : ${c.field}`)
      console.log(`  │  foreign markers    : ${c.foundMarkers.join(', ')}`)
      console.log(`  └─ value              : ${c.value.slice(0, 200)}${c.value.length > 200 ? '…' : ''}`)
    }
  }

  // ── Dump full list as JSON for later use ────────────────────────────────────
  const fs = await import('fs')
  const outPath = new URL('../../reports/dirty-spells.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
  fs.mkdirSync(outPath.replace(/[/\\][^/\\]+$/, ''), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(dirty, null, 2), 'utf8')
  console.log(`\nFull dirty-record list written to: ${outPath}`)

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  Phase 1 complete. Review the report above then proceed.')
  console.log('═══════════════════════════════════════════════════════════')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => void prisma.$disconnect())
