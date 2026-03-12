import { load } from 'cheerio'
import { cleanText } from './normalizer'
import { removeNoise } from './html-utils'

const BASE_URL = 'https://www.d20pfsrd.com'
const ROGUE_TALENTS_BASE_PATH = '/classes/core-classes/rogue/rogue-talents/paizo-rogue-talents/'
const NINJA_TRICKS_BASE_PATH = '/classes/alternate-classes/ninja/ninja-tricks/paizo-ninja-tricks/'
const NINJA_MASTER_TRICKS_BASE_PATH = '/classes/alternate-classes/ninja/ninja-tricks/paizo-ninja-tricks/paizo-ninja-master-tricks/'
const SLAYER_TALENTS_BASE_PATH = '/classes/hybrid-classes/slayer/slayer-talents/paizo-slayer-talents/'
const ADVANCED_SLAYER_TALENTS_BASE_PATH = '/classes/hybrid-classes/slayer/slayer-talents/paizo-slayer-talents-advanced/'
const ARCANE_EXPLOITS_BASE_PATH = '/classes/hybrid-classes/arcanist/arcane-exploits/'
const ARCANE_EXPLOITS_3PP_PATH = '/classes/hybrid-classes/arcanist/arcane-exploits/arcanist-exploits-jon-brazer-enterprises/'
const INVESTIGATOR_TALENTS_BASE_PATH = '/classes/hybrid-classes/investigator/investigator-talents/paizo-investigator-talents/'
const MAGUS_ARCANA_BASE_PATH = '/classes/base-classes/magus/magus-arcana/paizo-magus-arcana/'
const RAGE_POWERS_BASE_PATH = '/classes/core-classes/barbarian/rage-powers/paizo-rage-powers/'
const WITCH_COMMON_HEXES_BASE_PATH = '/classes/base-classes/witch/hexes/hexes/common-hexes/'
const WITCH_MAJOR_HEXES_BASE_PATH = '/classes/base-classes/witch/hexes/hexes/major-hexes/'
const WITCH_GRAND_HEXES_BASE_PATH = '/classes/base-classes/witch/hexes/hexes/grand-hexes/'
const WIZARD_SCHOOLS_BASE_PATH = '/classes/core-classes/wizard/arcane-schools/paizo-arcane-schools/'
const SHAMAN_SPIRITS_BASE_PATH = '/classes/hybrid-classes/shaman/spirits/'
const CAVALIER_ORDERS_BASE_PATH = '/classes/base-classes/cavalier/orders/paizo-cavalier-orders/'
const INQUISITIONS_BASE_PATH = '/classes/base-classes/inquisitor/inquisitions/inquistions-paizo/'

export interface ParsedTalentIndexEntry {
  name: string
  talentFamily: string
  className: string
  sourceUrl: string
}

export interface ParsedTalentPage {
  name: string
  talentFamily: string
  className: string
  prerequisites: string | null
  abilityType: string | null
  description: string | null
  sourceName: string
  sourceUrl: string
}

export interface RogueEdgeSkillEntry {
  name: string
  sourceUrl: string
}

export function parseRogueTalentListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const name = normalizeTalentName(cleanText($(el).text()))
    if (!href || !name) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isPaizoRogueTalentUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    entries.push({
      name,
      talentFamily: inferTalentFamily(name),
      className: 'rogue',
      sourceUrl,
    })
  })

  return entries
}

export function parseNinjaTalentListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    const family = inferNinjaTalentFamily(sourceUrl)
    if (!family) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: family,
      className: 'ninja',
      sourceUrl,
    })
  })

  return entries
}

export function parseSlayerTalentListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    const family = inferSlayerTalentFamily(sourceUrl)
    if (!family) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: family,
      className: 'slayer',
      sourceUrl,
    })
  })

  return entries
}

export function parseArcaneExploitListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isArcaneExploitUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: 'arcane exploit',
      className: 'arcanist',
      sourceUrl,
    })
  })

  return entries
}

