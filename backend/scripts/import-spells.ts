// ---------------------------------------------------------------------------
// import-spells.ts — PF1e spell importer (refactored with base framework)
//
// Usage:
//   npm run import:spells
//   npm run import:spells -- --dry-run
//   npm run import:spells -- --letter f --limit 20
//   npm run import:spells -- --debug
// ---------------------------------------------------------------------------

import 'dotenv/config'
import { prisma }                       from '../src/common/db/prisma'
import { parseSpellPage,
         parseSpellIndexPage }          from './lib/parser-spells'
import { runImport,
         parseCliOptions,
         type EntityImporter }          from './lib/base-importer'

const BASE_URL    = 'https://www.d20pfsrd.com'
const ALPHABET    = 'abcdefghijklmnopqrstuvwxyz'.split('')

const importer: EntityImporter<ReturnType<typeof parseSpellPage> & { name: string }> = {
  label: 'Spell',
  concurrency:    6,
  requestDelayMs: 300,

  listUrls(opts) {
    const letters = opts.letter ? [opts.letter] : ALPHABET
    return letters.map(l => `${BASE_URL}/magic/all-spells/${l}/`)
  },

  extractLinks(html, baseUrl) {
    return parseSpellIndexPage(html, baseUrl)
  },

  parsePage(html, url) {
    return parseSpellPage(html, url)
  },

  async upsert(spell) {
    const existing = await prisma.referenceSpell.findUnique({
      where: { sourceUrl: spell.sourceUrl },
      select: { id: true },
    })

    await prisma.referenceSpell.upsert({
      where:  { sourceUrl: spell.sourceUrl },
      create: {
        name:           spell.name,
        school:         spell.school,
        subschool:      spell.subschool,
        descriptor:     spell.descriptor,
        spellLevelJson: spell.spellLevelJson,
        castingTime:    spell.castingTime,
        components:     spell.components,
        rangeText:      spell.rangeText,
        targetText:     spell.targetText,
        areaText:       spell.areaText,
        effectText:     spell.effectText,
        durationText:   spell.durationText,
        savingThrow:    spell.savingThrow,
        spellResistance: spell.spellResistance,
        description:    spell.description,
        sourceName:     'd20pfsrd.com',
        sourceUrl:      spell.sourceUrl,
      },
      update: {
        name:           spell.name,
        school:         spell.school,
        subschool:      spell.subschool,
        descriptor:     spell.descriptor,
        spellLevelJson: spell.spellLevelJson,
        castingTime:    spell.castingTime,
        components:     spell.components,
        rangeText:      spell.rangeText,
        targetText:     spell.targetText,
        areaText:       spell.areaText,
        effectText:     spell.effectText,
        durationText:   spell.durationText,
        savingThrow:    spell.savingThrow,
        spellResistance: spell.spellResistance,
        description:    spell.description,
      },
    })

    return existing ? 'updated' : 'created'
  },
}

const opts = parseCliOptions()
runImport(importer, opts).catch(err => { console.error(err); process.exit(1) })
