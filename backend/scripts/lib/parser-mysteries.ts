import { load } from 'cheerio'
import { cleanText } from './normalizer'
import { removeNoise } from './html-utils'

const BASE_URL = 'https://www.d20pfsrd.com'
const MYSTERY_BASE_PATH = '/classes/base-classes/oracle/mysteries/paizo-oracle-mysteries/'

export interface ParsedMysteryIndexEntry {
  name: string
  sourceUrl: string
}

export interface ParsedMysteryPage {
  name: string
  className: string
  description: string | null
  classSkills: Array<{ name: string; stat?: string }> | null
  bonusSpells: Array<{ level: number; spellName: string }> | null
  revelations: Array<{ name: string; levelRequirement?: number; abilityType?: string; description: string }> | null
  finalRevelation: string | null
  sourceName: string
  sourceUrl: string
}

export function parseMysteryListPage(html: string): ParsedMysteryIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedMysteryIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const name = normalizeMysteryName(cleanText($(el).text()))
    if (!href || !name) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isPaizoMysteryDetailUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    entries.push({ name, sourceUrl })
  })

  return entries
}

export function parseMysteryPage(html: string, url: string): ParsedMysteryPage | null {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return null

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const rawName = cleanText(body.find('h1').first().text())
  if (!rawName || /page not found/i.test(rawName)) return null

  const name = normalizeMysteryName(rawName)
  const text = normalizeBodyText(body.text())

  return {
    name,
    className: 'oracle',
    description: extractDescription(text, name),
    classSkills: extractClassSkills(text),
    bonusSpells: extractBonusSpells(text),
    revelations: extractRevelations(text),
    finalRevelation: extractFinalRevelation(text),
    sourceName: 'Paizo, Inc.',
    sourceUrl: url,
  }
}

function isPaizoMysteryDetailUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(MYSTERY_BASE_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(MYSTERY_BASE_PATH) + MYSTERY_BASE_PATH.length)
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function normalizeMysteryName(name: string | null): string | null {
  if (!name) return null
  return name
    .replace(/\s+oracle mystery$/i, '')
    .replace(/\s+mystery$/i, '')
    .trim() || null
}

function normalizeBodyText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function extractDescription(text: string, mysteryName: string): string | null {
  const escapedName = escapeRegex(mysteryName)
  const patterns = [
    new RegExp(`${escapedName}\\s+(.+?)\\s+Class Skills:?`, 'i'),
    new RegExp(`${escapedName}\\s+(.+?)\\s+Bonus Spells:?`, 'i'),
    new RegExp(`${escapedName}\\s+(.+?)\\s+Revelations\\s+An oracle with`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return cleanMysteryBlock(match[1])
  }

  return null
}

function extractClassSkills(text: string): Array<{ name: string; stat?: string }> | null {
  const match = text.match(/Class Skills:\s+(.+?)\s+Bonus Spells:/i)
  if (!match?.[1]) return null

  const skillsText = match[1]
  const normalizedSkillsText = skillsText
    .replace(/^An oracle with the .+? adds\s+/i, '')
    .replace(/^An oracle with this mystery adds\s+/i, '')
    .replace(/\s+to (?:his|her|their) list of class skills\.?$/i, '')

  const skills = normalizedSkillsText
    .replace(/\band\b/gi, ',')
    .split(',')
    .map(part => cleanText(part))
    .filter((value): value is string => Boolean(value))
    .map(name => ({ name }))

  return skills.length > 0 ? skills : null
}

function extractBonusSpells(text: string): Array<{ level: number; spellName: string }> | null {
  const match = text.match(/Bonus Spells:\s+(.+?)\.\s+Revelations/i)
  if (!match?.[1]) return null

  const results: Array<{ level: number; spellName: string }> = []
  for (const part of match[1].split(',')) {
    const spellMatch = part.match(/(.+?)\s*\((\d+)(?:st|nd|rd|th)\)/i)
    if (!spellMatch) continue

    const spellName = cleanText(spellMatch[1])
    const level = Number(spellMatch[2])
    if (!spellName || Number.isNaN(level)) continue
    results.push({ level, spellName })
  }

  return results.length > 0 ? results : null
}

function extractRevelations(text: string) {
  const startMatch = text.match(/Revelations\s+An oracle with (?:the .+?|this mystery) can choose from any of the following revelations\.?\s+/i)
  if (!startMatch?.[0]) return null

  const startIndex = text.indexOf(startMatch[0]) + startMatch[0].length
  const endIndex = text.lastIndexOf('Final Revelation')
  if (endIndex <= startIndex) return null

  const block = text.slice(startIndex, endIndex).trim()
  const revelations: Array<{ name: string; levelRequirement?: number; abilityType?: string; description: string }> = []

  const matches = block.matchAll(/([^:(]+?)\s*\((su|sp|ex)\)\s*:?\s*(.+?)(?=(?:\s+[A-Z][A-Za-z'’ -]+?\s*\((?:su|sp|ex)\)\s*:?)|\s+Final Revelation|$)/gi)
  for (const match of matches) {
    const name = cleanText(match[1])
    const description = cleanMysteryBlock(match[3])
    if (!name || !description) continue

    revelations.push({
      name,
      levelRequirement: inferRevelationLevel(description),
      abilityType: normalizeAbilityType(match[2]),
      description,
    })
  }

  return revelations.length > 0 ? revelations : null
}

function extractFinalRevelation(text: string): string | null {
  const marker = 'Final Revelation'
  const index = text.lastIndexOf(marker)
  if (index < 0) return null

  const tail = text.slice(index + marker.length)
  const match = tail.match(/(.+?)(?:\s+Section 15|\s+Latest Pathfinder products|$)/i)
  const cleaned = cleanMysteryBlock(match?.[1] ?? null)
  return cleaned === '.' ? null : cleaned
}

function inferRevelationLevel(description: string): number | undefined {
  const explicitRequirement = description.match(/You must be at least (\d+)(?:st|nd|rd|th) level to select this revelation/i)
  if (explicitRequirement?.[1]) return Number(explicitRequirement[1])

  const startsAt = description.match(/\bAt (\d+)(?:st|nd|rd|th) level\b/i)
  return startsAt?.[1] ? Number(startsAt[1]) : undefined
}

function normalizeAbilityType(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower === 'su') return 'supernatural'
  if (lower === 'sp') return 'spell-like'
  if (lower === 'ex') return 'extraordinary'
  return lower
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cleanMysteryBlock(value: string | null | undefined): string | null {
  const cleaned = cleanText(value)
  if (!cleaned) return null

  return cleaned
    .replace(/^Contents(?:[A-Z][A-Za-z'’ -]+|\([^)]*\))*(?:\s+Final Revelation)?\s*/i, '')
    .replace(/\s+Contents(?:[A-Z][A-Za-z'’ -]+|\([^)]*\))*(?:\s+Final Revelation)?$/i, '')
    .trim() || null
}
