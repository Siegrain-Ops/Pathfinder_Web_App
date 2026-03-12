import { load } from 'cheerio'
import { cleanText } from './normalizer'
import { removeNoise } from './html-utils'

const BASE_URL = 'https://www.d20pfsrd.com'
const CATEGORY_HEADINGS = [
  'Core Classes',
  'Base Classes',
  'Hybrid Classes',
  'Unchained Classes',
  'Occult Classes',
  'Alternate Classes',
  'NPC Classes',
  'Prestige Classes',
] as const

export interface ParsedClassIndexEntry {
  name: string
  category: string | null
  sourceUrl: string
}

export interface ParsedClassPage {
  name: string
  role: string | null
  alignmentText: string | null
  description: string | null
  hitDie: number | null
  skillRanks: number | null
  classSkills: Array<{ name: string; stat?: string }> | null
  weaponArmorProficiency: string | null
  startingWealth: string | null
  babProgression: string | null
  goodSaves: string | null
  spellcastingType: string | null
  castingStat: string | null
  progressionTable: Array<{
    level: number
    baseAttackBonus: number | null
    fortSave: number | null
    refSave: number | null
    willSave: number | null
    special: string[]
    spellsPerDay?: string[]
  }> | null
  classFeatures: Array<{ level?: number; name: string; description: string }> | null
}

export function parseClassListPage(html: string): ParsedClassIndexEntry[] {
  const $ = load(html)
  const entries: ParsedClassIndexEntry[] = []
  const seen = new Set<string>()

  for (const headingText of CATEGORY_HEADINGS) {
    const heading = $('h2, h3').filter((_, el) => cleanText($(el).text()) === headingText).first()
    if (!heading.length) continue

    const category = normalizeCategory(headingText)
    const table = heading.nextAll('table').first()
    if (!table.length) continue

    table.find('tbody tr').each((_, row) => {
      const firstLink = $(row).find('td').first().find('a[href]').first()
      const href = firstLink.attr('href')
      const name = cleanText(firstLink.text())
      if (!href || !name) return

      const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
      if (seen.has(sourceUrl)) return
      seen.add(sourceUrl)

      entries.push({ name, category, sourceUrl })
    })
  }

  return entries
}

export function parseClassPage(html: string, _url: string): ParsedClassPage | null {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return null

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const name = cleanText(body.find('h1').first().text())
  if (!name || /page not found/i.test(name)) return null

  const role = extractLabeledParagraph($, body, 'Role')
  const alignmentText = extractLabeledParagraph($, body, 'Alignment')
  const hitDie = parseHitDie(extractLabeledParagraph($, body, 'Hit Die'))
  const startingWealth = extractLabeledParagraph($, body, 'Starting Wealth')
  const classSkillsText = extractSectionParagraph($, body, 'Class Skills')
  const skillRanks = parseSkillRanks(body.text())
  const classSkills = parseClassSkills(classSkillsText)
  const proficiency = extractHeadingDescription($, body, 'Weapon and Armor Proficiency')
  const progressionTable = extractProgressionTable($, body)
  const classFeatures = extractClassFeatures($, body)

  return {
    name,
    role,
    alignmentText,
    description: extractIntroDescription(body),
    hitDie,
    skillRanks,
    classSkills,
    weaponArmorProficiency: proficiency,
    startingWealth,
    babProgression: inferBabProgression(progressionTable),
    goodSaves: inferGoodSaves(progressionTable),
    spellcastingType: inferSpellcastingType($, body, progressionTable),
    castingStat: inferCastingStat($, body),
    progressionTable,
    classFeatures,
  }
}

function normalizeCategory(raw: string): string {
  return raw.toLowerCase().replace(/\s+classes?$/, '').trim()
}

function extractLabeledParagraph($: ReturnType<typeof load>, body: any, label: string): string | null {
  const lower = label.toLowerCase()
  let found: string | null = null

  body.find('p').each((_: unknown, p: unknown) => {
    if (found) return false
    const text = cleanText($(p).text())
    if (!text) return
    const match = text.match(/^([^:]+):\s*(.+)$/)
    if (!match) return
    if (match[1].trim().toLowerCase() !== lower) return
    found = cleanText(match[2])
    return false
  })

  return found
}

function extractSectionParagraph($: ReturnType<typeof load>, body: any, headingText: string): string | null {
  const heading = findHeading($, body, headingText)
  if (!heading.length) return null

  const nextParagraph = heading.nextAll('p').first()
  return nextParagraph.length ? cleanText(nextParagraph.text()) : null
}

