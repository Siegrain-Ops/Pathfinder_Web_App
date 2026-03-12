import { load } from 'cheerio'
import { cleanText } from './normalizer'
import { removeNoise } from './html-utils'

const BASE_URL = 'https://www.d20pfsrd.com'
const DISCOVERIES_BASE_PATH = '/classes/base-classes/alchemist/discoveries/paizo-alchemist-discoveries/'
const ARCANE_DISCOVERIES_BASE_PATH = '/classes/core-classes/wizard/arcane-discoveries/arcane-discoveries-paizo/'

export interface ParsedDiscoveryIndexEntry {
  name: string
  className: string
  sourceUrl: string
}

export interface ParsedDiscoveryPage {
  name: string
  className: string
  prerequisites: string | null
  abilityType: string | null
  description: string | null
  sourceName: string
  sourceUrl: string
}

export function parseDiscoveryListPage(html: string): ParsedDiscoveryIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedDiscoveryIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const name = normalizeDiscoveryName(cleanText($(el).text()))
    if (!href || !name) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isPaizoDiscoveryDetailUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    entries.push({ name, className: 'alchemist', sourceUrl })
  })

  return entries
}

export function parseArcaneDiscoveryListPage(html: string): ParsedDiscoveryIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const entries: ParsedDiscoveryIndexEntry[] = []
  const seen = new Set<string>()

  $('#article-content a[href], main a[href], article a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const name = normalizeDiscoveryName(cleanText($(el).text()))
    if (!href || !name) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isArcaneDiscoveryDetailUrl(sourceUrl)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    entries.push({ name, className: 'wizard', sourceUrl })
  })

  return entries
}

export function parseDiscoveryPage(
  html: string,
  url: string,
  fallback?: Pick<ParsedDiscoveryIndexEntry, 'className'>,
): ParsedDiscoveryPage | null {
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
  const name = normalizeDiscoveryName(titleMatch?.[1] ?? rawTitle)
  const abilityType = normalizeAbilityType(titleMatch?.[2] ?? null)

  const prerequisites = extractField(text, 'Prerequisite') ?? extractField(text, 'Prerequisites')
  const description = extractDescription(text)

  return {
    name,
    className: fallback?.className ?? inferClassNameFromUrl(url),
    prerequisites,
    abilityType,
    description,
    sourceName: 'Paizo, Inc.',
    sourceUrl: url,
  }
}

function isArcaneDiscoveryDetailUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(ARCANE_DISCOVERIES_BASE_PATH)) return false
    const remainder = pathname.slice(pathname.indexOf(ARCANE_DISCOVERIES_BASE_PATH) + ARCANE_DISCOVERIES_BASE_PATH.length)
    if (!remainder || remainder.startsWith('#')) return false
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function isPaizoDiscoveryDetailUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (!pathname.includes(DISCOVERIES_BASE_PATH)) return false
    if (pathname.includes('/paizo---alchemist-discoveries/')) return false
    const remainder = pathname.slice(pathname.indexOf(DISCOVERIES_BASE_PATH) + DISCOVERIES_BASE_PATH.length)
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function normalizeDiscoveryName(name: string | null): string | null {
  if (!name) return null
  return name
    .replace(/\s*\((?:su|sp|ex)\)\s*$/i, '')
    .trim() || null
}

function normalizeAbilityType(raw: string | null): string | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower === 'su') return 'supernatural'
  if (lower === 'sp') return 'spell-like'
  if (lower === 'ex') return 'extraordinary'
  return lower
}

function inferClassNameFromUrl(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('/wizard/arcane-discoveries/')) return 'wizard'
  return 'alchemist'
}

function extractField(text: string, label: string): string | null {
  const regex = new RegExp(`${label}:\\s*(.+?)(?=\\s+(?:Prerequisite|Prerequisites|Benefit|Section 15):|$)`, 'i')
  const match = text.match(regex)
  return cleanText(match?.[1] ?? null)
}

function extractDescription(text: string): string | null {
  const benefit = extractField(text, 'Benefit')
  if (benefit) return benefit

  const match = text.match(/^[^>]*?\)\s*(.+?)(?:\s+Section 15:|$)/i)
  return cleanText(match?.[1] ?? null)
}
