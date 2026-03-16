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

export type WeaponType = 'melee' | 'ranged'

/** A single weapon entry in the offense table. */
export interface WeaponEntry {
  id: string
  name: string
  type: WeaponType
  /** Weapon-specific attack modifier stacked on top of the base melee/ranged bonus. */
  attackBonus: number
  damage: string       // e.g. "1d8+4"
  critRange: string    // e.g. "19–20"
  critMult: string     // e.g. "×2"
  notes?: string
}

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
  /** Free-text damage / crit note, e.g. "1d8+4 / 19–20 ×2" */
  damageNote?: string
  /** Free-text DR / resistances / immunities */
  drNote?: string
  /** Caster level override (defaults to character level if absent) */
  casterLevel?: number
  /** Misc bonus to Concentration checks */
  concentrationMisc?: number
  /** Misc bonus to spell save DC */
  spellDcMisc?: number
  /** Quick notes for spellcasting in combat */
  spellcastingNotes?: string
  /** Weapon list for the offense table */
  weapons?: WeaponEntry[]
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
