import 'dotenv/config'
import { prisma } from '../src/common/db/prisma'
import { fetchHtml } from './lib/scraper'
import { parseCliOptions } from './lib/base-importer'
import {
  parseArcaneExploitListPage,
  parseCavalierOrderListPage,
  parseCavalierOrderPage,
  parseInvestigatorTalentListPage,
  parseInquisitionListPage,
  parseInquisitionPage,
  parseMagusArcanaListPage,
  parseOracleCursesPage,
  parsePaladinMerciesPage,
  parseQinggongKiPowersPage,
  parseRagePowerListPage,
  parseShamanSpiritListPage,
  parseShamanSpiritPage,
  parseRogueEdgeSkillPage,
  parseVigilanteTalentSectionPage,
  parseSlayerTalentListPage,
  parseNinjaTalentListPage,
  parseRogueTalentListPage,
  parseTalentPage,
  parseWizardSchoolListPage,
  parseWizardSchoolPage,
  parseWitchHexListPage,
} from './lib/parser-talents'

const ROGUE_TALENTS_URL = 'https://www.d20pfsrd.com/classes/core-classes/rogue/rogue-talents/'
const NINJA_TRICKS_URL = 'https://www.d20pfsrd.com/classes/alternate-classes/ninja/ninja-tricks/'
const SLAYER_TALENTS_URL = 'https://www.d20pfsrd.com/classes/hybrid-classes/slayer/slayer-talents/'
const ARCANE_EXPLOITS_URL = 'https://www.d20pfsrd.com/classes/hybrid-classes/arcanist/arcane-exploits/'
const CAVALIER_ORDERS_URL = 'https://www.d20pfsrd.com/classes/base-classes/cavalier/orders/'
const INVESTIGATOR_TALENTS_URL = 'https://www.d20pfsrd.com/classes/hybrid-classes/investigator/investigator-talents/'
const INQUISITIONS_URL = 'https://www.d20pfsrd.com/classes/base-classes/inquisitor/inquisitions/'
const MAGUS_ARCANA_URL = 'https://www.d20pfsrd.com/classes/base-classes/magus/magus-arcana/'
const VIGILANTE_CLASS_URL = 'https://www.d20pfsrd.com/classes/base-classes/vigilante/'
const ORACLE_CURSES_URL = 'https://www.d20pfsrd.com/classes/base-classes/oracle/oracle-curses/'
const PALADIN_CLASS_URL = 'https://www.d20pfsrd.com/classes/core-classes/paladin/'
const QINGGONG_MONK_URL = 'https://www.d20pfsrd.com/classes/core-classes/monk/archetypes/paizo-monk-archetypes/qinggong-monk/'
const RAGE_POWERS_URL = 'https://www.d20pfsrd.com/classes/core-classes/barbarian/rage-powers/'
const WITCH_COMMON_HEXES_URL = 'https://www.d20pfsrd.com/classes/base-classes/witch/hexes/hexes/common-hexes/'
const WITCH_MAJOR_HEXES_URL = 'https://www.d20pfsrd.com/classes/base-classes/witch/hexes/hexes/major-hexes/'
const WITCH_GRAND_HEXES_URL = 'https://www.d20pfsrd.com/classes/base-classes/witch/hexes/hexes/grand-hexes/'
const WIZARD_SCHOOLS_URL = 'https://www.d20pfsrd.com/classes/core-classes/wizard/arcane-schools/'
const SHAMAN_SPIRITS_URL = 'https://www.d20pfsrd.com/classes/hybrid-classes/shaman/spirits/'
const ROGUE_EDGE_SKILLS = [
  ['Acrobatics', 'https://www.d20pfsrd.com/skills/acrobatics/'],
  ['Appraise', 'https://www.d20pfsrd.com/skills/appraise/'],
  ['Bluff', 'https://www.d20pfsrd.com/skills/bluff/'],
  ['Climb', 'https://www.d20pfsrd.com/skills/climb/'],
  ['Craft', 'https://www.d20pfsrd.com/skills/craft/'],
  ['Diplomacy', 'https://www.d20pfsrd.com/skills/diplomacy/'],
  ['Disable Device', 'https://www.d20pfsrd.com/skills/disable-device/'],
  ['Disguise', 'https://www.d20pfsrd.com/skills/disguise/'],
  ['Escape Artist', 'https://www.d20pfsrd.com/skills/escape-artist/'],
  ['Fly', 'https://www.d20pfsrd.com/skills/fly/'],
  ['Handle Animal', 'https://www.d20pfsrd.com/skills/handle-animal/'],
  ['Heal', 'https://www.d20pfsrd.com/skills/heal/'],
  ['Intimidate', 'https://www.d20pfsrd.com/skills/intimidate/'],
  ['Knowledge', 'https://www.d20pfsrd.com/skills/knowledge/'],
  ['Linguistics', 'https://www.d20pfsrd.com/skills/linguistics/'],
  ['Perception', 'https://www.d20pfsrd.com/skills/perception/'],
  ['Perform', 'https://www.d20pfsrd.com/skills/perform/'],
  ['Profession', 'https://www.d20pfsrd.com/skills/profession/'],
  ['Ride', 'https://www.d20pfsrd.com/skills/ride/'],
  ['Sense Motive', 'https://www.d20pfsrd.com/skills/sense-motive/'],
  ['Sleight of Hand', 'https://www.d20pfsrd.com/skills/sleight-of-hand/'],
  ['Spellcraft', 'https://www.d20pfsrd.com/skills/spellcraft/'],
  ['Stealth', 'https://www.d20pfsrd.com/skills/stealth/'],
  ['Survival', 'https://www.d20pfsrd.com/skills/survival/'],
  ['Swim', 'https://www.d20pfsrd.com/skills/swim/'],
  ['Use Magic Device', 'https://www.d20pfsrd.com/skills/use-magic-device/'],
].map(([name, sourceUrl]) => ({ name, sourceUrl }))

