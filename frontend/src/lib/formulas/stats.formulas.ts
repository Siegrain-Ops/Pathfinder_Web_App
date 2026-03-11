// ---------------------------------------------------------------------------
// Ability Score Formulas
// ---------------------------------------------------------------------------

import type { AbilityScore, Stats } from '@/types/stat.types'

/**
 * Core Pathfinder modifier formula.
 * modifier = floor((score - 10) / 2)
 */
export function calcModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Recomputes `total` and `modifier` from the bonus layers of a single score.
 */
export function calcAbilityScore(score: AbilityScore): AbilityScore {
  const total = score.base + score.racialBonus + score.itemBonus + score.tempBonus
  return {
    ...score,
    total,
    modifier: calcModifier(total),
  }
}

/**
 * Recomputes all six ability scores in one pass.
 */
export function calcStats(stats: Stats): Stats {
  return {
    strength:     calcAbilityScore(stats.strength),
    dexterity:    calcAbilityScore(stats.dexterity),
    constitution: calcAbilityScore(stats.constitution),
    intelligence: calcAbilityScore(stats.intelligence),
    wisdom:       calcAbilityScore(stats.wisdom),
    charisma:     calcAbilityScore(stats.charisma),
  }
}

/**
 * Returns the modifier for a specific stat, given a computed Stats block.
 */
export function getStatModifier(stats: Stats, stat: keyof Stats): number {
  return stats[stat].modifier
}
