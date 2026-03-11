// ---------------------------------------------------------------------------
// Combat Formulas
// ---------------------------------------------------------------------------

import type { Combat, ArmorClass } from '@/types/combat.types'
import type { Stats } from '@/types/stat.types'

/**
 * Armor Class breakdown.
 *
 * Total AC      = 10 + armor + shield + DEX + natural + deflection + misc
 * Touch AC      = 10 + DEX + deflection + misc  (no armor/shield/natural)
 * Flat-Footed   = 10 + armor + shield + natural + deflection + misc  (no DEX)
 */
export function calcArmorClass(ac: ArmorClass, stats: Stats): ArmorClass {
  const dex    = stats.dexterity.modifier
  const dexBon = dex  // stored separately so callers can cap it (e.g. max dex)

  const total = 10
    + ac.armorBonus
    + ac.shieldBonus
    + dexBon
    + ac.naturalArmor
    + ac.deflectionBonus
    + ac.miscBonus

  const touch = 10
    + dexBon
    + ac.deflectionBonus
    + ac.miscBonus

  const flatFooted = 10
    + ac.armorBonus
    + ac.shieldBonus
    + ac.naturalArmor
    + ac.deflectionBonus
    + ac.miscBonus

  return { ...ac, dexBonus: dexBon, total, touch, flatFooted }
}

/**
 * Initiative = DEX modifier + misc initiative bonus
 */
export function calcInitiative(stats: Stats, miscBonus: number): number {
  return stats.dexterity.modifier + miscBonus
}

/**
 * Melee attack bonus = BAB + STR modifier
 */
export function calcMeleeAttack(bab: number, stats: Stats): number {
  return bab + stats.strength.modifier
}

/**
 * Ranged attack bonus = BAB + DEX modifier
 */
export function calcRangedAttack(bab: number, stats: Stats): number {
  return bab + stats.dexterity.modifier
}

/**
 * Combat Maneuver Bonus = BAB + STR modifier + size modifier
 * (size modifier defaults 0 for Medium)
 */
export function calcCMB(
  bab: number,
  stats: Stats,
  sizeModifier = 0,
): number {
  return bab + stats.strength.modifier + sizeModifier
}

/**
 * Combat Maneuver Defense = 10 + BAB + STR mod + DEX mod + size mod
 */
export function calcCMD(
  bab: number,
  stats: Stats,
  sizeModifier = 0,
): number {
  return (
    10
    + bab
    + stats.strength.modifier
    + stats.dexterity.modifier
    + sizeModifier
  )
}

/**
 * Recomputes the full Combat block given current stats and manually set fields.
 */
export function calcCombat(combat: Combat, stats: Stats): Combat {
  const armorClass = calcArmorClass(combat.armorClass, stats)
  const initiative = calcInitiative(stats, combat.initiativeMiscBonus)
  const meleeAttackBonus  = calcMeleeAttack(combat.baseAttackBonus, stats)
  const rangedAttackBonus = calcRangedAttack(combat.baseAttackBonus, stats)
  const cmb = calcCMB(combat.baseAttackBonus, stats)
  const cmd = calcCMD(combat.baseAttackBonus, stats)

  return {
    ...combat,
    armorClass,
    initiative,
    meleeAttackBonus,
    rangedAttackBonus,
    cmb,
    cmd,
  }
}