export function parseInvestigatorTalentListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isInvestigatorTalentUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: 'investigator talent',
      className: 'investigator',
      sourceUrl,
    })
  })

  return entries
}

export function parseMagusArcanaListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isMagusArcanaUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: 'magus arcana',
      className: 'magus',
      sourceUrl,
    })
  })

  return entries
}

export function parseRagePowerListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isRagePowerUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: 'rage power',
      className: 'barbarian',
      sourceUrl,
    })
  })

  return entries
}

export function parseWitchHexListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isWitchHexUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: 'witch hex',
      className: 'witch',
      sourceUrl,
    })
  })

  return entries
}

export function parseWizardSchoolListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isWizardSchoolUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: 'school power',
      className: 'wizard',
      sourceUrl,
    })
  })

  return entries
}

export function parseShamanSpiritListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isShamanSpiritUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: 'shaman hex',
      className: 'shaman',
      sourceUrl,
    })
  })

  return entries
}

export function parseCavalierOrderListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isCavalierOrderUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: 'cavalier order',
      className: 'cavalier',
      sourceUrl,
    })
  })

  return entries
}

export function parseInquisitionListPage(html: string): ParsedTalentIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedTalentIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const rawName = cleanText($(el).text())
    if (!href || !rawName) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isInquisitionUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    const name = normalizeTalentName(rawName)
    if (!name) return

    entries.push({
      name,
      talentFamily: 'inquisition',
      className: 'inquisitor',
      sourceUrl,
    })
  })

  return entries
}

export function parseVigilanteTalentSectionPage(html: string, url: string): ParsedTalentPage[] {
  const $ = load(html)
  removeNoise($)

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const talents: ParsedTalentPage[] = []
  let inTalentBlock = false

  body.find('p').each((_, el) => {
    const paragraph = $(el)
    const emphasis = paragraph.find('em').first()
    const headerText = cleanText(emphasis.text())
    if (!headerText) return

    if (!inTalentBlock) {
      if (/^Aquatic Action\s+\((Ex|Su|Sp)\)/i.test(headerText)) {
        inTalentBlock = true
      } else {
        return
      }
    }

    if (/^Unshakable\s+\((Ex|Su|Sp)\)/i.test(headerText)) {
      inTalentBlock = false
      return false
    }

    const headerMatch = headerText.match(/^(.*?)\s+\((Ex|Su|Sp)\)\s*:?\s*$/i)
    if (!headerMatch) return

    const name = normalizeTalentName(headerMatch[1])
    if (!name) return

    const fullText = cleanText(paragraph.text())
    const descriptionWithNotes = cleanText(fullText.replace(headerText, ''))
    const prerequisites = extractVigilanteTalentPrerequisites(descriptionWithNotes)
    const description = normalizeVigilanteTalentDescription(descriptionWithNotes)
    const abilityType = normalizeAbilityType(headerMatch[2])

    talents.push({
      name,
      talentFamily: 'vigilante talent',
      className: 'vigilante',
      prerequisites,
      abilityType,
      description,
      sourceName: 'Paizo, Inc.',
      sourceUrl: `${url}#${truncateFragment(name, 80)}`,
    })
  })

  return talents
}

export function parseRogueEdgeSkillPage(
  html: string,
  entry: RogueEdgeSkillEntry,
): ParsedTalentPage | null {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return null

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const text = body.text().replace(/\s+/g, ' ').trim()
  const marker = `With sufficient ranks in ${entry.name}, you earn the following.`
  const start = text.indexOf(marker)
  if (start === -1) return null

  const section15 = text.indexOf('Section 15:', start)
  const snippet = section15 >= 0 ? text.slice(start, section15) : text.slice(start)
  const description = cleanText(
    snippet
      .replace(marker, '')
      .replace(/\s+(?:Time Machine!|FYI:).*/i, ''),
  )
  if (!description) return null

  return {
    name: entry.name,
    talentFamily: 'rogue edge',
    className: 'rogue',
    prerequisites: 'Unchained rogue Rogue’s Edge feature',
    abilityType: 'extraordinary',
    description,
    sourceName: 'Paizo, Inc.',
    sourceUrl: entry.sourceUrl,
  }
}

