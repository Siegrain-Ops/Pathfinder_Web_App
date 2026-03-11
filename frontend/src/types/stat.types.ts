// ---------------------------------------------------------------------------
// Ability Scores
// ---------------------------------------------------------------------------

export type AbilityScoreName =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma'

export type AbilityScoreAbbr = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'

/** A single ability score with all bonus layers and derived values. */
export interface AbilityScore {
  base: number
  racialBonus: number
  itemBonus: number
  tempBonus: number
  /** Computed: base + racialBonus + itemBonus + tempBonus */
  total: number
  /** Computed: floor((total - 10) / 2) */
  modifier: number
}

/** The full stats block on a character. */
export type Stats = Record<AbilityScoreName, AbilityScore>

/** Default value for a blank ability score. */
export const defaultAbilityScore = (): AbilityScore => ({
  base: 10,
  racialBonus: 0,
  itemBonus: 0,
  tempBonus: 0,
  total: 10,
  modifier: 0,
})

export const defaultStats = (): Stats => ({
  strength:     defaultAbilityScore(),
  dexterity:    defaultAbilityScore(),
  constitution: defaultAbilityScore(),
  intelligence: defaultAbilityScore(),
  wisdom:       defaultAbilityScore(),
  charisma:     defaultAbilityScore(),
})
