// ---------------------------------------------------------------------------
// parser-feats.ts - d20pfsrd.com feat parsers
// ---------------------------------------------------------------------------

import { load } from 'cheerio'
import { cleanText } from './normalizer'
import { extractFields, removeNoise } from './html-utils'

const BASE_URL = 'https://www.d20pfsrd.com'
const STOP_RE = /^\s*(section\s*15\b|open\s*game\s*licen)/i
const FIELD_LABEL_RE = /\b(prerequisites?|prerequisite\(s\)|benefit(?:s)?|normal|special|level increase)\b\s*:?\s*/gi
const LEADING_FIELD_RE = /^(prerequisites?|prerequisite\(s\)|benefit(?:s)?|normal|special|level increase)\b\s*:?\s*(.*)$/i

export interface ParsedFeatIndex {
  name: string
  featType: string | null
  sourceUrl: string
}

export interface ParsedFeat extends ParsedFeatIndex {
  prerequisites: string | null
  benefit: string | null
  normalText: string | null
  specialText: string | null
  description: string | null
}

export function parseFeatListPage(html: string, baseUrl = BASE_URL): ParsedFeatIndex[] {
  const $ = load(html)
  const feats: ParsedFeatIndex[] = []
  const seen = new Set<string>()

  const content = $('#article-content, .article-content').first()
  const container = content.length ? content : $('body')

  container.find('a[href]').each((_, link) => {
    const href = $(link).attr('href') ?? ''
    if (!/^https?:\/\/www\.d20pfsrd\.com\/feats\/[^/]+\/[^/]+\/?$/.test(href) && !/^\/feats\/[^/]+\/[^/]+\/?$/.test(href)) {
      return
    }

    const name = cleanText($(link).text())
    if (!name) return

    const sourceUrl = href.startsWith('http') ? href : `${baseUrl}${href}`
    if (seen.has(sourceUrl)) return

    const categoryHeading = $(link).closest('li').prevAll('h2, h3, h4').first().text()
      || $(link).parents().prevAll('h2, h3, h4').first().text()
    const featType = normalizeHeadingType(cleanText(categoryHeading))

    seen.add(sourceUrl)
    feats.push({ name, featType, sourceUrl })
  })

  if (feats.length > 0) return feats

  $('table').each((_, table) => {
    let tableType: string | null = null
    const prevHeading = $(table).prevAll('h2, h3, h4').first()
    if (prevHeading.length) tableType = cleanText(prevHeading.text())

    const headers: string[] = []
    $(table).find('thead th').each((_, th) => {
      headers.push($(th).text().trim().toLowerCase())
    })

    const typeIndex = headers.indexOf('feat type')

    $(table).find('tbody tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length < 1) return

      const nameCell = $(cells.eq(0))
      const name = cleanText(nameCell.text())
      if (!name) return

      const href = nameCell.find('a[href]').first().attr('href') ?? ''
      const sourceUrl = href
        ? (href.startsWith('http') ? href : `${baseUrl}${href}`)
        : `${baseUrl}/feats/${name.toLowerCase().replace(/\s+/g, '-')}/`

      if (seen.has(sourceUrl)) return
      seen.add(sourceUrl)

      const featType = typeIndex >= 0 ? cleanText(cells.eq(typeIndex).text()) : tableType
      feats.push({ name, featType, sourceUrl })
    })
  })

  return feats
}

