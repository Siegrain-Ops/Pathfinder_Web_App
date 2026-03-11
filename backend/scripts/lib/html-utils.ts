// ---------------------------------------------------------------------------
// html-utils.ts — reusable Cheerio DOM helpers
//
// All functions take a loaded $ instance and a container element so they
// can be composed by any parser without tight coupling.
// ---------------------------------------------------------------------------

import { load, type CheerioAPI } from 'cheerio'

export type $Root = CheerioAPI
export type Container = ReturnType<CheerioAPI>

// ── Noise removal ────────────────────────────────────────────────────────────

/**
 * Strip elements that are never part of the content we want:
 * scripts, styles, nav, footer, ads, breadcrumbs, share buttons.
 */
export function removeNoise($: $Root): void {
  $(
    'script, style, noscript, nav, footer, header, ' +
    '.breadcrumb, .breadcrumbs, #breadcrumbs, ' +
    '.advertisement, .adsbygoogle, [id*="ad-"], [class*="ad-"], ' +
    '.social-share, .share-buttons, ' +
    '#toc, .toc, ' +
    '.copyright, .footer-content'
  ).remove()
}

// ── Field extraction ──────────────────────────────────────────────────────────

/**
 * Find the text value that follows a bold label inside a container.
 *
 * Looks for <b> or <strong> whose text matches `label` (case-insensitive),
 * then returns the remainder of that paragraph's text.
 *
 * Example HTML:  <p><b>Casting Time</b> 1 standard action</p>
 * findField($, content, 'Casting Time') → "1 standard action"
 */
export function findField(
  $:         $Root,
  container: Container,
  label:     string,
): string | null {
  const lower = label.toLowerCase()
  let found: string | null = null

  container.find('p, li, div').each((_, el) => {
    if (found) return false // break
    const boldEls = $(el).find('b, strong')
    boldEls.each((_, b) => {
      const bText = $(b).text().replace(/:$/, '').trim().toLowerCase()
      if (bText === lower) {
        const full   = $(el).text()
        const after  = full.slice(full.toLowerCase().indexOf(bText) + bText.length)
                           .replace(/^[\s:]+/, '')
                           .split(/;/)[0]  // stop at next semicolon-separated field
                           .trim()
        if (after) found = after
        return false // break inner
      }
    })
  })

  return found
}

/**
 * Find ALL field values as a Map<labelLower, value>.
 * Handles the common d20pfsrd.com pattern of bold-label paragraphs.
 * Also splits compound paragraphs like "Saving Throw none; Spell Resistance no".
 */
export function extractFields(
  $:         $Root,
  container: Container,
): Map<string, string> {
  const map = new Map<string, string>()

  container.find('p').each((_, el) => {
    const p        = $(el)
    const boldEls  = p.find('b, strong')
    if (!boldEls.length) return

    if (boldEls.length === 1) {
      const label = boldEls.first().text().replace(/:$/, '').trim().toLowerCase()
      const full  = p.text()
      const after = full
        .slice(full.toLowerCase().indexOf(label) + label.length)
        .replace(/^[\s:]+/, '')
        .trim()
      if (label && after) map.set(label, after)
    } else {
      // Multiple bold labels in one paragraph — split by ";"
      const fullText = p.text()
      boldEls.each((_, b) => {
        const label = $(b).text().replace(/:$/, '').trim().toLowerCase()
        const start = fullText.toLowerCase().indexOf(label) + label.length
        const chunk = fullText.slice(start).replace(/^[\s:]+/, '')
        const value = chunk.split(';')[0].trim()
        if (label && value) map.set(label, value)
      })
    }
  })

  return map
}

// ── Link extraction ───────────────────────────────────────────────────────────

/**
 * Collect all hrefs from <a> tags inside container whose href matches pattern.
 * Relative URLs are resolved against baseUrl.
 * Returns de-duplicated absolute URLs.
 */
export function extractLinks(
  $:         $Root,
  container: Container,
  pattern:   RegExp,
  baseUrl:   string,
): string[] {
  const seen = new Set<string>()

  container.find('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (!pattern.test(href)) return
    const full = href.startsWith('http') ? href : `${baseUrl}${href}`
    seen.add(full)
  })

  return [...seen]
}

// ── Table parsing ─────────────────────────────────────────────────────────────

/**
 * Convert an HTML <table> element to an array of row objects.
 * Uses the first <thead> row as column headers (lowercased, trimmed).
 * Rows from <tbody> become { header: cellText } objects.
 */
export function tableToObjects(
  $:     $Root,
  table: Container,
): Array<Record<string, string>> {
  const headers: string[] = []
  table.find('thead tr th, thead tr td').each((_, el) => {
    headers.push($(el).text().trim().toLowerCase())
  })

  if (!headers.length) {
    // Fallback: treat first <tr> as header
    table.find('tr').first().find('th, td').each((_, el) => {
      headers.push($(el).text().trim().toLowerCase())
    })
  }

  const rows: Array<Record<string, string>> = []
  table.find('tbody tr, tr:not(:first-child)').each((_, tr) => {
    const cells = $(tr).find('td')
    if (!cells.length) return
    const row: Record<string, string> = {}
    cells.each((i, td) => {
      const key = headers[i] ?? `col${i}`
      row[key] = $(td).text().trim()
    })
    rows.push(row)
  })

  return rows
}

// ── Description extraction ────────────────────────────────────────────────────

/**
 * Extract description text: everything that appears after an <hr> element,
 * or after the last known field paragraph if no <hr> is present.
 */
export function extractDescription(
  $:         $Root,
  container: Container,
): string {
  const parts: string[] = []
  let afterHr = false

  container.children().each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase()
    if (tag === 'hr') { afterHr = true; return }
    if (afterHr) {
      const text = $(el).text().trim()
      if (text) parts.push(text)
    }
  })

  return parts.join('\n').replace(/\s+/g, ' ').trim()
}

// ── Re-export load for convenience ───────────────────────────────────────────
export { load }
