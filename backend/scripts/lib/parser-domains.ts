import { load } from 'cheerio'
import { cleanText } from './normalizer'
import { removeNoise } from './html-utils'

const BASE_URL = 'https://www.d20pfsrd.com'
const DOMAINS_BASE_PATH = '/classes/core-classes/cleric/domains/paizo-domains/'

export interface ParsedDomainIndexEntry {
  name: string
  sourceUrl: string
}

export interface ParsedDomainPage {
  name: string
  parentDomainName: string | null
  className: string
  description: string | null
  grantedPowers: Array<{ level?: number; name: string; abilityType?: string; description: string }> | null
  domainSpells: Array<{ level: number; spellName: string }> | null
  sourceName: string
  sourceUrl: string
}

export function parseDomainListPage(html: string): ParsedDomainIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const body = getBody($)
  const entries: ParsedDomainIndexEntry[] = []
  const seen = new Set<string>()

  body.find('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const name = normalizeDomainName(cleanText($(el).text()))
    if (!href || !name) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isPaizoDomainDetailUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    entries.push({ name, sourceUrl })
  })

  return entries
}

export function parseDomainPage(html: string, url: string): ParsedDomainPage | null {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return null

  const body = getBody($)
  const rawName = cleanText(body.find('h1').first().text())
  if (!rawName || /page not found/i.test(rawName)) return null

  const name = normalizeDomainName(rawName)
  const parentDomainName = extractParentDomainName($, body)
  const description = extractDescription($, body)
  const grantedPowers = extractGrantedPowers($, body)
  const domainSpells = extractDomainSpells($, body)

  return {
    name,
    parentDomainName,
    className: 'cleric',
    description,
    grantedPowers,
    domainSpells,
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

function isPaizoDomainDetailUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(DOMAINS_BASE_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(DOMAINS_BASE_PATH) + DOMAINS_BASE_PATH.length)
    return /^[^/]+\/?$/.test(remainder) || /^[^/]+\/[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function normalizeDomainName(name: string | null): string | null {
  if (!name) return null
  return name
    .replace(/\s+domain$/i, '')
    .replace(/\s+subdomain$/i, '')
    .replace(/[.:;,\s]+$/g, '')
    .trim() || null
}

function extractTextByLabel(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
  labels: string[],
): string | null {
  let found: string | null = null

  body.find('p').each((_, el) => {
    if (found) return false
    const text = cleanText($(el).text())
    if (!text) return

    const match = text.match(/^([^:]+):\s*(.+)$/)
    if (!match) return
    const label = match[1].trim().toLowerCase()
    if (!labels.some(candidate => candidate.toLowerCase() === label)) return

    found = cleanText(match[2])
    return false
  })

  return found
}

function extractParentDomainName(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
): string | null {
  const raw = extractTextByLabel($, body, ['Associated Domain', 'Associated Domains'])
  if (!raw) return null

  const first = raw
    .replace(/\band\b/gi, ',')
    .split(',')
    .map(part => normalizeDomainName(cleanText(part)))
    .filter((value): value is string => Boolean(value))[0]

  return first ?? null
}

function extractDescription(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
): string | null {
  const heading = body.find('h1').first()
  const parts: string[] = []
  let node = heading.next()

  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())
    if (!text) {
      node = node.next()
      continue
    }

    if (tag === 'p' && /^(Granted Powers|Associated Domain|Associated Domains|Replacement Power|Replacement Domain Spells|Domain Spells)\s*:?/i.test(text)) break
    if (tag && /^h[2-4]$/.test(tag)) break
    if (tag === 'p') parts.push(text)

    node = node.next()
  }

  return parts.length > 0 ? parts.join('\n\n') : null
}

function extractGrantedPowers(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
): Array<{ level?: number; name: string; abilityType?: string; description: string }> | null {
  const replacementPower = extractReplacementPower($, body)
  if (replacementPower) return [replacementPower]

  const powers: Array<{ level?: number; name: string; abilityType?: string; description: string }> = []

  const grantedLine = body.find('p').filter((_, el) => {
    const text = cleanText($(el).text())
    return Boolean(text && /^Granted Powers\s*:?\s*$/i.test(text))
  }).first()

  let node = grantedLine.length ? grantedLine.next() : body.find('p').first()
  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())
    if (!text) {
      node = node.next()
      continue
    }

    if (tag === 'p' && /^(Domain Spells|Replacement Domain Spells)\s*:/i.test(text)) break
    if (tag && /^h[2-4]$/.test(tag) && /section 15|subdomains/i.test(text)) break

    if (tag === 'p') {
      const match = text.match(/^(?:Granted Powers:\s*)?([^:]+?)\s*\((su|sp|ex)\):\s*(.+)$/i)
      if (match) {
        powers.push({
          level: inferLevel(match[3]),
          name: cleanPowerName(match[1]),
          abilityType: normalizeAbilityType(match[2]),
          description: match[3].trim(),
        })
      }
    }

    node = node.next()
  }

  if (powers.length > 0) return powers
  return extractGrantedPowersFromText(body)
}

