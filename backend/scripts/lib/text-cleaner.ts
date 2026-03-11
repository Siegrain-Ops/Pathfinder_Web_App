// ---------------------------------------------------------------------------
// text-cleaner.ts — unified text-normalization pipeline
//
// Re-exports cleanText from normalizer for backward compat and adds
// extra helpers used by the newer parsers.
// ---------------------------------------------------------------------------

export { cleanText } from './normalizer'

/** Remove all HTML tags, then collapse whitespace. */
export function stripHtml(s: string | null | undefined): string | null {
  if (!s) return null
  const stripped = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return stripped || null
}

/**
 * Parse a numeric value out of a messy string.
 * extractNumber("2d8+4 (13 hp)") → 13
 * extractNumber("CR 5")         → 5
 */
export function extractNumber(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.match(/[\d]+/)
  return m ? parseInt(m[0], 10) : null
}

/**
 * Parse a CR string into a canonical string representation.
 * "CR 1/2" → "1/2",  "CR 5" → "5",  "1/3" → "1/3"
 */
export function parseCr(s: string | null | undefined): string | null {
  if (!s) return null
  const m = s.match(/CR\s*([\d/]+)/i) ?? s.match(/([\d/]+)/)
  return m ? m[1].trim() : null
}

/**
 * Normalise a size category to PF1e canonical form.
 * "med." | "medium" → "Medium"
 */
const SIZE_MAP: Record<string, string> = {
  fine:       'Fine',
  diminutive: 'Diminutive',
  tiny:       'Tiny',
  small:      'Small',
  med:        'Medium',
  medium:     'Medium',
  large:      'Large',
  huge:       'Huge',
  gargantuan: 'Gargantuan',
  colossal:   'Colossal',
}

export function normalizeSize(s: string | null | undefined): string | null {
  if (!s) return null
  return SIZE_MAP[s.trim().toLowerCase().replace(/\.$/, '')] ?? null
}

/** Split a comma-or-semicolon list and return trimmed, non-empty strings. */
export function splitList(s: string | null | undefined): string[] {
  if (!s) return []
  return s.split(/[,;]/).map(p => p.trim()).filter(Boolean)
}

/** Remove common noise strings that appear in d20pfsrd.com page text. */
const NOISE = [
  /This website uses trademarks.*$/is,
  /OPEN GAME LICENSE.*$/is,
  /Advertisement/gi,
  /Pathfinder.*is a registered trademark.*/gi,
]

export function removeBoilerplate(s: string): string {
  let out = s
  for (const re of NOISE) out = out.replace(re, '')
  return out.trim()
}
