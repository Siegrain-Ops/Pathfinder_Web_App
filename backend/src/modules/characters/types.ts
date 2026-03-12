// ---------------------------------------------------------------------------
// Backend character types (mirror of frontend — single source for API layer)
// ---------------------------------------------------------------------------

// ── Primitives ───────────────────────────────────────────────────────────

export type AbilityScoreName =
  | 'strength' | 'dexterity' | 'constitution'
  | 'intelligence' | 'wisdom' | 'charisma'

export type Alignment =
  | 'Lawful Good'    | 'Neutral Good'    | 'Chaotic Good'
  | 'Lawful Neutral' | 'True Neutral'    | 'Chaotic Neutral'
  | 'Lawful Evil'    | 'Neutral Evil'    | 'Chaotic Evil'

export type SizeCategory =
  | 'Fine' | 'Diminutive' | 'Tiny' | 'Small'
  | 'Medium' | 'Large' | 'Huge' | 'Gargantuan' | 'Colossal'

// ── Stats ─────────────────────────────────────────────────────────────────

export interface AbilityScore {
  base: number
  racialBonus: number
  itemBonus: number
  tempBonus: number
  total: number
  modifier: number
}

export type Stats = Record<AbilityScoreName, AbilityScore>

// ── Combat ────────────────────────────────────────────────────────────────

export interface HitPoints   { max: number; current: number; temp: number }
export interface ArmorClass  {
  total: number; touch: number; flatFooted: number
  armorBonus: number; shieldBonus: number; dexBonus: number
  naturalArmor: number; deflectionBonus: number; miscBonus: number
}
export interface Combat {
  hitPoints: HitPoints
  armorClass: ArmorClass
  initiative: number
  initiativeMiscBonus: number
  baseAttackBonus: number
  meleeAttackBonus: number
  rangedAttackBonus: number
  speed: number
  cmb: number
  cmd: number
}

// ── Saving Throws ─────────────────────────────────────────────────────────

export interface SavingThrow {
  base: number; statModifier: number; magicBonus: number
  miscBonus: number; tempBonus: number; total: number
}
export interface SavingThrows {
  fortitude: SavingThrow
  reflex: SavingThrow
  will: SavingThrow
}

// ── Skills ────────────────────────────────────────────────────────────────

export interface Skill {
  id: string; name: string; linkedStat: AbilityScoreName
  isClassSkill: boolean; trainedOnly: boolean
  ranks: number; classBonus: number; racialBonus: number
  itemBonus: number; tempBonus: number; armorPenalty: number; total: number
}

// ── Inventory ─────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string; name: string; category: string
  quantity: number; weight: number; value: number
  equipped: boolean; description: string
}
export interface Currency { platinum: number; gold: number; silver: number; copper: number }
export interface Inventory {
  items: InventoryItem[]; currency: Currency
  maxCarryWeight: number; totalWeight: number
}

// ── Spells ────────────────────────────────────────────────────────────────

export interface Spell {
  id: string; name: string; level: number; school: string
  castingTime: string; range: string; duration: string
  savingThrow: string; spellResistance: boolean
  components: string[]; description: string
  prepared: number; cast: number
}
export interface SpellSection {
  casterLevel: number; castingStat: AbilityScoreName
  spellDC: number; concentrationBonus: number
  spellsPerDay: number[]
  knownSpells: Spell[]; preparedSpells: Spell[]
}

// ── Feats & Abilities ─────────────────────────────────────────────────────

export interface Feat {
  id: string; name: string; type: string
  prerequisites: string; benefit: string
  normal: string; special: string; notes: string
}
export interface SpecialAbility {
  id: string; name: string; type: string
  usesPerDay: number | null; usesRemaining: number | null; description: string
}

// ── Character ─────────────────────────────────────────────────────────────

export interface CharacterData {
  name: string; playerName: string; race: string; className: string
  level: number; alignment: Alignment; background: string; deity: string
  size: SizeCategory; age: number; gender: string
  height: string; weight: string; homeland: string
  stats: Stats; combat: Combat; saves: SavingThrows
  experience: number; nextLevelXp: number
  skills: Skill[]; feats: Feat[]; abilities: SpecialAbility[]
  spells: SpellSection; inventory: Inventory
  languages: string[]; notes: string
}

export interface Character {
  id: string
  data: CharacterData
  referenceRaceId?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateCharacterInput { data: CharacterData }
export interface UpdateCharacterInput { data: Partial<CharacterData> }

export interface CharacterSummary {
  id: string; name: string; race: string; className: string
  level: number; alignment: Alignment; updatedAt: Date
}