function extractReplacementPower(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
): { level?: number; name: string; abilityType?: string; description: string } | null {
  const heading = body.find('p, h2, h3, h4').filter((_, el) => {
    const text = cleanText($(el).text())
    return Boolean(text && /^Replacement Power\s*:?\s*$/i.test(text))
  }).first()

  if (!heading.length) return null

  let node = heading.next()
  while (node.length) {
    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())
    if (!text) {
      node = node.next()
      continue
    }

    const headingMatch = (tag === 'h4' ? text.match(/^(.*?)\s*\((su|sp|ex)\)$/i) : null)
    if (headingMatch) {
      const parts: string[] = []
      let nextNode = node.next()
      while (nextNode.length) {
        const nextTag = nextNode.get(0)?.tagName?.toLowerCase()
        const nextText = cleanText(nextNode.text())
        if (!nextText) {
          nextNode = nextNode.next()
          continue
        }
        if (nextTag === 'h4') break
        if (nextTag === 'p' && /^(Replacement Domain Spells|Domain Spells)\s*:/i.test(nextText)) break
        if (nextTag === 'p') parts.push(nextText)
        nextNode = nextNode.next()
      }

      return {
        level: inferLevel(parts.join(' ')),
        name: cleanPowerName(headingMatch[1]),
        abilityType: normalizeAbilityType(headingMatch[2]),
        description: parts.join('\n\n').trim(),
      }
    }

    const paragraphMatch = tag === 'p'
      ? text.match(/^(?:Replacement Power:\s*)?([^:]+?)\s*\((su|sp|ex)\):\s*(.+)$/i)
      : null

    if (paragraphMatch) {
      return {
        level: inferLevel(paragraphMatch[3]),
        name: cleanPowerName(paragraphMatch[1]),
        abilityType: normalizeAbilityType(paragraphMatch[2]),
        description: paragraphMatch[3].trim(),
      }
    }

    if (tag === 'p' && /^(Replacement Domain Spells|Domain Spells)\s*:/i.test(text)) break
    node = node.next()
  }

  return extractReplacementPowerFromText(body)
}

function extractDomainSpells(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
): Array<{ level: number; spellName: string }> | null {
  const raw = extractTextByLabel($, body, ['Domain Spells', 'Replacement Domain Spells'])
  if (!raw) return null

  const results: Array<{ level: number; spellName: string }> = []
  for (const segment of raw.split(',')) {
    const match = segment.match(/(\d+)(?:st|nd|rd|th)\s*[—-]\s*(.+)$/i)
    if (!match) continue

    const level = Number(match[1])
    const spellName = cleanText(match[2]?.replace(/\*.*$/, ''))
    if (!spellName || Number.isNaN(level)) continue
    results.push({ level, spellName })
  }

  return results.length > 0 ? results : null
}

function inferLevel(text: string): number | undefined {
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

function extractGrantedPowersFromText(
  body: ReturnType<ReturnType<typeof load>>,
): Array<{ level?: number; name: string; abilityType?: string; description: string }> | null {
  const fullText = normalizeBodyText(body.text())
  const match = fullText.match(/Granted Powers\s+(.+?)\s+Domain Spells:/i)
  if (!match?.[1]) return null

  return parsePowerBlock(match[1])
}

function extractReplacementPowerFromText(
  body: ReturnType<ReturnType<typeof load>>,
): { level?: number; name: string; abilityType?: string; description: string } | null {
  const fullText = normalizeBodyText(body.text())
  const match = fullText.match(/Replacement Power:\s*(.+?)\s+Replacement Domain Spells:/i)
  if (!match?.[1]) return null

  return parsePowerBlock(match[1])?.[0] ?? null
}

function parsePowerBlock(
  block: string,
): Array<{ level?: number; name: string; abilityType?: string; description: string }> | null {
  const powers: Array<{ level?: number; name: string; abilityType?: string; description: string }> = []
  const matches = block.matchAll(/([^:]+?)\s*\((su|sp|ex)\):\s*(.+?)(?=(?:\s+[A-Z][A-Za-z' -]+?\s*\((?:su|sp|ex)\):)|$)/gi)

  for (const match of matches) {
    const name = cleanPowerName(match[1])
    const description = cleanText(match[3])
    if (!name || !description) continue

    powers.push({
      level: inferLevel(description),
      name,
      abilityType: normalizeAbilityType(match[2]),
      description,
    })
  }

  return powers.length > 0 ? powers : null
}

function normalizeBodyText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
