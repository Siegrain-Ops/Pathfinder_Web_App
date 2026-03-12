import { load } from 'cheerio'
import { cleanText } from './normalizer'
import { removeNoise } from './html-utils'

const BASE_URL = 'https://www.d20pfsrd.com'
const STRUCTURAL_TRAIT_LABELS = new Set([
  'ability score racial traits',
  'ability score modifiers',
  'type',
  'size',
  'base speed',
  'languages',
])

export interface ParsedRaceIndexEntry {
  name: string
  sourceUrl: string
  category: string | null
}

export interface ParsedRacePage {
  name: string
  raceType: string | null
  size: string | null
  baseSpeed: number | null
  abilityModifiers: Record<string, number> | null
  languages: string[] | null
  description: string | null
  traits: Array<{ name?: string; description?: string; type?: string }> | null
}

export function parseRaceListPage(html: string): ParsedRaceIndexEntry[] {
  const $ = load(html)
  const entries: ParsedRaceIndexEntry[] = []
  const seen = new Set<string>()

  $('table').each((_, table) => {
    const firstHeader = normalizeHeader($(table).find('thead th, thead td').first().text())
    if (!firstHeader.includes('race')) return

    const category =
      inferCategoryFromText(cleanText($(table).prevAll('h2, h3').first().text())) ??
      inferCategoryFromText(cleanText($(table).prevAll('p').first().text()))

    $(table).find('tbody tr').each((_, row) => {
      const firstLink = $(row).find('td').first().find('a[href]').first()
      const href = firstLink.attr('href')
      const name = cleanText(firstLink.text())
      if (!href || !name) return

      const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
      if (seen.has(sourceUrl)) return
      seen.add(sourceUrl)

      entries.push({ name, sourceUrl, category: inferCategoryFromUrl(sourceUrl) ?? category })
    })
  })

  return entries
}

export function parseRacePage(html: string, _url: string): ParsedRacePage | null {
  const $ = load(html)
  removeNoise($)

  const body = $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')

  const name = cleanText(body.find('h1').first().text())
  if (!name) return null

  const standardHeading = findStandardRacialTraitsHeading($, body)
  const standardItems = standardHeading ? extractStandardListItems($, standardHeading) : []

  const raceTypeText = findStandardField(standardItems, 'Type')
  const sizeText = findStandardField(standardItems, 'Size')
  const baseSpeedText = findStandardField(standardItems, 'Base Speed')
  const languagesText = findStandardField(standardItems, 'Languages')
  const abilityText =
    findStandardField(standardItems, 'Ability Score Racial Traits') ??
    findStandardField(standardItems, 'Ability Score Modifiers')

  return {
    name,
    raceType: parseRaceType(raceTypeText),
    size: parseSize(sizeText),
    baseSpeed: parseSpeed(baseSpeedText),
    abilityModifiers: parseAbilityModifiers(abilityText),
    languages: parseLanguages(languagesText),
    description: extractIntroDescription($, body),
    traits: extractRacialTraits($, standardHeading),
  }
}

export function parseAbilityModifiers(raw: string | null): Record<string, number> | null {
  if (!raw) return null
  if (/any|standard|special|see text/i.test(raw)) return null
  const normalizedRaw = raw.replace(/[–—−]/g, '-')

  const result: Record<string, number> = {}
  const statMap: Record<string, string> = {
    str: 'strength',
    strength: 'strength',
    dex: 'dexterity',
    dexterity: 'dexterity',
    con: 'constitution',
    constitution: 'constitution',
    int: 'intelligence',
    intelligence: 'intelligence',
    wis: 'wisdom',
    wisdom: 'wisdom',
    cha: 'charisma',
    charisma: 'charisma',
  }

  const matches = normalizedRaw.matchAll(/([+-]\d+)\s*(str|strength|dex|dexterity|con|constitution|int|intelligence|wis|wisdom|cha|charisma)/gi)
  for (const match of matches) {
    const stat = statMap[match[2].toLowerCase()]
    if (!stat) continue
    result[stat] = Number(match[1])
  }

  return Object.keys(result).length > 0 ? result : null
}

export function parseLanguages(raw: string | null): string[] | null {
  if (!raw) return null

  const withoutIntro = raw
    .replace(/^[A-Za-z-]+\s+begin play speaking\s+/i, '')
    .replace(/^[A-Za-z-]+\s+begin play with\s+/i, '')

  const basePart = withoutIntro
    .split(/those with high|bonus languages|see the /i)[0]
    ?.replace(/\bbegin play speaking\b/gi, '')
    .replace(/\bcan choose from the following\b/gi, '')

  const languages = (basePart ?? raw)
    .replace(/\([^)]*\)/g, '')
    .replace(/\band\b/gi, ',')
    .replace(/[.;:]/g, ',')
    .split(',')
    .map(part => cleanText(part))
    .filter((value): value is string => Boolean(value))
    .filter(value => !/language|scores?|information/i.test(value))

  return languages.length > 0 ? [...new Set(languages)] : null
}

export function parseSpeed(raw: string | null): number | null {
  if (!raw) return null
  const match = raw.match(/base speed of\s+(\d+)\s*feet|(\d+)\s*ft/i)
  return match ? Number(match[1] ?? match[2]) : null
}

