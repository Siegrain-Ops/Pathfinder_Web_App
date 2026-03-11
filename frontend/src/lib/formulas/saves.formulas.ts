// ---------------------------------------------------------------------------
// Saving Throw Formulas
// ---------------------------------------------------------------------------

import type { SavingThrow, SavingThrows } from '@/types/saves.types'
import type { Stats } from '@/types/stat.types'

/**
 * total = base + statModifier + magicBonus + miscBonus + tempBonus
 */
export function calcSavingThrow(save: SavingThrow): SavingThrow {
  const total =
    save.base +
    save.statModifier +
    save.magicBonus +
    save.miscBonus +
    save.tempBonus

  return { ...save, total }
}

/**
 * Recomputes all three saves, pulling the relevant stat modifier from Stats.
 *
 *  Fortitude → Constitution
 *  Reflex    → Dexterity
 *  Will      → Wisdom
 */
export function calcSavingThrows(
  saves: SavingThrows,
  stats: Stats,
): SavingThrows {
  return {
    fortitude: calcSavingThrow({
      ...saves.fortitude,
      statModifier: stats.constitution.modifier,
    }),
    reflex: calcSavingThrow({
      ...saves.reflex,
      statModifier: stats.dexterity.modifier,
    }),
    will: calcSavingThrow({
      ...saves.will,
      statModifier: stats.wisdom.modifier,
    }),
  }
}
