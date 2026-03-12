// ---------------------------------------------------------------------------
// parser-spells.ts - d20pfsrd.com spell page parser
// ---------------------------------------------------------------------------

import { load } from 'cheerio'
import {
  parseSchoolString,
  parseSpellLevelString,
  cleanText,
} from './normalizer'
import { extractFields, removeNoise } from './html-utils'

export interface ParsedSpell {
  name: string
  school: string | null
  subschool: string | null
  descriptor: string | null
  spellLevelJson: Record<string, number>
  castingTime: string | null
  components: string | null
  rangeText: string | null
  targetText: string | null
  areaText: string | null
  effectText: string | null
  durationText: string | null
  savingThrow: string | null
  spellResistance: string | null
  description: string
  sourceUrl: string
}

/**
 * Extract only the prose description from a spell page.
 *
 * Strategy:
 * 1. Walk direct children after the first <hr> until the OGL section.
 * 2. If there is no usable <hr>, fall back to raw text slicing and drop
 *    metadata lines.
 */
function extractSpellDescription(
  $: ReturnType<typeof load>,
  container: ReturnType<typeof load>,
): string {
  const stopRe = /^\s*(section\s*15\b|open\s*game\s*licen)/i
  const metaRe = /^(school|level|casting time|components?|range|effect|target|area|duration|saving throw|spell resistance|source)\b/i

  const parts: string[] = []
  let afterHr = false

  container.children().each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase()
    const text = $(el).text().trim()

    if (tag === 'hr') {
      afterHr = true
      return
    }

    if (!afterHr || !text) return
    if (stopRe.test(text)) return false
    parts.push(text)
  })

  if (parts.length) return cleanText(parts.join(' ')) ?? ''

  const raw = container.text()
  const sec15 = raw.search(/section\s*15\b/i)
  const capped = sec15 > 0 ? raw.slice(0, sec15) : raw

  const descIdx = capped.search(/\bDESCRIPTION\b/)
  const start = descIdx >= 0 ? descIdx + 'DESCRIPTION'.length : 0

  const cleaned = capped
    .slice(start)
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !metaRe.test(line))
    .join(' ')

  return cleanText(cleaned) ?? ''
}

export function parseSpellPage(html: string, url: string): ParsedSpell | null {
  const $ = load(html)
  removeNoise($)

  const name =
    cleanText($('h1.page-title, h1').first().text()) ??
    cleanText($('title').text().replace(/[–—-].*$/, '')) ??
    ''
  if (!name) return null

  const content = $('#article-content, .article-content').first()
  if (!content.length) return null

  const fields = extractFields($, content)
  const schoolRaw = (fields.get('school') ?? content.find('p').first().text())
    .replace(/^school\s*/i, '')
    .split(';')[0]
    .trim()

  const { school, subschool, descriptor } = parseSchoolString(schoolRaw)
  const description = extractSpellDescription($, content)

  return {
    name,
    school,
    subschool,
    descriptor,
    spellLevelJson: parseSpellLevelString(fields.get('level') ?? ''),
    castingTime: cleanText(fields.get('casting time')),
    components: cleanText(fields.get('components')),
    rangeText: cleanText(fields.get('range')),
    targetText: cleanText(fields.get('target') ?? fields.get('targets')),
    areaText: cleanText(fields.get('area')),
    effectText: cleanText(fields.get('effect')),
    durationText: cleanText(fields.get('duration')),
    savingThrow: cleanText(fields.get('saving throw')),
    spellResistance: cleanText(fields.get('spell resistance')),
    description,
    sourceUrl: url,
  }
}

export function parseSpellIndexPage(html: string, baseUrl: string): string[] {
  const $ = load(html)
  const urls: string[] = []

  const content = $('#article-content, .article-content').first()
  const container = content.length ? content : $('body')

  container.find('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (/\/magic\/all-spells\/[a-z]\/[a-z]/.test(href)) {
      const full = href.startsWith('http') ? href : `${baseUrl}${href}`
      urls.push(full)
    }
  })

  return [...new Set(urls)]
}
