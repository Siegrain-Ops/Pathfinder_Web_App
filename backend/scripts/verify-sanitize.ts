#!/usr/bin/env tsx
// Post-fix verification (v2 — cascade fix)
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  // 1) Residual cascade contamination
  const stillDirtyCast = await p.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt FROM ReferenceSpell WHERE castingTime REGEXP 'Components?'
  `
  const stillDirtyRange = await p.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt FROM ReferenceSpell
    WHERE  rangeText    REGEXP 'Target[s]?[[:space:]]*:?|Area[[:space:]]*:?|Effect[[:space:]]*:?|Duration[[:space:]]*:?|Saving Throw'
        OR targetText   REGEXP 'Area[[:space:]]*:?|Effect[[:space:]]*:?|Duration[[:space:]]*:?|Saving Throw'
        OR areaText     REGEXP 'Effect[[:space:]]*:?|Duration[[:space:]]*:?|Saving Throw'
        OR durationText REGEXP 'Saving Throw'
  `
  const stPrefix = await p.$queryRaw<{ cnt: bigint }[]>`SELECT COUNT(*) AS cnt FROM ReferenceSpell WHERE savingThrow LIKE ': %'`
  const srPrefix = await p.$queryRaw<{ cnt: bigint }[]>`SELECT COUNT(*) AS cnt FROM ReferenceSpell WHERE spellResistance LIKE ': %'`

  console.log('Post-fix verification')
  console.log(`  castingTime with Components        : ${stillDirtyCast[0].cnt}   (expected 0)`)
  console.log(`  cascade contamination residual     : ${stillDirtyRange[0].cnt}  (expected 0)`)
  console.log(`  savingThrow ': ' prefix            : ${stPrefix[0].cnt}          (expected 1 = Guards and Wards)`)
  console.log(`  spellResistance ': ' prefix        : ${srPrefix[0].cnt}          (expected 0)`)

  // 2) Spot-check specific spells
  const spells = await p.$queryRaw<Record<string, string|null>[]>`
    SELECT name, castingTime, components, rangeText, targetText, areaText,
           effectText, durationText, savingThrow, spellResistance
    FROM   ReferenceSpell
    WHERE  name IN ('Time Stop','Mending','Identify','Incendiary Cloud',
                    'Unshakable Zeal','Psychonaut Manifestation','Healing Flames')
    ORDER BY name
  `
  console.log('\nSpot-check:')
  console.log(JSON.stringify(spells, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
