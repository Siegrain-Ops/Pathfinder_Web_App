import { load } from 'cheerio'
import { cleanText } from './normalizer'
import { removeNoise } from './html-utils'

const BASE_URL = 'https://www.d20pfsrd.com'

export interface ParsedArchetypeIndexEntry {
  name: string
  className: string | null
  sourceUrl: string
}

export interface ParsedArchetypePage {
  name: string
  className: string | null
  description: string | null
  replacedFeatures: Array<{ level?: number; name: string }> | null
  gainedFeatures: Array<{ level?: number; name: string; description: string }> | null
  sourceName: string
  sourceUrl: string
}

export function parseArchetypeListPage(
  html: string,
  className: string | null,
  classSourceUrl: string,
): ParsedArchetypeIndexEntry[] {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return []

  const body = getBody($)
  const entries: ParsedArchetypeIndexEntry[] = []
  const seen = new Set<string>()
  const expectedPaizoPath = buildExpectedPaizoPath(classSourceUrl)

  body.find('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const name = cleanText($(el).text())
    if (!href || !name) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (!isPaizoArchetypeDetailUrl(sourceUrl, expectedPaizoPath)) return
    if (seen.has(sourceUrl)) return
    seen.add(sourceUrl)

    entries.push({
      name,
      className,
      sourceUrl,
    })
  })

  return entries
}

