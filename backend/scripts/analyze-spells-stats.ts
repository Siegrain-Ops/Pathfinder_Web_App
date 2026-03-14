#!/usr/bin/env tsx
// Quick stats: count each type of issue independently
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

type Row = {
  id:              string
  name:            string
  castingTime:     string | null
  components:      string | null
  savingThrow:     string | null
  spellResistance: string | null
  rangeText:       string | null
  targetText:      string | null
  areaText:        string | null
  effectText:      string | null
  durationText:    string | null
}

async function main() {
  const rows = await p.$queryRaw<Row[]>`
    SELECT id, name, castingTime, components, savingThrow, spellResistance,
           rangeText, targetText, areaText, effectText, durationText
    FROM   ReferenceSpell
  `

  // Pattern A: castingTime has Components keyword
  const castCompRows = rows.filter(r => r.castingTime && /Components?/i.test(r.castingTime))

  // Pattern B: savingThrow starts with ': '
  const stPrefix = rows.filter(r => r.savingThrow?.startsWith(': '))

  // Pattern C: spellResistance starts with ': '
  const srPrefix = rows.filter(r => r.spellResistance?.startsWith(': '))

  // Pattern D: components is null when castingTime has Components
  const compNull = castCompRows.filter(r => r.components === null)

  console.log(`Total                                        : ${rows.length}`)
  console.log(`castingTime has 'Components' keyword         : ${castCompRows.length}`)
  console.log(`  of which components col is NULL            : ${compNull.length}`)
  console.log(`savingThrow starts with ': '                 : ${stPrefix.length}`)
  console.log(`spellResistance starts with ': '             : ${srPrefix.length}`)

  // Sample 5 cases where castingTime has Components AND components is non-null
  const compNonNull = castCompRows.filter(r => r.components !== null)
  if (compNonNull.length) {
    console.log(`\ncasting+comp both non-null (${compNonNull.length} cases, first 5):`)
    for (const r of compNonNull.slice(0, 5)) {
      console.log(`  ${r.name}: castingTime=${JSON.stringify(r.castingTime)} components=${JSON.stringify(r.components)}`)
    }
  }

  // Sample values for savingThrow prefix issues
  if (stPrefix.length) {
    console.log(`\nsavingThrow ': ' prefix (first 5):`)
    for (const r of stPrefix.slice(0, 5))
      console.log(`  ${r.name}: "${r.savingThrow}"`)
  }

  // Sample values for spellResistance prefix issues
  if (srPrefix.length) {
    console.log(`\nspellResistance ': ' prefix (first 5):`)
    for (const r of srPrefix.slice(0, 5))
      console.log(`  ${r.name}: "${r.spellResistance}"`)
  }

  // Check: are there savingThrow values that do NOT start with ': ' (to understand the format)
  const stClean = rows.filter(r => r.savingThrow && !r.savingThrow.startsWith(': '))
  console.log(`\nsavingThrow records that look clean (first 5):`)
  for (const r of stClean.slice(0, 5))
    console.log(`  ${r.name}: "${r.savingThrow}"`)

  // Unique castingTime values that DON'T have Components (to understand clean format)
  const cleanCast = rows.filter(r => r.castingTime && !/Components?/i.test(r.castingTime) && r.castingTime)
  console.log(`\nclean castingTime (first 5):`)
  for (const r of cleanCast.slice(0, 5))
    console.log(`  ${r.name}: ct="${r.castingTime}" comp="${r.components}"`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
