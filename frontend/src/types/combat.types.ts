// ---------------------------------------------------------------------------
// Combat Stats
// ---------------------------------------------------------------------------

export interface HitPoints {
  max: number
  current: number
  temp: number
}

export interface ArmorClass {
  total: number
  touch: number
  flatFooted: number
  /** Breakdown components */
  armorBonus: number
  shieldBonus: number
  dexBonus: number
  naturalArmor: number
  deflectionBonus: number
  miscBonus: number
}

/** Base attack bonus by class level — stored as an array (multiple attacks). */
export type BaseAttackBonus = number[]

export interface Combat {
  hitPoints: HitPoints
  armorClass: ArmorClass
  /** Initiative = DEX modifier + miscBonus */
  initiative: number
  initiativeMiscBonus: number
  /** Base attack bonus (primary attack) */
  baseAttackBonus: number
  /** Melee attack = BAB + STR modifier + miscBonus */
  meleeAttackBonus: number
  /** Ranged attack = BAB + DEX modifier + miscBonus */
  rangedAttackBonus: number
  /** Movement speed in feet */
  speed: number
  /** Combat Maneuver Bonus = BAB + STR mod + size mod */
  cmb: number
  /** Combat Maneuver Defense = 10 + BAB + STR mod + DEX mod + size mod */
  cmd: number
}

export const defaultHitPoints = (): HitPoints => ({
  max: 0,
  current: 0,
  temp: 0,
})

export const defaultArmorClass = (): ArmorClass => ({
  total: 10,
  touch: 10,
  flatFooted: 10,
  armorBonus: 0,
  shieldBonus: 0,
  dexBonus: 0,
  naturalArmor: 0,
  deflectionBonus: 0,
  miscBonus: 0,
})

export const defaultCombat = (): Combat => ({
  hitPoints: defaultHitPoints(),
  armorClass: defaultArmorClass(),
  initiative: 0,
  initiativeMiscBonus: 0,
  baseAttackBonus: 0,
  meleeAttackBonus: 0,
  rangedAttackBonus: 0,
  speed: 30,
  cmb: 0,
  cmd: 10,
})