function parseHitDie(raw: string | null): number | null {
  if (!raw) return null
  const match = raw.match(/d(\d+)/i)
  return match ? Number(match[1]) : null
}

function parseSkillRanks(text: string): number | null {
  const match = text.match(/Skill Ranks Per Level:\s*(\d+)\s*\+/i)
  return match ? Number(match[1]) : null
}

function parseClassSkills(raw: string | null): Array<{ name: string; stat?: string }> | null {
  if (!raw) return null
  const match = raw.match(/class skills are\s+(.+?)(?:\.\s|$)/i)
  const listText = match ? match[1] : raw

  const entries = listText
    .replace(/\band\b/gi, ',')
    .split(',')
    .map(item => cleanText(item))
    .filter((value): value is string => Boolean(value))
    .map(item => {
      const cleanedItem = item.replace(/\.$/, '')
      const fullMatch = cleanedItem.match(/^(.+?)\s*\(([^)]+)\)$/)
      if (!fullMatch) return { name: item }
      return {
        name: cleanText(fullMatch[1]) ?? item,
        stat: normalizeStat(fullMatch[2]) ?? undefined,
      }
    })

  return entries.length > 0 ? entries : null
}

function normalizeStat(raw: string | null | undefined): string | null {
  if (!raw) return null
  const normalized = raw.trim().toLowerCase()
  const map: Record<string, string> = {
    str: 'strength',
    dex: 'dexterity',
    con: 'constitution',
    int: 'intelligence',
    wis: 'wisdom',
    cha: 'charisma',
  }
  return map[normalized] ?? normalized
}

function extractHeadingDescription($: ReturnType<typeof load>, body: any, headingText: string): string | null {
  const heading = findHeading($, body, headingText)
  if (!heading.length) return null

  const parts: string[] = []
  let node = heading.next()

  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())
    if (tag && /^h[2-4]$/.test(tag)) break
    if (tag === 'p' && text) parts.push(text)
    node = node.next()
  }

  return parts.length > 0 ? parts.join('\n\n') : null
}

function findHeading($: ReturnType<typeof load>, body: any, headingText: string) {
  return body.find('h2, h3, h4').filter((_: unknown, el: unknown) => {
    const text = cleanText($(el).text())
    return text?.toLowerCase() === headingText.toLowerCase()
  }).first()
}

function extractProgressionTable($: ReturnType<typeof load>, body: any) {
  const table = body.find('table').filter((_: unknown, tableEl: unknown) => {
    const caption = cleanText($(tableEl).find('caption').first().text())
    const headers = $(tableEl).find('thead th, thead td').map((__: unknown, el: unknown) => cleanText($(el).text())?.toLowerCase() ?? '').get()
    return Boolean(
      caption?.startsWith('Table:') ||
      (headers.includes('level') && headers.some((header: string) => header.includes('base attack bonus')))
    )
  }).first()

  if (!table.length) return null

  const headers = table.find('thead th, thead td').map((_: unknown, el: unknown) => cleanText($(el).text())?.toLowerCase() ?? '').get() as string[]
  const rows = table.find('tbody tr')
  const result: ParsedClassPage['progressionTable'] = []

  rows.each((_: unknown, row: unknown) => {
    const cells = $(row).find('td')
    if (!cells.length) return

    const values = cells.map((__: unknown, cell: unknown) => cleanText($(cell).text()) ?? '').get() as string[]
    const getByHeader = (matcher: (header: string) => boolean) => {
      const idx = headers.findIndex(matcher)
      return idx >= 0 ? values[idx] : null
    }

    const level = parseLevel(getByHeader(header => header === 'level'))
    if (!level) return

    const specialText = getByHeader(header => header.includes('special'))
    const spellColumns = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => {
        const normalized = header.replace(/\s+/g, '')
        return /^0$|^\d+(st|nd|rd|th)$/.test(normalized) || header.includes('spells per day')
      })
      .map(({ index }) => values[index])
      .filter(Boolean)

    const babValue =
      getByHeader(header => header.includes('base attack bonus')) ??
      getByHeader(header => header === 'bab')

    result?.push({
      level,
      baseAttackBonus: parseBab(babValue),
      fortSave: parseSignedNumber(getByHeader(header => header.startsWith('fort'))),
      refSave: parseSignedNumber(getByHeader(header => header.startsWith('ref'))),
      willSave: parseSignedNumber(getByHeader(header => header.startsWith('will'))),
      special: specialText ? splitSpecials(specialText) : [],
      ...(spellColumns.length > 0 ? { spellsPerDay: spellColumns } : {}),
    })
  })

  return result && result.length > 0 ? result : null
}

