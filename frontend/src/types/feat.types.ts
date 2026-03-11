// ---------------------------------------------------------------------------
// Feats & Special Abilities
// ---------------------------------------------------------------------------

export type FeatType =
  | 'combat'
  | 'general'
  | 'metamagic'
  | 'item creation'
  | 'teamwork'
  | 'racial'
  | 'monster'
  | 'mythic'
  | 'other'

export interface Feat {
  id: string
  name: string
  type: FeatType
  prerequisites: string
  benefit: string
  normal: string
  special: string
  notes: string
}

export type AbilityType =
  | 'extraordinary'   // Ex
  | 'spell-like'      // Sp
  | 'supernatural'    // Su
  | 'class feature'
  | 'racial trait'
  | 'other'

export interface SpecialAbility {
  id: string
  name: string
  type: AbilityType
  /** Uses per day; null = unlimited / passive */
  usesPerDay: number | null
  usesRemaining: number | null
  description: string
}

export const defaultFeat = (id: string): Feat => ({
  id,
  name: '',
  type: 'general',
  prerequisites: '',
  benefit: '',
  normal: '',
  special: '',
  notes: '',
})

export const defaultAbility = (id: string): SpecialAbility => ({
  id,
  name: '',
  type: 'class feature',
  usesPerDay: null,
  usesRemaining: null,
  description: '',
})