export function parseArchetypePage(html: string, url: string, fallbackClassName?: string | null): ParsedArchetypePage | null {
  const $ = load(html)
  removeNoise($)

  const pageTitle = cleanText($('title').first().text())
  if (pageTitle && /page not found/i.test(pageTitle)) return null

  const body = getBody($)
  const name = normalizeArchetypeName(cleanText(body.find('h1').first().text()))
  if (!name || /page not found/i.test(name)) return null

  const className = inferClassName($, body, url, fallbackClassName ?? null)
  const featureStart = findFeatureStart($, body)
  const description = extractDescription($, body, featureStart)
  const gainedFeatures = extractGainedFeatures($, body, featureStart)
  const replacedFeatures = extractReplacedFeatures(gainedFeatures)

  return {
    name,
    className,
    description,
    replacedFeatures,
    gainedFeatures,
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

function isPaizoArchetypeDetailUrl(url: string, expectedPaizoPath: string | null): boolean {
  if (!expectedPaizoPath) return false

  try {
    const pathname = new URL(url).pathname.toLowerCase()
    const startIndex = pathname.indexOf(expectedPaizoPath)
    if (startIndex < 0) return false

    const remainder = pathname.slice(startIndex + expectedPaizoPath.length)
    return /^[^/]+\/?$/.test(remainder)
  } catch {
    return false
  }
}

function buildExpectedPaizoPath(classSourceUrl: string): string | null {
  const match = classSourceUrl
    .toLowerCase()
    .match(/\/classes\/(?:core|base|hybrid|alternate|unchained|npc|prestige)-classes\/([^/]+)\/?$/i)

  if (!match?.[1]) return null
  return `/archetypes/paizo-${match[1]}-archetypes/`
}

function inferClassName(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
  url: string,
  fallbackClassName: string | null,
): string | null {
  const breadcrumbText = cleanText(body.find('.breadcrumb, .breadcrumbs, #breadcrumbs').first().text())
  if (breadcrumbText) {
    const match = breadcrumbText.match(/>\s*([^>]+)\s*>\s*Archetypes/i)
    if (match?.[1]) return cleanText(match[1]) ?? fallbackClassName
  }

  const urlMatch = url.match(/\/classes\/(?:core|base|hybrid|alternate|unchained|npc|prestige)-classes\/([^/]+)\/archetypes\//i)
  if (urlMatch?.[1]) {
    return titleizeSlug(urlMatch[1])
  }

  return fallbackClassName
}

function titleizeSlug(slug: string): string {
  return slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function findFeatureStart($: ReturnType<typeof load>, body: ReturnType<ReturnType<typeof load>>) {
  const marker = body.find('p').filter((_, el) => {
    const text = cleanText($(el).text())
    return Boolean(text && /has the following class features/i.test(text))
  }).first()

  if (marker.length) return marker

  const firstFeature = body.find('h4').filter((_, el) => {
    const text = cleanText($(el).text())
    return Boolean(text && !isStopHeading(text))
  }).first()

  return firstFeature.length ? firstFeature : null
}

function extractDescription(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
  featureStart: ReturnType<ReturnType<typeof load>> | null,
): string | null {
  const heading = body.find('h1').first()
  if (!heading.length) return null

  const parts: string[] = []
  let node = heading.next()

  while (node.length) {
    if (featureStart?.length && node.is(featureStart)) break

    const tag = node.get(0)?.tagName?.toLowerCase()
    const text = cleanText(node.text())
    if (tag === 'p' && text && !/section 15/i.test(text)) parts.push(text)
    if (tag && /^h[2-4]$/.test(tag) && text && /section 15|discuss!/i.test(text)) break

    node = node.next()
  }

  return parts.length > 0 ? parts.join('\n\n') : null
}

function extractGainedFeatures(
  $: ReturnType<typeof load>,
  body: ReturnType<ReturnType<typeof load>>,
  featureStart: ReturnType<ReturnType<typeof load>> | null,
): Array<{ level?: number; name: string; description: string }> | null {
  const features: Array<{ level?: number; name: string; description: string }> = []
  const headings = body.find('h4').toArray()

  for (const headingEl of headings) {
    const heading = $(headingEl)
    if (featureStart?.length && featureStart.get(0)?.tagName?.toLowerCase() === 'p') {
      const markerIndex = body.children().toArray().findIndex(el => el === featureStart.get(0))
      const headingIndex = body.children().toArray().findIndex(el => el === headingEl)
      if (markerIndex >= 0 && headingIndex >= 0 && headingIndex <= markerIndex) continue
    }

    const rawHeading = cleanText(heading.text())
    if (!rawHeading || isStopHeading(rawHeading)) break

    const descriptionParts: string[] = []
    let node = heading.next()

    while (node.length) {
      const tag = node.get(0)?.tagName?.toLowerCase()
      const text = cleanText(node.text())

      if (tag === 'h4') break
      if (tag && /^h[2-3]$/.test(tag) && text && isStopHeading(text)) break
      if ((tag === 'p' || tag === 'ul' || tag === 'ol') && text) descriptionParts.push(text)

      node = node.next()
    }

    const description = descriptionParts.join('\n\n').trim()
    if (!description) continue

    features.push({
      level: inferLevel(description),
      name: normalizeFeatureName(rawHeading),
      description,
    })
  }

  return features.length > 0 ? features : null
}

function normalizeFeatureName(rawHeading: string): string {
  return rawHeading
    .replace(/\((?:sp|su|ex)\)$/i, '')
    .replace(/\(\s*(?:sp|su|ex)\s*\)$/i, '')
    .trim()
}

function normalizeArchetypeName(rawName: string | null): string | null {
  return rawName?.replace(/\s*\([^)]*archetype[^)]*\)\s*$/i, '').trim() ?? null
}

function inferLevel(description: string): number | undefined {
  const match = description.match(/\b(?:at|when)\s+(\d+)(?:st|nd|rd|th)\s+level\b/i)
  return match ? Number(match[1]) : undefined
}

function extractReplacedFeatures(
  gainedFeatures: Array<{ level?: number; name: string; description: string }> | null,
): Array<{ level?: number; name: string }> | null {
  if (!gainedFeatures?.length) return null

  const replacements = new Map<string, { level?: number; name: string }>()

  for (const feature of gainedFeatures) {
    const matches = feature.description.matchAll(
      /This(?: ability)? (?:replaces|alters)\s+([^.\n]+)\./gi,
    )

    for (const match of matches) {
      const names = splitFeatureNames(match[1])
      for (const name of names) {
        const key = name.toLowerCase()
        if (!replacements.has(key)) {
          replacements.set(key, { level: feature.level, name })
        }
      }
    }
  }

  return replacements.size > 0 ? [...replacements.values()] : null
}

function splitFeatureNames(raw: string): string[] {
  const cleaned = raw
    .replace(/\band\s+(?:replaces|alters)\b/gi, ',')
    .replace(/\b(?:replaces|alters)\b/gi, '')
    .replace(/\bthe standard [^']+'s\b/gi, '')
    .replace(/\bthe\b/gi, '')
    .replace(/[“”"]/g, '')
    .trim()

  return cleaned
    .replace(/\band\b/gi, ',')
    .split(',')
    .map(part => cleanText(part))
    .filter((value): value is string => Boolean(value))
}

function isStopHeading(text: string): boolean {
  return /^(section 15|discuss!|latest pathfinder products|patreon supporters)/i.test(text)
}