function parseLevel(raw: string | null): number | null {
  if (!raw) return null
  const match = raw.match(/(\d+)/)
  return match ? Number(match[1]) : null
}

function parseBab(raw: string | null): number | null {
  if (!raw) return null
  const first = raw.split('/')[0]
  return parseSignedNumber(first)
}

function parseSignedNumber(raw: string | null): number | null {
  if (!raw) return null
  const normalized = raw.replace(/[–—−]/g, '-')
  const match = normalized.match(/[+-]?\d+/)
  return match ? Number(match[0]) : null
}

function splitSpecials(raw: string): string[] {
  return raw
    .split(/,(?![^()]*\))/)
    .map(part => cleanText(part))
    .filter((value): value is string => Boolean(value))
}

function inferBabProgression(rows: ParsedClassPage['progressionTable']): string | null {
  if (!rows || rows.length < 2) return null
  const row20 = rows.find(row => row.level === 20)
  if (!row20) return null
  if (row20.baseAttackBonus === 20) return 'full'
  if (row20.baseAttackBonus === 15) return '3/4'
  if (row20.baseAttackBonus === 10) return '1/2'
  return null
}

function inferGoodSaves(rows: ParsedClassPage['progressionTable']): string | null {
  if (!rows || rows.length === 0) return null
  const first = rows[0]
  const good: string[] = []
  if (first.fortSave === 2) good.push('fort')
  if (first.refSave === 2) good.push('ref')
  if (first.willSave === 2) good.push('will')
  return good.length > 0 ? good.join(',') : ''
}

function inferSpellcastingType($: ReturnType<typeof load>, body: any, rows: ParsedClassPage['progressionTable']): string | null {
  const spellsHeading = findHeading($, body, 'Spells')
  if (!spellsHeading.length && !(rows && rows.some(row => row.spellsPerDay?.length))) return 'none'
  const spellsText = extractHeadingDescription($, body, 'Spells') ?? body.text()
  if (/casts spells from the bard spell list|casts spells drawn from|can cast only a certain number of spells/i.test(spellsText)) return 'spontaneous'
  if (/must choose and prepare|prepare his spells|prepare her spells/i.test(spellsText)) return 'prepared'
  return 'custom'
}

function inferCastingStat($: ReturnType<typeof load>, body: any): string | null {
  const spellsText = extractHeadingDescription($, body, 'Spells') ?? body.text()
  const match = spellsText.match(/must have an?\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+score/i)
  return match ? normalizeStat(match[1]) : null
}

function extractIntroDescription(body: any): string | null {
  const heading = body.find('h1').first()
  if (!heading.length) return null

  const parts: string[] = []
  let node = heading.next()

  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())
    if (tag === 'table') break
    if (tag && /^h[2-4]$/.test(tag) && text && /class skills|class features/i.test(text)) break
    if (tag === 'p' && text && !/^(role|alignment|hit die|starting wealth):/i.test(text)) parts.push(text)
    if (parts.length >= 2) break
    node = node.next()
  }

  return parts.length > 0 ? parts.join('\n\n') : null
}

function extractClassFeatures($: ReturnType<typeof load>, body: any) {
  const section = findHeading($, body, 'Class Features')
  if (!section.length) return null

  const features: Array<{ level?: number; name: string; description: string }> = []
  let node = section.next()

  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())

    if (tag === 'h2' && text && !/class features/i.test(text)) break
    if ((tag === 'h3' || tag === 'h4') && text) {
      const name = text.replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, '')
      const description = collectFollowingParagraphs(node)
      if (description) features.push({ name, description })
    }

    node = node.next()
  }

  return features.length > 0 ? features : null
}

function collectFollowingParagraphs(startNode: any): string | null {
  const parts: string[] = []
  let node = startNode.next()

  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())
    if (tag && /^h[2-4]$/.test(tag)) break
    if (tag === 'p' && text) parts.push(text)
    node = node.next()
  }

  return parts.length > 0 ? parts.join('\n\n') : null
}