function parseRaceType(raw: string | null): string | null {
  if (!raw) return null
  const normalized = raw.toLowerCase().replace(/\bhumanoids\b/g, 'humanoid')
  const match = normalized.match(/\b(aberration|animal|construct|dragon|fey|humanoid|magical beast|monstrous humanoid|ooze|outsider|plant|undead|vermin)\b/i)
  return match ? match[1].toLowerCase() : cleanText(raw)
}

function parseSize(raw: string | null): string | null {
  if (!raw) return null
  const match = raw.match(/\b(fine|diminutive|tiny|small|medium|large|huge|gargantuan|colossal)\b/i)
  if (!match) return null
  const normalized = match[1].toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function inferCategoryFromText(value: string | null): string | null {
  if (!value) return null
  const normalized = value.toLowerCase()
  if (normalized.includes('core')) return 'core'
  if (normalized.includes('featured')) return 'featured'
  if (normalized.includes('uncommon')) return 'uncommon'
  if (normalized.includes('standard')) return 'standard'
  if (normalized.includes('advanced')) return 'advanced'
  if (normalized.includes('monstrous')) return 'monstrous'
  if (normalized.includes('other')) return 'other'
  return normalized.replace(/\braces?\b/g, '').trim() || null
}

function inferCategoryFromUrl(url: string): string | null {
  const lower = url.toLowerCase()
  if (lower.includes('/core-races/')) return 'core'
  if (lower.includes('/featured-races/')) return 'featured'
  if (lower.includes('/uncommon-races/')) return 'uncommon'
  if (lower.includes('/standard-races/')) return 'standard'
  if (lower.includes('/advanced-race-guide-rp/')) return 'advanced'
  if (lower.includes('/other-races/')) return 'other'
  return null
}

function findStandardRacialTraitsHeading($: ReturnType<typeof load>, body: ReturnType<ReturnType<typeof load>>) {
  const heading = body.find('h2, h3, h4').filter((_, el) => {
    const text = cleanText($(el).text())
    return Boolean(text && /standard racial traits/i.test(text))
  }).first()

  return heading.length ? heading : null
}

function extractStandardListItems($: ReturnType<typeof load>, heading: ReturnType<ReturnType<typeof load>>) {
  const nextList = heading.nextAll('ul, ol').first()
  if (!nextList.length) return []

  return nextList.find('li').map((_, li) => {
    const name = cleanText($(li).find('b, strong').first().text()?.replace(/:$/, ''))
    const full = cleanText($(li).text())
    const description = name && full?.toLowerCase().startsWith(name.toLowerCase())
      ? cleanText(full.slice(name.length).replace(/^:\s*/, ''))
      : full

    return { name, description }
  }).get() as Array<{ name: string | null; description: string | null }>
}

function findStandardField(
  items: Array<{ name: string | null; description: string | null }>,
  label: string,
): string | null {
  const item = items.find(entry => normalizeTraitLabel(entry.name) === normalizeTraitLabel(label))
  return item?.description ?? null
}

function normalizeTraitLabel(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z]+/g, ' ').trim()
}

function extractIntroDescription($: ReturnType<typeof load>, body: ReturnType<ReturnType<typeof load>>) {
  const heading = body.find('h1').first()
  if (!heading.length) return null

  const parts: string[] = []
  let node = heading.next()

  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())

    if (tag === 'table') break
    if (tag && /^h[2-4]$/.test(tag) && text && /standard racial traits/i.test(text)) break
    if (tag === 'p' && text && !/^this category includes\b/i.test(text)) parts.push(text)
    if (parts.length >= 2) break

    node = node.next()
  }

  return parts.length > 0 ? parts.join('\n\n') : null
}

function extractRacialTraits($: ReturnType<typeof load>, standardHeading: ReturnType<ReturnType<typeof load>> | null) {
  if (!standardHeading) return null

  const traits: Array<{ name?: string; description?: string; type?: string }> = []
  let sectionType = 'standard'
  let node = standardHeading.next()

  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())

    if (tag && /^h[2-4]$/.test(tag) && text && /alternate racial traits|favored class options|racial archetype|racial feats/i.test(text)) break

    if (tag === 'p' && text && /racial traits$/i.test(text)) {
      sectionType = text.replace(/\s+racial traits$/i, '').trim().toLowerCase() || 'standard'
    } else if ((tag === 'ul' || tag === 'ol')) {
      node.find('li').each((_, li) => {
        const parsed = parseTraitItem($, li)
        if (!parsed) return
        if (parsed.name && STRUCTURAL_TRAIT_LABELS.has(parsed.name.toLowerCase())) return
        traits.push({ ...parsed, type: sectionType })
      })
    }

    node = node.next()
  }

  return traits.length > 0 ? traits : null
}

function parseTraitItem($: ReturnType<typeof load>, li: Parameters<ReturnType<typeof load>['find']>[0]) {
  const text = cleanText($(li).text())
  if (!text) return null

  const bold = cleanText($(li).find('b, strong').first().text()?.replace(/:$/, ''))
  if (!bold) return { description: text }

  const description = cleanText(text.slice(bold.length).replace(/^:\s*/, ''))
  return {
    name: bold,
    description: description ?? text,
  }
}
