// ---------------------------------------------------------------------------
// parser-spells.ts — d20pfsrd.com spell page parser
//
// Expected HTML structure (d20pfsrd.com individual spell page):
//
//   <h1 class="page-title">Acid Arrow</h1>
//   <div id="article-content"> or <div class="article-content">
//     <p><b>School</b> conjuration (creation) [acid]; ...</p>
//     <p><b>Level</b> sor/wiz 2, ...</p>
//     <p><b>Casting Time</b> 1 standard action</p>
//     <p><b>Components</b> V, S, M (dart)</p>
//     <p><b>Range</b> long (400 ft. + 40 ft./level)</p>
//     <p><b>Effect</b> one missile of acid</p>
//     <p><b>Duration</b> 1 round + 1 round per 3 levels</p>
//     <p><b>Saving Throw</b> none; <b>Spell Resistance</b> no</p>
//     <hr/>
//     <p>Full description text ...</p>
//   </div>
//
// If the structure differs, fields will be null and a warning is logged.
// ---------------------------------------------------------------------------

import { load } from 'cheerio'
import {
  parseSchoolString,
  parseSpellLevelString,
  cleanText,
} from './normalizer'
import { removeNoise } from './html-utils'

export interface ParsedSpell {
  name:           string
  school:         string | null
  subschool:      string | null
  descriptor:     string | null
  spellLevelJson: Record<string, number>
  castingTime:    string | null
  components:     string | null
  rangeText:      string | null
  targetText:     string | null
  areaText:       string | null
  effectText:     string | null
  durationText:   string | null
  savingThrow:    string | null
  spellResistance: string | null
  description:    string
  sourceUrl:      string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract label→value pairs from <p><b>Label</b> value</p> paragraphs. */
function extractFields($: ReturnType<typeof load>, container: ReturnType<typeof load>): Map<string, string> {
  const map = new Map<string, string>()

  container.find('p').each((_, el) => {
    const p = $(el)
    const bold = p.find('b, strong').first()
    if (!bold.length) return

    const label = bold.text().replace(/:$/, '').trim().toLowerCase()
    // Value = everything in <p> after the first bold element
    const fullText = p.text()
    const boldText = bold.text()
    const afterBold = fullText.slice(fullText.indexOf(boldText) + boldText.length).trim()

    // Some paragraphs contain multiple bold labels (e.g. "Saving Throw none; Spell Resistance no")
    // Split by "; " and store each sub-field
    if (afterBold.includes('; ') && p.find('b, strong').length > 1) {
      p.find('b, strong').each((i, bEl) => {
        const bLabel = $(bEl).text().replace(/:$/, '').trim().toLowerCase()
        const bText  = $(bEl).text()
        const rest   = p.text().slice(p.text().indexOf(bText) + bText.length).split(';')[0].trim()
        if (bLabel) map.set(bLabel, rest)
      })
    } else {
      if (label) map.set(label, afterBold)
    }
  })

  return map
}

/**
 * Extract only the prose description from a spell page.
 *
 * Strategy:
 * 1. DOM pass — walk direct children of the content div; after the first
 *    <hr>, collect text until a "Section 15" or "Open Game License" line.
 * 2. Text fallback — if no <hr> is a direct child (nested layout), slice
 *    the raw text between a "DESCRIPTION" marker and "Section 15", then
 *    strip any remaining metadata lines (School / Level / etc.).
 */
function extractSpellDescription(
  $:         ReturnType<typeof load>,
  container: ReturnType<typeof load>,
): string {
  const STOP_RE  = /^\s*(section\s*15\b|open\s*game\s*licen)/i
  const META_RE  = /^(school|level|casting time|components?|range|effect|target|area|duration|saving throw|spell resistance|source)\b/i

  // ── Pass 1: DOM walk of direct children ──────────────────────────────────
  const parts: string[] = []
  let afterHr = false

  container.children().each((_, el) => {
    const tag  = (el as { tagName?: string }).tagName?.toLowerCase()
    const text = $(el).text().trim()

    if (tag === 'hr') { afterHr = true; return }
    if (!afterHr || !text) return
    if (STOP_RE.test(text)) return false   // cheerio .each() breaks on false
    parts.push(text)
  })

  if (parts.length) return cleanText(parts.join(' ')) ?? ''

  // ── Pass 2: text-based fallback ──────────────────────────────────────────
  const raw    = container.text()
  const sec15  = raw.search(/section\s*15\b/i)
  const capped = sec15 > 0 ? raw.slice(0, sec15) : raw

  // Try to start after a "DESCRIPTION" heading
  const descIdx = capped.search(/\bDESCRIPTION\b/)
  const start   = descIdx >= 0 ? descIdx + 'DESCRIPTION'.length : 0

  const cleaned = capped
    .slice(start)
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !META_RE.test(l))
    .join(' ')

  return cleanText(cleaned) ?? ''
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseSpellPage(html: string, url: string): ParsedSpell | null {
  const $ = load(html)
  removeNoise($)

  // ── Name ──────────────────────────────────────────────────────────────────
  const name =
    cleanText($('h1.page-title, h1').first().text()) ??
    cleanText($('title').text().replace(/[–—-].*$/, '')) ??
    ''
  if (!name) return null

  // ── Content container ─────────────────────────────────────────────────────
  const content = $('#article-content, .article-content').first()
  if (!content.length) return null

  const fields = extractFields($, content)

  // ── School line ───────────────────────────────────────────────────────────
  // The school line is usually the first <p> or an <h4>/<p> before the fields.
  const schoolRaw = (fields.get('school') ?? content.find('p').first().text())
    .replace(/^school\s*/i, '')
    .split(';')[0]
    .trim()
  const { school, subschool, descriptor } = parseSchoolString(schoolRaw)

  // ── Description ───────────────────────────────────────────────────────────
  const description = extractSpellDescription($, content)

  return {
    name,
    school,
    subschool,
    descriptor,
    spellLevelJson: parseSpellLevelString(fields.get('level') ?? ''),
    castingTime:    cleanText(fields.get('casting time')),
    components:     cleanText(fields.get('components')),
    rangeText:      cleanText(fields.get('range')),
    targetText:     cleanText(fields.get('target') ?? fields.get('targets')),
    areaText:       cleanText(fields.get('area')),
    effectText:     cleanText(fields.get('effect')),
    durationText:   cleanText(fields.get('duration')),
    savingThrow:    cleanText(fields.get('saving throw')),
    spellResistance: cleanText(fields.get('spell resistance')),
    description:    description,
    sourceUrl:      url,
  }
}

// ── Index page parser — extracts spell URLs from alphabetical list pages ────

export function parseSpellIndexPage(html: string, baseUrl: string): string[] {
  const $ = load(html)
  const urls: string[] = []

  // Alphabetical list pages contain links inside the article content.
  // Exclude navigation links by looking only inside the main content div.
  const content = $('#article-content, .article-content').first()
  const container = content.length ? content : $('body')

  container.find('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    // Spell links match the pattern /magic/all-spells/<letter>/<spell-name>/
    if (/\/magic\/all-spells\/[a-z]\/[a-z]/.test(href)) {
      const full = href.startsWith('http') ? href : `${baseUrl}${href}`
      urls.push(full)
    }
  })

  // Deduplicate
  return [...new Set(urls)]
}
