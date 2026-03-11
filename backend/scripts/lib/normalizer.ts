// ---------------------------------------------------------------------------
// normalizer.ts — data-normalization utilities shared by both importers
// ---------------------------------------------------------------------------

// ── Spell level string → JSON map ────────────────────────────────────────────
//
// Input:  "Brd 2, Clr/Oracle 3, Sor/Wiz 2"
// Output: { bard: 2, cleric: 3, oracle: 3, sorcerer: 2, wizard: 2 }

/** Full PF1e class abbreviation → canonical key map. */
const CLASS_MAP: Record<string, string> = {
  adp:  'adept',
  alc:  'alchemist',
  ant:  'antipaladin',
  brd:  'bard',
  clr:  'cleric',
  drd:  'druid',
  inv:  'inquisitor',
  mag:  'magus',
  mesm: 'mesmerist',
  mnk:  'monk',
  occ:  'occultist',
  ora:  'oracle',
  pal:  'paladin',
  psyc: 'psychic',
  rgr:  'ranger',
  rog:  'rogue',
  sha:  'shaman',
  sor:  'sorcerer',
  spi:  'spiritualist',
  sum:  'summoner',
  sum2: 'summoner_unchained',
  wit:  'witch',
  wiz:  'wizard',
}

export function normalizeClassName(raw: string): string {
  const lower = raw.trim().toLowerCase()
  return CLASS_MAP[lower] ?? lower
}

export function parseSpellLevelString(raw: string): Record<string, number> {
  if (!raw) return {}
  const result: Record<string, number> = {}

  // Split by ", " — each segment is like "Sor/Wiz 2" or "Clr 3"
  for (const segment of raw.split(',')) {
    const trimmed = segment.trim()
    // Last token is the level number; everything before is class name(s)
    const match = trimmed.match(/^(.+?)\s+(\d+)\s*$/)
    if (!match) continue
    const [, classRaw, levelStr] = match
    const level = parseInt(levelStr, 10)

    // Handle slash-separated multi-class entries: "Sor/Wiz"
    for (const cls of classRaw.split('/')) {
      const normalized = normalizeClassName(cls)
      result[normalized] = level
    }
  }
  return result
}

// ── School extraction ────────────────────────────────────────────────────────
//
// Input:  "Conjuration (Creation) [acid]"
// Output: { school: "conjuration", subschool: "creation", descriptor: "acid" }

export function parseSchoolString(raw: string): {
  school:     string | null
  subschool:  string | null
  descriptor: string | null
} {
  const schoolMatch     = raw.match(/^([A-Za-z]+)/)
  const subschoolMatch  = raw.match(/\(([^)]+)\)/)
  const descriptorMatch = raw.match(/\[([^\]]+)\]/)

  return {
    school:     schoolMatch     ? schoolMatch[1].trim().toLowerCase()     : null,
    subschool:  subschoolMatch  ? subschoolMatch[1].trim().toLowerCase()  : null,
    descriptor: descriptorMatch ? descriptorMatch[1].trim().toLowerCase() : null,
  }
}

// ── General text helpers ─────────────────────────────────────────────────────

/** Collapse multiple spaces/newlines and trim. */
export function cleanText(s: string | null | undefined): string | null {
  if (!s) return null
  const result = s.replace(/\s+/g, ' ').trim()
  return result || null
}
