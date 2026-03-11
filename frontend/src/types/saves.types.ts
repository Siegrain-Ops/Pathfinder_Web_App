// ---------------------------------------------------------------------------
// Saving Throws
// ---------------------------------------------------------------------------

export interface SavingThrow {
  /** Class-based base save bonus */
  base: number
  /** Linked ability score modifier (CON for Fort, DEX for Ref, WIS for Will) */
  statModifier: number
  magicBonus: number
  miscBonus: number
  tempBonus: number
  /** Computed: base + statModifier + magicBonus + miscBonus + tempBonus */
  total: number
}

export interface SavingThrows {
  fortitude: SavingThrow   // Constitution
  reflex:    SavingThrow   // Dexterity
  will:      SavingThrow   // Wisdom
}

export const defaultSavingThrow = (): SavingThrow => ({
  base: 0,
  statModifier: 0,
  magicBonus: 0,
  miscBonus: 0,
  tempBonus: 0,
  total: 0,
})

export const defaultSavingThrows = (): SavingThrows => ({
  fortitude: defaultSavingThrow(),
  reflex:    defaultSavingThrow(),
  will:      defaultSavingThrow(),
})
