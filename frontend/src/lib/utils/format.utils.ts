// ---------------------------------------------------------------------------
// Display formatting helpers
// ---------------------------------------------------------------------------

/**
 * Formats a signed number for display: +3, -1, +0
 */
export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

/**
 * Formats a weight in pounds, rounding to 1 decimal.
 */
export function formatWeight(lbs: number): string {
  return `${lbs.toFixed(1)} lbs`
}

/**
 * Formats gold pieces to a friendly string, e.g. "12 gp"
 */
export function formatGold(gp: number): string {
  return `${gp} gp`
}

/**
 * Formats a date string to a short locale date.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  })
}

/**
 * Clamps a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Abbreviates an ability score name for display.
 */
export function abbreviateStat(name: string): string {
  const map: Record<string, string> = {
    strength:     'STR',
    dexterity:    'DEX',
    constitution: 'CON',
    intelligence: 'INT',
    wisdom:       'WIS',
    charisma:     'CHA',
  }
  return map[name.toLowerCase()] ?? name.toUpperCase().slice(0, 3)
}