export function parseOracleCursesPage(html: string, url: string): ParsedTalentPage[] {
  const $ = load(html)
  removeNoise($)

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const curses: ParsedTalentPage[] = []
  const sectionStart = body.find('#curse_descriptions').first().closest('h3')
  if (!sectionStart.length) return curses

  let node = sectionStart.next()
  while (node.length) {
    if (node.is('h3')) {
      const heading = cleanText(node.text())
      if (/^3rd Party Curses/i.test(heading)) break
    }

    if (node.is('h4')) {
      const name = cleanText(node.text())
      if (name) {
        const parts: string[] = []
        let cursor = node.next()

        while (cursor.length && !cursor.is('h4') && !cursor.is('h3')) {
          const text = cleanText(cursor.text())
          if (text) parts.push(text)
          cursor = cursor.next()
        }

        const description = cleanText(
          parts
            .join(' ')
            .replace(/\bSource\s+[A-Z0-9:.-]+\b/gi, '')
            .replace(/\bEffect\b\s*/i, '')
            .trim(),
        )

        if (description) {
          curses.push({
            name,
            talentFamily: 'oracle curse',
            className: 'oracle',
            prerequisites: null,
            abilityType: 'extraordinary',
            description,
            sourceName: 'Paizo, Inc.',
            sourceUrl: `${url}#${slugifyFragment(name)}`,
          })
        }
      }
    }

    node = node.next()
  }

  return curses
}

export function parsePaladinMerciesPage(html: string, url: string): ParsedTalentPage[] {
  const $ = load(html)
  removeNoise($)

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const text = body.text().replace(/\s+/g, ' ').trim()
  const start = text.indexOf('Fatigued:')
  const end = start >= 0 ? text.indexOf('Channel Positive Energy', start) : -1
  if (start === -1 || end === -1 || end <= start) return []

  const section = text.slice(start, end)
  const mercies: ParsedTalentPage[] = []

  const segments = [
    { minLevel: 3, text: section.split('At 6th level,')[0] },
    {
      minLevel: 6,
      text: between(section, 'At 6th level, a paladin adds the following mercies to the list of those that can be selected.', 'At 9th level,'),
    },
    {
      minLevel: 9,
      text: between(section, 'At 9th level, a paladin adds the following mercies to the list of those that can be selected.', 'At 12th level,'),
    },
    {
      minLevel: 12,
      text: between(section, 'At 12th level, a paladin adds the following mercies to the list of those that can be selected.', 'These abilities are cumulative.'),
    },
  ]

  const entryPattern = /([A-Z][A-Za-z'’ -]+):\s+(.+?)(?=\s+[A-Z][A-Za-z'’ -]+:\s+|$)/g

  for (const segment of segments) {
    if (!segment.text) continue

    for (const match of segment.text.matchAll(entryPattern)) {
      const name = cleanText(match[1])
      const description = cleanText(match[2]?.replace(/\s+Source\s+[A-Z0-9:.-]+/gi, ''))
      if (!name || !description) continue

      let prerequisites = `Paladin level ${segment.minLevel}+`
      const prereqMatch = description.match(/The paladin must have [^.]+ before (?:selecting|she can select) this mercy\./i)
      if (prereqMatch) prerequisites += `. ${cleanText(prereqMatch[0])}`

      mercies.push({
        name,
        talentFamily: 'paladin mercy',
        className: 'paladin',
        prerequisites,
        abilityType: 'supernatural',
        description,
        sourceName: 'Paizo, Inc.',
        sourceUrl: `${url}#${slugifyFragment(name)}`,
      })
    }
  }

  return mercies
}

