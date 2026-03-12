import { load } from 'cheerio'
import { cleanText } from './normalizer'
import { removeNoise } from './html-utils'

const BASE_URL = 'https://www.d20pfsrd.com'

export interface ParsedBloodlineIndexEntry {
  name: string
  className: 'sorcerer' | 'bloodrager'
  sourceUrl: string
}

export interface ParsedBloodlinePage {
  name: string
  className: 'sorcerer' | 'bloodrager'
  description: string | null
  arcanaText: string | null
  powers: Array<{ level?: number; name: string; abilityType?: string; description: string }> | null
  bonusSpells: Array<{ level: number; spellName: string }> | null
  bonusFeats: string[] | null
  sourceName: string
  sourceUrl: string
}

export function parseSorcererBloodlineListPage(html: string): ParsedBloodlineIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const body = getBody($)
  const paizoHeading = body.find('h2, h3, h4').filter((_, el) => cleanText($(el).text()) === 'Paizo').first()
  if (!paizoHeading.length) return []

  const entries: ParsedBloodlineIndexEntry[] = []
  const seen = new Set<string>()

  let node = paizoHeading.next()
  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())

    if (tag && /^h[2-4]$/.test(tag)) break

    node.find('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      const name = cleanText($(el).text())
      if (!href || !name) return

      const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
      if (!sourceUrl.toLowerCase().includes('/bloodlines/bloodlines-from-paizo/')) return
      if (seen.has(sourceUrl)) return
      seen.add(sourceUrl)

      entries.push({
        name: normalizeBloodlineName(name),
        className: 'sorcerer',
        sourceUrl,
      })
    })

    node = node.next()
  }

  return entries
}

export function parseBloodragerBloodlineListPage(html: string): ParsedBloodlineIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const body = getBody($)
  const entries: ParsedBloodlineIndexEntry[] = []
  const seen = new Set<string>()

  body.find('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const name = cleanText($(el).text())
    if (!href || !name) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!sourceUrl.toLowerCase().includes('/paizo-bloodrager-bloodlines/')) return
    if (!/\/paizo-bloodrager-bloodlines\/[^/]+\/?$/.test(sourceUrl.toLowerCase())) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    entries.push({
      name: normalizeBloodlineName(name),
      className: 'bloodrager',
      sourceUrl,
    })
  })

  return entries
}

export function parseBloodlinePage(
  html: string,
  url: string,
  className: 'sorcerer' | 'bloodrager',
): ParsedBloodlinePage | null {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return null

  const body = getBody($)
  const rawName = cleanText(body.find('h1').first().text())
  if (!rawName || /page not found/i.test(rawName)) return null

  const name = normalizeBloodlineName(rawName)
  const intro = extractIntro(body)
  const description = intro.description
  const arcanaText = extractArcanaText($, body, className)
  const bonusSpells = extractBonusSpells($, body)
  const bonusFeats = extractBonusFeats($, body)
  const powers = className === 'sorcerer'
    ? extractSorcererPowers($, body)
    : extractBloodragerPowers($, body)

  return {
    name,
    className,
    description,
    arcanaText,
    powers,
    bonusSpells,
    bonusFeats,
    sourceName: 'Paizo, Inc.',
    sourceUrl: url,
  }
}

function getBody($: ReturnType<typeof load>) {
  return $('#article-content').first().length
    ? $('#article-content').first()
    : $('main, article, .entry-content, #main, #content').first().length
      ? $('main, article, .entry-content, #main, #content').first()
      : $('body')
}

function normalizeBloodlineName(name: string): string {
  return name
    .replace(/\s*\((?:sorcerer bloodline|bloodline|human|kobold)\)\s*$/i, '')
    .replace(/\s+sorcerer$/i, '')
    .trim()
}

function extractIntro(body: ReturnType<ReturnType<typeof load>>) {
  const heading = body.find('h1').first()
  const parts: string[] = []
  let node = heading.next()

  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())

    if (tag === 'p' && text && isStructuredLabel(text)) break
    if (tag === 'h4') break
    if (tag === 'p' && text) parts.push(text)

    node = node.next()
  }

  return {
    description: parts.length > 0 ? parts.join('\n\n') : null,
  }
}

function isStructuredLabel(text: string): boolean {
  return /^(Class Skill|Bonus Spells|Bonus Feats|Bloodline Arcana|Bloodline Powers)\s*:/i.test(text)
}

function extractParagraphByLabel(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
  label: string,
): string | null {
  let found: string | null = null

  body.find('p').each((_, el) => {
    if (found) return false
    const text = cleanText($(el).text())
    if (!text) return

    const match = text.match(/^([^:]+):\s*(.+)$/)
    if (!match) return
    if (match[1].trim().toLowerCase() !== label.toLowerCase()) return

    found = cleanText(match[2])
    return false
  })

  return found
}

