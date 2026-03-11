// ---------------------------------------------------------------------------
// Master Character Recompute
//
// Call this whenever ANY input value changes. It runs every formula engine
// in dependency order and returns a fully recomputed CharacterData.
// ---------------------------------------------------------------------------

import type { CharacterData } from '@/types/character.types'
import { calcStats }          from './stats.formulas'
import { calcCombat }         from './combat.formulas'
import { calcSavingThrows }   from './saves.formulas'
import { calcSkills }         from './skills.formulas'
import { calcInventory }      from './inventory.formulas'
import { calcSpellSection }   from './spells.formulas'

/**
 * Recomputes all derived values for a character in dependency order:
 *
 *  1. Stats  (modifiers depend on base scores)
 *  2. Combat (AC / initiative / attacks depend on stats)
 *  3. Saves  (totals depend on stat modifiers)
 *  4. Skills (totals depend on stat modifiers)
 *  5. Inventory (carry weight depends on STR score)
 *  6. Spells (DC / concentration depend on casting stat modifier)
 *
 * Returns a NEW object — the input is never mutated.
 */
export function recomputeCharacter(data: CharacterData): CharacterData {
  // 1 ── Stats
  const stats = calcStats(data.stats)

  // 2 ── Combat
  const combat = calcCombat(data.combat, stats)

  // 3 ── Saving Throws
  const saves = calcSavingThrows(data.saves, stats)

  // 4 ── Skills
  const skills = calcSkills(data.skills, stats)

  // 5 ── Inventory (uses STR total, not modifier)
  const inventory = calcInventory(data.inventory, stats.strength.total)

  // 6 ── Spells
  const spells = calcSpellSection(data.spells, stats)

  return {
    ...data,
    stats,
    combat,
    saves,
    skills,
    inventory,
    spells,
  }
}

/**
 * Convenience: apply a partial update and recompute everything.
 * This is the function store actions should call.
 *
 * @example
 *   updateAndRecompute(data, { stats: { ...data.stats, strength: { ...data.stats.strength, base: 18 } } })
 */
export function updateAndRecompute(
  data: CharacterData,
  patch: Partial<CharacterData>,
): CharacterData {
  return recomputeCharacter({ ...data, ...patch })
}