export function parseWizardSchoolPage(
  html: string,
  url: string,
  fallback: Omit<ParsedTalentIndexEntry, 'sourceUrl'>,
): ParsedTalentPage[] {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return []

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const schoolName = normalizeTalentName(cleanText(body.find('h1').first().text())) ?? fallback.name
  if (!schoolName) return []

  const talents: ParsedTalentPage[] = []

  body.find('h4').each((_, el) => {
    const heading = cleanText($(el).text())
    const match = heading.match(/^(.*?)\s*\((su|sp|ex)\)\s*$/i)
    if (!match) return

    const name = normalizeTalentName(match[1])
    if (!name) return

    const description = collectSiblingParagraphs($, $(el))
    if (!description) return

    talents.push({
      name,
      talentFamily: fallback.talentFamily,
      className: fallback.className,
      prerequisites: `Wizard school: ${schoolName}`,
      abilityType: normalizeAbilityType(match[2]),
      description,
      sourceName: 'Paizo, Inc.',
      sourceUrl: buildWizardSchoolPowerSourceUrl(url, name),
    })
  })

  return talents
}

export function parseShamanSpiritPage(
  html: string,
  url: string,
  fallback: Omit<ParsedTalentIndexEntry, 'sourceUrl'>,
): ParsedTalentPage[] {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return []

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const spiritName = normalizeTalentName(cleanText(body.find('h1').first().text())) ?? fallback.name
  if (!spiritName) return []

  const talents: ParsedTalentPage[] = []
  let hexHeading = body.find('h4').filter((_, el) => /^Hexes$/i.test(cleanText($(el).text()))).first()
  if (!hexHeading.length) return talents

  let node = hexHeading.next()
  while (node.length) {
    if (node.is('h4')) break

    const blocks = node.is('div')
      ? node.find('p').length ? node.find('p').toArray().map((el) => cleanText($(el).text())) : [cleanText(node.text())]
      : node.is('p') ? [cleanText(node.text())]
        : []

    for (const text of blocks) {
      const match = text.match(/^(.*?)\s+\((Ex|Su|Sp)\):\s+(.+)$/i)
      if (!match) continue

      const name = normalizeTalentName(match[1])
      const description = cleanText(match[3])
      if (name && description) {
        talents.push({
          name,
          talentFamily: 'shaman hex',
          className: 'shaman',
          prerequisites: `Shaman spirit: ${spiritName}`,
          abilityType: normalizeAbilityType(match[2]),
          description,
          sourceName: 'Paizo, Inc.',
          sourceUrl: `${url}#${slugifyFragment(name)}`,
        })
      }
    }

    node = node.next()
  }

  return talents
}

export function parseQinggongKiPowersPage(html: string, url: string): ParsedTalentPage[] {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return []

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const powers: ParsedTalentPage[] = []
  let currentLevel: number | null = null

  body.children().each((_, el) => {
    const node = $(el)

    if (node.is('h4')) {
      const heading = cleanText(node.text())
      const levelMatch = heading.match(/^(\d+)(?:st|nd|rd|th)-Level Ki Powers$/i)
      currentLevel = levelMatch ? Number(levelMatch[1]) : null
      return
    }

    if (!currentLevel || !node.is('ul')) return

    node.find('li').each((__, li) => {
      const item = $(li)
      const text = cleanText(item.text())
      if (!text) return

      const namePart = cleanText(text.replace(/\([^)]*\)\s*$/g, '').replace(/,\s*†\s*/g, ''))
      if (!namePart) return

      const links = item.find('a[href]').map((___, a) => {
        const href = $(a).attr('href')
        return href?.startsWith('http') ? href : href ? `${BASE_URL}${href}` : null
      }).get().filter(Boolean) as string[]

      const primaryLink = links.find((href) => !href.includes('#Footnote-ImmediateActivate')) ?? null
      const costMatch = text.match(/\(([^)]*ki point[^)]*)\)$/i)
      const activation = cleanText(costMatch?.[1] ?? null)
      const immediate = links.some((href) => href.includes('#Footnote-ImmediateActivate'))
      const kind = inferKiPowerKind(primaryLink)
      const abilityType = kind === 'spell' ? 'spell-like' : null

      const descriptionParts = [
        `Qinggong ki power selectable at monk level ${currentLevel}+.`,
        activation ? `Activation: ${activation}.` : null,
        immediate ? 'May also be activated as an immediate action.' : null,
        kind === 'spell' && primaryLink ? `Duplicates the linked spell.` : null,
        kind === 'feat' && primaryLink ? `Duplicates the linked feat.` : null,
        kind === 'monk ability' ? 'Duplicates a standard monk ability.' : null,
      ].filter(Boolean)

      powers.push({
        name: namePart,
        talentFamily: 'ki power',
        className: 'monk',
        prerequisites: `Monk level ${currentLevel}+`,
        abilityType,
        description: descriptionParts.join(' '),
        sourceName: 'Paizo, Inc.',
        sourceUrl: `${url}#${slugifyFragment(namePart)}`,
      })
    })
  })

  return powers
}