function extractArcanaText(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
  className: 'sorcerer' | 'bloodrager',
): string | null {
  if (className === 'sorcerer') {
    return extractParagraphByLabel($, body, 'Bloodline Arcana')
  }

  const intro = extractParagraphByLabel($, body, 'Bloodline Powers')
  return intro
}

function extractBonusSpells($: ReturnType<typeof load>, body: ReturnType<ReturnType<typeof load>>) {
  const raw = extractParagraphByLabel($, body, 'Bonus Spells')
  if (!raw) return null

  const result: Array<{ level: number; spellName: string }> = []
  for (const match of raw.matchAll(/([^,(]+?)\s*\((\d+)(?:st|nd|rd|th)\)/gi)) {
    const spellName = cleanText(match[1])
    const level = Number(match[2])
    if (!spellName || Number.isNaN(level)) continue
    result.push({ level, spellName })
  }

  return result.length > 0 ? result : null
}

function extractBonusFeats($: ReturnType<typeof load>, body: ReturnType<ReturnType<typeof load>>) {
  const raw = extractParagraphByLabel($, body, 'Bonus Feats')
  if (!raw) return null

  const result = raw
    .replace(/\([^)]*\)/g, match => match.includes('*') ? '' : match)
    .replace(/\[\*\]/g, '')
    .split(',')
    .map(part => cleanText(part))
    .filter((value): value is string => Boolean(value))
    .map(value => value.replace(/\*+/g, '').trim())
    .map(value => value.replace(/\.$/, ''))
    .filter(Boolean)

  return result.length > 0 ? result : null
}

function extractSorcererPowers($: ReturnType<typeof load>, body: ReturnType<ReturnType<typeof load>>) {
  const powers: Array<{ level?: number; name: string; abilityType?: string; description: string }> = []
  const start = body.find('p').filter((_, el) => {
    const text = cleanText($(el).text())
    return Boolean(text && /^Bloodline Powers\s*:/i.test(text))
  }).first()

  let node = start.length ? start.next() : body.find('p').first()
  let current: { level?: number; name: string; abilityType?: string; description: string } | null = null

  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())
    if (!text) {
      node = node.next()
      continue
    }
    if (tag && /^h[2-4]$/.test(tag) && /section 15|discuss!/i.test(text)) break

    const headerMatch = text.match(/^([^:]+?)\s*\((su|sp|ex)\):\s*(.+)$/i)
    if (tag === 'p' && headerMatch) {
      if (current) powers.push(current)
      current = {
        level: inferLevelFromText(headerMatch[3]),
        name: cleanPowerName(headerMatch[1]),
        abilityType: normalizeAbilityType(headerMatch[2]),
        description: headerMatch[3].trim(),
      }
      node = node.next()
      continue
    }

    if (tag === 'p' && current) {
      current.description = `${current.description}\n\n${text}`
    }

    node = node.next()
  }

  if (current) powers.push(current)
  return powers.length > 0 ? powers : null
}

function extractBloodragerPowers($: ReturnType<typeof load>, body: ReturnType<ReturnType<typeof load>>) {
  const powers: Array<{ level?: number; name: string; abilityType?: string; description: string }> = []
  const headings = body.find('h4').toArray()

  for (const headingEl of headings) {
    const heading = $(headingEl)
    const rawHeading = cleanText(heading.text())
    if (!rawHeading || /section 15|discuss!/i.test(rawHeading)) break

    const match = rawHeading.match(/^(.*?)\s*\((su|sp|ex)\)$/i)
    if (!match) continue

    const parts: string[] = []
    let node = heading.next()
    while (node.length) {
      const tag = node.get(0)?.tagName?.toLowerCase()
      const text = cleanText(node.text())
      if (tag === 'h4') break
      if (tag && /^h[2-3]$/.test(tag) && text && /section 15|discuss!/i.test(text)) break
      if (tag === 'p' && text) parts.push(text)
      node = node.next()
    }

    const description = parts.join('\n\n').trim()
    if (!description) continue

    powers.push({
      level: inferLevelFromText(description),
      name: cleanPowerName(match[1]),
      abilityType: normalizeAbilityType(match[2]),
      description,
    })
  }

  return powers.length > 0 ? powers : null
}

function inferLevelFromText(text: string): number | undefined {
  const match = text.match(/\bAt\s+(\d+)(?:st|nd|rd|th)\s+level\b/i)
  return match ? Number(match[1]) : undefined
}

function cleanPowerName(name: string): string {
  return name.replace(/[“”"]/g, '').trim()
}

function normalizeAbilityType(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower === 'su') return 'supernatural'
  if (lower === 'sp') return 'spell-like'
  if (lower === 'ex') return 'extraordinary'
  return lower
}