export function parseFeatPage(
  html: string,
  url: string,
  fallback?: ParsedFeatIndex,
): ParsedFeat | null {
  const $ = load(html)
  removeNoise($)

  const titleText =
    cleanText($('h1.page-title, h1').first().text()) ??
    fallback?.name ??
    ''
  if (!titleText) return null

  const title = parseFeatTitle(titleText, fallback?.featType)
  const content = $('#article-content, .article-content').first()
  if (!content.length) return null

  const fieldMap = new Map<string, string>()

  for (const [rawLabel, value] of extractFields($, content).entries()) {
    const label = normalizeFieldLabel(rawLabel)
    if (label && value && !fieldMap.has(label)) fieldMap.set(label, value)
  }

  const blocks = collectContentBlocks($, content)
  for (const block of blocks) {
    for (const [label, value] of parseFieldSegments(block)) {
      if (!fieldMap.has(label)) fieldMap.set(label, value)
    }
  }

  const specialText = mergeText([
    fieldMap.get('special') ?? null,
    fieldMap.get('level increase') ? `Level Increase: ${fieldMap.get('level increase')}` : null,
  ])

  const benefit = fieldMap.get('benefit') ?? null
  const normalText = fieldMap.get('normal') ?? null

  if (!benefit && !normalText && !specialText) return null
  if (/feats$/i.test(title.name) && !title.featType) return null

  return {
    name: title.name,
    featType: title.featType,
    prerequisites: fieldMap.get('prerequisites') ?? null,
    benefit,
    normalText,
    specialText,
    description: extractFeatDescription(blocks, title.name),
    sourceUrl: url,
  }
}

function parseFeatTitle(rawTitle: string, fallbackType: string | null | undefined): ParsedFeatIndex {
  const cleanedTitle = cleanText(rawTitle) ?? ''
  const match = cleanedTitle.match(/^(.*?)(?:\s*\(([^)]+)\))?$/)

  const name = cleanText(match?.[1]) ?? cleanedTitle
  const featType = cleanText(match?.[2]) ?? fallbackType ?? null

  return {
    name,
    featType,
    sourceUrl: '',
  }
}

function collectContentBlocks(
  $: ReturnType<typeof load>,
  container: ReturnType<typeof load>,
): string[] {
  const blocks: string[] = []

  container.children().each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase()
    if (!tag) return

    const text = cleanText($(el).text())
    if (!text) return
    if (STOP_RE.test(text)) return false
    if (tag === 'table') return

    blocks.push(text)
  })

  if (blocks.length > 0) return blocks

  container.find('p, li').each((_, el) => {
    const text = cleanText($(el).text())
    if (!text || STOP_RE.test(text)) return
    blocks.push(text)
  })

  return blocks
}

function parseFieldSegments(text: string): Map<string, string> {
  const segments = new Map<string, string>()
  const match = text.match(LEADING_FIELD_RE)
  if (!match) return segments

  const label = normalizeFieldLabel(match[1] ?? '')
  const value = cleanText(match[2])
  if (label && value) segments.set(label, value)

  return segments
}

function normalizeFieldLabel(rawLabel: string): string | null {
  const normalized = rawLabel.toLowerCase().replace(/:$/, '').trim()
  if (/^prerequisite/.test(normalized)) return 'prerequisites'
  if (/^benefit/.test(normalized)) return 'benefit'
  if (normalized === 'normal') return 'normal'
  if (normalized === 'special') return 'special'
  if (normalized === 'level increase') return 'level increase'
  return null
}

function extractFeatDescription(blocks: string[], featName: string): string | null {
  const descriptionParts: string[] = []

  for (const block of blocks) {
    const blockHasField = LEADING_FIELD_RE.test(block)
    if (blockHasField) break

    if (/^source\b/i.test(block)) continue
    if (/^this feat/i.test(block) && descriptionParts.length > 0) continue

    descriptionParts.push(block)
  }

  FIELD_LABEL_RE.lastIndex = 0
  const description = cleanText(descriptionParts.join(' '))
  if (!description) return null

  const escapedName = featName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return cleanText(description.replace(new RegExp(`^${escapedName}\\s+`, 'i'), ''))
}

function mergeText(parts: Array<string | null | undefined>): string | null {
  const values = parts
    .map(value => cleanText(value))
    .filter((value): value is string => Boolean(value))

  if (values.length === 0) return null
  return values.join(' ')
}

function normalizeHeadingType(value: string | null): string | null {
  if (!value) return null

  const normalized = value
    .replace(/^all\s+/i, '')
    .replace(/\s+feats?$/i, '')
    .trim()

  return cleanText(normalized)
}