export function parseCavalierOrderPage(
  html: string,
  url: string,
  fallback: Omit<ParsedTalentIndexEntry, 'sourceUrl'>,
): ParsedTalentPage | null {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return null

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const rawTitle = cleanText(body.find('h1').first().text())
  if (!rawTitle || /page not found/i.test(rawTitle)) return null
  const name = normalizeTalentName(rawTitle) ?? fallback.name

  const paragraphs = body.children('p').toArray().map((el) => cleanText($(el).text())).filter(Boolean)
  if (!paragraphs.length) return null

  const intro = paragraphs.find((text) => !/^(Contents|Edicts:|Challenge:|Skills:|Order Abilities:)/i.test(text)) ?? null
  const edicts = paragraphs.find((text) => /^Edicts:/i.test(text)) ?? null
  const challenge = paragraphs.find((text) => /^Challenge:/i.test(text)) ?? null
  const skills = paragraphs.find((text) => /^Skills:/i.test(text)) ?? null

  const orderAbilities: string[] = []
  body.find('h4').each((_, el) => {
    const heading = cleanText($(el).text())
    if (!heading) return
    const description = collectSiblingParagraphs($, $(el))
    if (!description) return
    orderAbilities.push(`${heading}: ${description}`)
  })

  const description = cleanText([
    intro,
    edicts,
    challenge,
    skills,
    orderAbilities.length ? `Order abilities: ${orderAbilities.join(' ')}` : null,
  ].filter(Boolean).join(' '))

  if (!description) return null

  return {
    name,
    talentFamily: fallback.talentFamily,
    className: fallback.className,
    prerequisites: null,
    abilityType: null,
    description,
    sourceName: 'Paizo, Inc.',
    sourceUrl: url,
  }
}

export function parseInquisitionPage(
  html: string,
  url: string,
  fallback: Omit<ParsedTalentIndexEntry, 'sourceUrl'>,
): ParsedTalentPage | null {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return null

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const rawTitle = cleanText(body.find('h1').first().text())
  if (!rawTitle || /page not found/i.test(rawTitle)) return null
  const name = normalizeTalentName(rawTitle) ?? fallback.name

  const paragraphs = body.children('p').toArray().map((el) => cleanText($(el).text())).filter(Boolean)
  if (!paragraphs.length) return null

  const intro = paragraphs.find((text) => !/^Granted Powers:?$/i.test(text) && !/^(Pathfinder Roleplaying Game|Advanced Player’s Guide|Ultimate Magic)/i.test(text)) ?? null
  const granted = paragraphs
    .filter((text) => /\((Ex|Su|Sp)\):/i.test(text))
    .map((text) => text)

  const description = cleanText([
    intro,
    granted.length ? `Granted powers: ${granted.join(' ')}` : null,
  ].filter(Boolean).join(' '))

  if (!description) return null

  return {
    name,
    talentFamily: fallback.talentFamily,
    className: fallback.className,
    prerequisites: null,
    abilityType: null,
    description,
    sourceName: 'Paizo, Inc.',
    sourceUrl: url,
  }
}

