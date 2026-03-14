#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// analyze-spells-extended.ts — Phase 1b: broader pattern scan
//
// Checks for:
//   1) savingThrow or spellResistance starting with ": "
//      (label colon leaked into value)
//   2) castingTime containing "Components" keyword
//      (castingTime + components concatenated without separator)
//   3) Any other field starting with ": "
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

type Row = {
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

async function main() {
  const rows = await p.$queryRaw<Row[]>`
    SELECT id, name, castingTime, components, rangeText, targetText, areaText,
           effectText, durationText, savingThrow, spellResistance
    FROM   ReferenceSpell
  `
  console.log(`Total rows: ${rows.length}\n`)

  type Issue = { id: string; name: string; issues: string[] }
  const results: Issue[] = []

  for (const r of rows) {
    const issues: string[] = []

    // Pattern 1: ": " prefix on savingThrow / spellResistance
    if (r.savingThrow?.startsWith(': '))     issues.push(`savingThrow starts with ': ' → "${r.savingThrow}"`)
    if (r.spellResistance?.startsWith(': ')) issues.push(`spellResistance starts with ': ' → "${r.spellResistance}"`)

    // Pattern 2: castingTime contains "Components" keyword
    if (r.castingTime && /Components?/i.test(r.castingTime))
      issues.push(`castingTime has 'Components': "${r.castingTime}"`)

    // Pattern 3: any other text field starts with ": "
    for (const [col, val] of [
      ['rangeText',   r.rangeText],
      ['targetText',  r.targetText],
      ['areaText',    r.areaText],
      ['effectText',  r.effectText],
      ['durationText',r.durationText],
      ['components',  r.components],
    ] as [string, string|null][]) {
      if (val?.startsWith(': ')) issues.push(`${col} starts with ': ' → "${val}"`)
    }

    if (issues.length) results.push({ id: r.id, name: r.name, issues })
  }

  console.log(`Records with extended issues: ${results.length}\n`)

  for (const r of results) {
    console.log(`  id  : ${r.id}`)
    console.log(`  name: ${r.name}`)
    for (const issue of r.issues) console.log(`    • ${issue}`)
    console.log()
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
