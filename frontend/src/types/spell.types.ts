// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

import type { AbilityScoreName } from './stat.types'

export type SpellSchool =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation'
  | 'universal'

export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type SpellComponent = 'V' | 'S' | 'M' | 'F' | 'DF' | 'XP'

export interface Spell {
  id: string
  name: string
  level: SpellLevel
  school: SpellSchool
  castingTime: string
  range: string
  duration: string
  savingThrow: string
  spellResistance: boolean
  components: SpellComponent[]
  description: string
  prepared: number
  /** Times cast today (for prepared casters) */
  cast: number
}

/** How many spells per day at each level — index = spell level */
export type SpellsPerDay = [
  number, number, number, number, number,
  number, number, number, number, number,
]

export interface SpellSection {
  casterLevel: number
  castingStat: AbilityScoreName
  /** Computed: 10 + spellLevel + castingStatModifier */
  spellDC: number
  concentrationBonus: number
  spellsPerDay: SpellsPerDay
  knownSpells: Spell[]
  preparedSpells: Spell[]
}

export const defaultSpellsPerDay = (): SpellsPerDay =>
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

export const defaultSpellSection = (): SpellSection => ({
  casterLevel: 0,
  castingStat: 'intelligence',
  spellDC: 10,
  concentrationBonus: 0,
  spellsPerDay: defaultSpellsPerDay(),
  knownSpells: [],
  preparedSpells: [],
})