export function parseTalentPage(
  html: string,
  url: string,
  fallback: Omit<ParsedTalentIndexEntry, 'sourceUrl'>,
): ParsedTalentPage | null {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return null

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const rawTitle = cleanText(body.find('h1').first().text())
  if (!rawTitle || /page not found/i.test(rawTitle)) return null

  const text = body.text().replace(/\s+/g, ' ').trim()
  const titleMatch = rawTitle.match(/^(.*?)\s*\((su|sp|ex)\)\s*$/i)
  const name = normalizeTalentName(titleMatch?.[1] ?? rawTitle) ?? fallback.name
  const abilityType = normalizeAbilityType(titleMatch?.[2] ?? null)
  const rawDescription = extractField(text, 'Benefit') ?? extractDescription(text)
  const inlinePrerequisite = extractInlinePrerequisite(rawDescription)
  const prerequisites = normalizeInlineField(
    extractField(text, 'Prerequisite') ??
      extractField(text, 'Prerequisites') ??
      inlinePrerequisite,
  )
  const description = normalizeTalentDescription(rawDescription)

  return {
    name,
    talentFamily: fallback.talentFamily,
    className: fallback.className,
    prerequisites,
    abilityType,
    description,
    sourceName: 'Paizo, Inc.',
    sourceUrl: url,
  }
}

function isPaizoRogueTalentUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(ROGUE_TALENTS_BASE_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(ROGUE_TALENTS_BASE_PATH) + ROGUE_TALENTS_BASE_PATH.length)
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function inferNinjaTalentFamily(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase()

    if (pathname.includes(NINJA_MASTER_TRICKS_BASE_PATH)) {
      const remainder = pathname.slice(pathname.indexOf(NINJA_MASTER_TRICKS_BASE_PATH) + NINJA_MASTER_TRICKS_BASE_PATH.length)
      return /^[^/]+\/?$/.test(remainder) ? 'ninja master trick' : null
    }

    if (pathname.includes(NINJA_TRICKS_BASE_PATH)) {
      const remainder = pathname.slice(pathname.indexOf(NINJA_TRICKS_BASE_PATH) + NINJA_TRICKS_BASE_PATH.length)
      return /^[^/]+\/?$/.test(remainder) ? 'ninja trick' : null
    }

    return null
  } catch {
    return null
  }
}

function inferSlayerTalentFamily(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase()

    if (pathname.includes(ADVANCED_SLAYER_TALENTS_BASE_PATH)) {
      const remainder = pathname.slice(pathname.indexOf(ADVANCED_SLAYER_TALENTS_BASE_PATH) + ADVANCED_SLAYER_TALENTS_BASE_PATH.length)
      return /^[^/]+\/?$/.test(remainder) ? 'advanced slayer talent' : null
    }

    if (pathname.includes(SLAYER_TALENTS_BASE_PATH)) {
      const remainder = pathname.slice(pathname.indexOf(SLAYER_TALENTS_BASE_PATH) + SLAYER_TALENTS_BASE_PATH.length)
      return /^[^/]+\/?$/.test(remainder) ? 'slayer talent' : null
    }

    return null
  } catch {
    return null
  }
}

function isArcaneExploitUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(ARCANE_EXPLOITS_BASE_PATH)) return false
    if (pathname.includes(ARCANE_EXPLOITS_3PP_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(ARCANE_EXPLOITS_BASE_PATH) + ARCANE_EXPLOITS_BASE_PATH.length)
    if (!remainder || remainder.startsWith('#')) return false
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function isInvestigatorTalentUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(INVESTIGATOR_TALENTS_BASE_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(INVESTIGATOR_TALENTS_BASE_PATH) + INVESTIGATOR_TALENTS_BASE_PATH.length)
    if (!remainder || remainder.startsWith('#')) return false
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function isMagusArcanaUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(MAGUS_ARCANA_BASE_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(MAGUS_ARCANA_BASE_PATH) + MAGUS_ARCANA_BASE_PATH.length)
    if (!remainder || remainder.startsWith('#')) return false
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function isRagePowerUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(RAGE_POWERS_BASE_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(RAGE_POWERS_BASE_PATH) + RAGE_POWERS_BASE_PATH.length)
    if (!remainder || remainder.startsWith('#') || remainder.startsWith('rage-powers-blood')) return false
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function isWitchHexUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    const basePath =
      pathname.includes(WITCH_COMMON_HEXES_BASE_PATH) ? WITCH_COMMON_HEXES_BASE_PATH
        : pathname.includes(WITCH_MAJOR_HEXES_BASE_PATH) ? WITCH_MAJOR_HEXES_BASE_PATH
          : pathname.includes(WITCH_GRAND_HEXES_BASE_PATH) ? WITCH_GRAND_HEXES_BASE_PATH
            : null
    if (!basePath) return false
    const remainder = pathname.slice(pathname.indexOf(basePath) + basePath.length)
    if (!remainder || remainder.startsWith('#')) return false
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function isWizardSchoolUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(WIZARD_SCHOOLS_BASE_PATH)) return false

    const remainder = pathname.slice(pathname.indexOf(WIZARD_SCHOOLS_BASE_PATH) + WIZARD_SCHOOLS_BASE_PATH.length)
    if (!remainder || remainder.startsWith('#')) return false

    const normalized = remainder.replace(/\/+$/, '')
    if (!normalized) return false

    if (normalized === 'classic-arcane-schools' || normalized === 'elemental-arcane-schools') return false

    const segments = normalized.split('/').filter(Boolean)
    return segments.length >= 2
  } catch {
    return false
  }
}

function isShamanSpiritUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(SHAMAN_SPIRITS_BASE_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(SHAMAN_SPIRITS_BASE_PATH) + SHAMAN_SPIRITS_BASE_PATH.length)
    if (!remainder || remainder.startsWith('#')) return false
    if (pathname.includes('/3rd-party-shaman-spirits/')) return false

    const normalized = remainder.replace(/\/+$/, '')
    if (!normalized) return false

    const segments = normalized.split('/').filter(Boolean)
    return segments.length === 1
  } catch {
    return false
  }
}

function inferKiPowerKind(url: string | null): 'spell' | 'feat' | 'monk ability' | null {
  if (!url) return null
  if (url.includes('/magic/all-spells/')) return 'spell'
  if (url.includes('/feats/')) return 'feat'
  if (url.includes('/classes/core-classes/monk')) return 'monk ability'
  return null
}

function isCavalierOrderUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(CAVALIER_ORDERS_BASE_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(CAVALIER_ORDERS_BASE_PATH) + CAVALIER_ORDERS_BASE_PATH.length)
    if (!remainder || remainder.startsWith('#')) return false
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function isInquisitionUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(INQUISITIONS_BASE_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(INQUISITIONS_BASE_PATH) + INQUISITIONS_BASE_PATH.length)
    if (!remainder || remainder.startsWith('#')) return false
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function normalizeTalentName(name: string | null): string | null {
  if (!name) return null
  return name
    .replace(/\s*\((?:su|sp|ex)\)\s*$/i, '')
    .replace(/\*+$/g, '')
    .trim() || null
}

function inferTalentFamily(name: string): string {
  return /advanced/i.test(name) ? 'advanced rogue talent' : 'rogue talent'
}

function normalizeAbilityType(raw: string | null): string | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower === 'su') return 'supernatural'
  if (lower === 'sp') return 'spell-like'
  if (lower === 'ex') return 'extraordinary'
  return lower
}

function extractField(text: string, label: string): string | null {
  const regex = new RegExp(`${label}:\\s*(.+?)(?=\\s+(?:Prerequisite|Prerequisites|Benefit|Benefits|Special|Section 15):|$)`, 'i')
  const match = text.match(regex)
  return cleanText(match?.[1] ?? null)
}