type ParsedTalent = NonNullable<ReturnType<typeof parseTalentPage>>

async function upsertTalent(talent: ParsedTalent) {
  const existing = await prisma.referenceTalent.findUnique({
    where: { sourceUrl: talent.sourceUrl },
    select: { id: true },
  })

  await prisma.referenceTalent.upsert({
    where: { sourceUrl: talent.sourceUrl },
    create: {
      name: talent.name,
      talentFamily: talent.talentFamily,
      className: talent.className,
      prerequisites: talent.prerequisites,
      abilityType: talent.abilityType,
      description: talent.description,
      sourceName: talent.sourceName,
      sourceUrl: talent.sourceUrl,
    },
    update: {
      name: talent.name,
      talentFamily: talent.talentFamily,
      className: talent.className,
      prerequisites: talent.prerequisites,
      abilityType: talent.abilityType,
      description: talent.description,
      sourceName: talent.sourceName,
    },
  })

  return existing ? 'updated' : 'created'
}

async function main() {
  const opts = parseCliOptions()

  console.log('='.repeat(55))
  console.log('  Pathfinder 1e - Talent Importer')
  console.log('  Scope   : Paizo rogue talents + ninja tricks + slayer talents + arcane exploits + investigator talents + magus arcana + vigilante talents + rogue edges + rage powers + witch hexes + shaman hexes + oracle curses + paladin mercies + ki powers + cavalier orders + inquisitions + wizard school powers')
  console.log(`  Dry run : ${opts.dryRun}   Debug : ${opts.debug}`)
  if (opts.limit) console.log(`  Limit   : ${opts.limit}`)
  console.log('='.repeat(55))

  const rogueListHtml = await fetchHtml(ROGUE_TALENTS_URL)
  const ninjaListHtml = await fetchHtml(NINJA_TRICKS_URL)
  const slayerListHtml = await fetchHtml(SLAYER_TALENTS_URL)
  const arcaneExploitsListHtml = await fetchHtml(ARCANE_EXPLOITS_URL)
  const cavalierOrdersListHtml = await fetchHtml(CAVALIER_ORDERS_URL)
  const investigatorTalentsListHtml = await fetchHtml(INVESTIGATOR_TALENTS_URL)
  const inquisitionsListHtml = await fetchHtml(INQUISITIONS_URL)
  const magusArcanaListHtml = await fetchHtml(MAGUS_ARCANA_URL)
  const vigilanteClassHtml = await fetchHtml(VIGILANTE_CLASS_URL)
  const oracleCursesHtml = await fetchHtml(ORACLE_CURSES_URL)
  const paladinClassHtml = await fetchHtml(PALADIN_CLASS_URL)
  const qinggongMonkHtml = await fetchHtml(QINGGONG_MONK_URL)
  const ragePowersListHtml = await fetchHtml(RAGE_POWERS_URL)
  const witchCommonHexesListHtml = await fetchHtml(WITCH_COMMON_HEXES_URL)
  const witchMajorHexesListHtml = await fetchHtml(WITCH_MAJOR_HEXES_URL)
  const witchGrandHexesListHtml = await fetchHtml(WITCH_GRAND_HEXES_URL)
  const wizardSchoolsListHtml = await fetchHtml(WIZARD_SCHOOLS_URL)
  const shamanSpiritsListHtml = await fetchHtml(SHAMAN_SPIRITS_URL)
  let talents = dedupeTalentEntries([
    ...parseRogueTalentListPage(rogueListHtml),
    ...parseNinjaTalentListPage(ninjaListHtml),
    ...parseSlayerTalentListPage(slayerListHtml),
    ...parseArcaneExploitListPage(arcaneExploitsListHtml),
    ...parseCavalierOrderListPage(cavalierOrdersListHtml),
    ...parseInvestigatorTalentListPage(investigatorTalentsListHtml),
    ...parseInquisitionListPage(inquisitionsListHtml),
    ...parseMagusArcanaListPage(magusArcanaListHtml),
    ...parseRagePowerListPage(ragePowersListHtml),
    ...parseWitchHexListPage(witchCommonHexesListHtml),
    ...parseWitchHexListPage(witchMajorHexesListHtml),
    ...parseWitchHexListPage(witchGrandHexesListHtml),
    ...parseShamanSpiritListPage(shamanSpiritsListHtml),
    ...parseWizardSchoolListPage(wizardSchoolsListHtml),
  ])
  let directTalents = parseVigilanteTalentSectionPage(vigilanteClassHtml, VIGILANTE_CLASS_URL)
  let directCurses = parseOracleCursesPage(oracleCursesHtml, ORACLE_CURSES_URL)
  let directMercies = parsePaladinMerciesPage(paladinClassHtml, PALADIN_CLASS_URL)
  let directKiPowers = parseQinggongKiPowersPage(qinggongMonkHtml, QINGGONG_MONK_URL)
  let rogueEdges = ROGUE_EDGE_SKILLS
  if (opts.limit) talents = talents.slice(0, opts.limit)
  if (opts.limit) directTalents = directTalents.slice(0, Math.max(0, opts.limit - talents.length))
  if (opts.limit) {
    directCurses = directCurses.slice(0, Math.max(0, opts.limit - talents.length - directTalents.length))
  }
  if (opts.limit) {
    directMercies = directMercies.slice(0, Math.max(0, opts.limit - talents.length - directTalents.length - directCurses.length))
  }
  if (opts.limit) {
    directKiPowers = directKiPowers.slice(0, Math.max(0, opts.limit - talents.length - directTalents.length - directCurses.length - directMercies.length))
  }
  if (opts.limit) {
    rogueEdges = rogueEdges.slice(0, Math.max(0, opts.limit - talents.length - directTalents.length - directCurses.length - directMercies.length - directKiPowers.length))
  }

  console.log(`Discovered ${talents.length + directTalents.length + directCurses.length + directMercies.length + directKiPowers.length + rogueEdges.length} talents.\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (let index = 0; index < talents.length; index++) {
    const entry = talents[index]

    try {
      const html = await fetchHtml(entry.sourceUrl)
      if (entry.talentFamily === 'school power') {
        const schoolPowers = parseWizardSchoolPage(html, entry.sourceUrl, entry)
        if (!schoolPowers.length) {
          process.stdout.write(`[${index + 1}/${talents.length}] SKIP: ${entry.sourceUrl}\n`)
          skipped++
          continue
        }

        process.stdout.write(`[${index + 1}/${talents.length}] ${entry.name} (${schoolPowers.length} powers)`)
        if (opts.debug) console.log('\n' + JSON.stringify(schoolPowers, null, 2))

        if (opts.dryRun) {
          process.stdout.write(' (dry-run)\n')
          skipped++
          continue
        }

        for (const schoolPower of schoolPowers) {
          const result = await upsertTalent(schoolPower)
          if (result === 'created') created++
          else updated++
        }
        process.stdout.write(' +\n')
        continue
      }

      if (entry.talentFamily === 'shaman hex') {
        const shamanHexes = parseShamanSpiritPage(html, entry.sourceUrl, entry)
        if (!shamanHexes.length) {
          process.stdout.write(`[${index + 1}/${talents.length}] SKIP: ${entry.sourceUrl}\n`)
          skipped++
          continue
        }

        process.stdout.write(`[${index + 1}/${talents.length}] ${entry.name} (${shamanHexes.length} hexes)`)
        if (opts.debug) console.log('\n' + JSON.stringify(shamanHexes, null, 2))

        if (opts.dryRun) {
          process.stdout.write(' (dry-run)\n')
          skipped++
          continue
        }

        for (const shamanHex of shamanHexes) {
          const result = await upsertTalent(shamanHex)
          if (result === 'created') created++
          else updated++
        }
        process.stdout.write(' +\n')
        continue
      }

      if (entry.talentFamily === 'cavalier order') {
        const order = parseCavalierOrderPage(html, entry.sourceUrl, entry)
        if (!order) {
          process.stdout.write(`[${index + 1}/${talents.length}] SKIP: ${entry.sourceUrl}\n`)
          skipped++
          continue
        }

        process.stdout.write(`[${index + 1}/${talents.length}] ${order.name}`)
        if (opts.debug) console.log('\n' + JSON.stringify(order, null, 2))

        if (opts.dryRun) {
          process.stdout.write(' (dry-run)\n')
          skipped++
          continue
        }

        const result = await upsertTalent(order)
        process.stdout.write(result === 'created' ? ' +\n' : ' ~\n')
        if (result === 'created') created++
        else updated++
        continue
      }

      if (entry.talentFamily === 'inquisition') {
        const inquisition = parseInquisitionPage(html, entry.sourceUrl, entry)
        if (!inquisition) {
          process.stdout.write(`[${index + 1}/${talents.length}] SKIP: ${entry.sourceUrl}\n`)
          skipped++
          continue
        }

        process.stdout.write(`[${index + 1}/${talents.length}] ${inquisition.name}`)
        if (opts.debug) console.log('\n' + JSON.stringify(inquisition, null, 2))

        if (opts.dryRun) {
          process.stdout.write(' (dry-run)\n')
          skipped++
          continue
        }

        const result = await upsertTalent(inquisition)
        process.stdout.write(result === 'created' ? ' +\n' : ' ~\n')
        if (result === 'created') created++
        else updated++
        continue
      }

      const talent = parseTalentPage(html, entry.sourceUrl, entry)
      if (!talent) {
        process.stdout.write(`[${index + 1}/${talents.length}] SKIP: ${entry.sourceUrl}\n`)
        skipped++
        continue
      }

      process.stdout.write(`[${index + 1}/${talents.length}] ${talent.name}`)
      if (opts.debug) console.log('\n' + JSON.stringify(talent, null, 2))

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertTalent(talent)
      process.stdout.write(result === 'created' ? ' +\n' : ' ~\n')
      if (result === 'created') created++
      else updated++
    } catch (error) {
      process.stdout.write(` FAIL: ${String(error)}\n`)
      failed++
    }
  }

  const directOffset = talents.length
  for (let index = 0; index < directTalents.length; index++) {
    const talent = directTalents[index]

    try {
      process.stdout.write(`[${directOffset + index + 1}/${directOffset + directTalents.length}] ${talent.name}`)
      if (opts.debug) console.log('\n' + JSON.stringify(talent, null, 2))

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertTalent(talent)
      process.stdout.write(result === 'created' ? ' +\n' : ' ~\n')
      if (result === 'created') created++
      else updated++
    } catch (error) {
      process.stdout.write(` FAIL: ${String(error)}\n`)
      failed++
    }
  }

  const curseOffset = talents.length + directTalents.length
  for (let index = 0; index < directCurses.length; index++) {
    const talent = directCurses[index]

    try {
      process.stdout.write(`[${curseOffset + index + 1}/${curseOffset + directCurses.length}] ${talent.name}`)
      if (opts.debug) console.log('\n' + JSON.stringify(talent, null, 2))

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertTalent(talent)
      process.stdout.write(result === 'created' ? ' +\n' : ' ~\n')
      if (result === 'created') created++
      else updated++
    } catch (error) {
      process.stdout.write(` FAIL: ${String(error)}\n`)
      failed++
    }
  }

  const mercyOffset = talents.length + directTalents.length + directCurses.length
  for (let index = 0; index < directMercies.length; index++) {
    const talent = directMercies[index]

    try {
      process.stdout.write(`[${mercyOffset + index + 1}/${mercyOffset + directMercies.length}] ${talent.name}`)
      if (opts.debug) console.log('\n' + JSON.stringify(talent, null, 2))

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertTalent(talent)
      process.stdout.write(result === 'created' ? ' +\n' : ' ~\n')
      if (result === 'created') created++
      else updated++
    } catch (error) {
      process.stdout.write(` FAIL: ${String(error)}\n`)
      failed++
    }
  }

  const kiOffset = talents.length + directTalents.length + directCurses.length + directMercies.length
  for (let index = 0; index < directKiPowers.length; index++) {
    const talent = directKiPowers[index]

    try {
      process.stdout.write(`[${kiOffset + index + 1}/${kiOffset + directKiPowers.length}] ${talent.name}`)
      if (opts.debug) console.log('\n' + JSON.stringify(talent, null, 2))

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertTalent(talent)
      process.stdout.write(result === 'created' ? ' +\n' : ' ~\n')
      if (result === 'created') created++
      else updated++
    } catch (error) {
      process.stdout.write(` FAIL: ${String(error)}\n`)
      failed++
    }
  }

  const rogueEdgeOffset = talents.length + directTalents.length + directCurses.length + directMercies.length + directKiPowers.length
  for (let index = 0; index < rogueEdges.length; index++) {
    const entry = rogueEdges[index]

    try {
      const html = await fetchHtml(entry.sourceUrl)
      const talent = parseRogueEdgeSkillPage(html, entry)
      if (!talent) {
        process.stdout.write(`[${rogueEdgeOffset + index + 1}/${rogueEdgeOffset + rogueEdges.length}] SKIP: ${entry.sourceUrl}\n`)
        skipped++
        continue
      }

      process.stdout.write(`[${rogueEdgeOffset + index + 1}/${rogueEdgeOffset + rogueEdges.length}] ${talent.name}`)
      if (opts.debug) console.log('\n' + JSON.stringify(talent, null, 2))

      if (opts.dryRun) {
        process.stdout.write(' (dry-run)\n')
        skipped++
        continue
      }

      const result = await upsertTalent(talent)
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

function dedupeTalentEntries<T extends { sourceUrl: string }>(entries: T[]): T[] {
  const seen = new Set<string>()
  return entries.filter(entry => {
    if (seen.has(entry.sourceUrl)) return false
    seen.add(entry.sourceUrl)
    return true
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
