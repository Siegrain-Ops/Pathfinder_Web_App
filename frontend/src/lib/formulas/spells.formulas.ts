// ---------------------------------------------------------------------------
// Spell Formulas
// ---------------------------------------------------------------------------

import type { SpellSection } from '@/types/spell.types'
import type { Stats } from '@/types/stat.types'

/**
 * Spell DC = 10 + spell level + casting stat modifier
 *
 * Note: DC is per-spell (depends on spell level), so we return a function
 * that takes the spell level and returns the DC.
 */
export function calcSpellDC(
  spellLevel: number,
  castingStatModifier: number,
): number {
  return 10 + spellLevel + castingStatModifier
}

/**
 * Base spell DC (level 0) — used for the section header display.
 */
export function calcBaseSpellDC(section: SpellSection, stats: Stats): number {
  const mod = stats[section.castingStat].modifier
  return 10 + mod
}

/**
 * Concentration bonus = caster level + casting stat modifier
 */
export function calcConcentration(section: SpellSection, stats: Stats): number {
  return section.casterLevel + stats[section.castingStat].modifier
}

/**
 * Recomputes spellDC (base, level 0) and concentrationBonus.
 */
export function calcSpellSection(
  section: SpellSection,
  stats: Stats,
): SpellSection {
  return {
    ...section,
    spellDC:            calcBaseSpellDC(section, stats),
    concentrationBonus: calcConcentration(section, stats),
  }
}