function extractDescription(text: string): string | null {
  const match = text.match(/^[^>]*?\)\s*(.+?)(?:\s+Section 15:|$)/i)
  return cleanText(match?.[1] ?? null)
}

function normalizeInlineField(value: string | null): string | null {
  const cleaned = cleanText(value)
  if (!cleaned) return null

  return cleaned
    .replace(/^Prerequisite\(s\):\s*/i, '')
    .replace(/^Prerequisites?:\s*/i, '')
    .trim() || null
}

function normalizeTalentDescription(value: string | null): string | null {
  const cleaned = cleanText(value)
  if (!cleaned) return null

  return cleaned
    .replace(/Prerequisite\(s\):\s*.+?(?=\s+Benefit\(s\):|\s+Benefit:|$)/i, '')
    .replace(/Prerequisites?:\s*.+?(?=\s+Benefit\(s\):|\s+Benefit:|$)/i, '')
    .replace(/^Benefit\(s\):\s*/i, '')
    .replace(/^Benefit:\s*/i, '')
    .replace(/\s+Benefit\(s\):\s*/gi, ' ')
    .replace(/\s+Benefit:\s*/gi, ' ')
    .trim() || null
}

function extractInlinePrerequisite(value: string | null): string | null {
  const cleaned = cleanText(value)
  if (!cleaned) return null

  const match = cleaned.match(/Prerequisite\(s\):\s*(.+?)(?=\s+Benefit\(s\):|\s+Benefit:|$)/i)
    ?? cleaned.match(/Prerequisites?:\s*(.+?)(?=\s+Benefit\(s\):|\s+Benefit:|$)/i)

  return cleanText(match?.[1] ?? null)
}

function extractVigilanteTalentPrerequisites(value: string | null): string | null {
  const cleaned = cleanText(value)
  if (!cleaned) return null

  const matches = cleaned.match(/(?:Only [^.]+? can select this talent\.|A vigilante must [^.]+? to select this talent\.)/gi)
  if (!matches?.length) return null
  return cleanText(matches.join(' '))
}

function normalizeVigilanteTalentDescription(value: string | null): string | null {
  const cleaned = cleanText(value)
  if (!cleaned) return null

  return cleaned
    .replace(/(?:Only [^.]+? can select this talent\.|A vigilante must [^.]+? to select this talent\.)/gi, '')
    .replace(/\s+PPC:[A-Za-z0-9]+/g, '')
    .replace(/^:\s*/, '')
    .trim() || null
}

function collectSiblingParagraphs($: ReturnType<typeof load>, heading: ReturnType<ReturnType<typeof load>>): string | null {
  const parts: string[] = []
  let node = heading.next()

  while (node.length) {
    if (/^h[1-6]$/i.test(node.get(0)?.tagName ?? '')) break
    if (node.is('p')) {
      const text = cleanText(node.text())
      if (text && !/^(contents|subpages)$/i.test(text)) parts.push(text)
    }
    node = node.next()
  }

  return cleanText(parts.join(' '))
}

function slugifyFragment(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
function truncateFragment(value: string, maxLength: number): string {
  return slugifyFragment(value).slice(0, maxLength).replace(/-+$/g, '')
}

function buildWizardSchoolPowerSourceUrl(url: string, powerName: string): string {
  const full = `${url}#${truncateFragment(powerName, 80)}`
  if (full.length <= 190) return full

  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '')
    const pageSlug = pathname.split('/').filter(Boolean).pop() ?? 'school'
    return `wizard-school:${pageSlug}#${truncateFragment(powerName, 40)}`
  } catch {
    return `wizard-school:${truncateFragment(powerName, 40)}`
  }
}

function between(text: string, startMarker: string, endMarker: string): string {
  const start = text.indexOf(startMarker)
  if (start === -1) return ''
  const from = start + startMarker.length
  const end = text.indexOf(endMarker, from)
  if (end === -1) return text.slice(from)
  return text.slice(from, end)
}
