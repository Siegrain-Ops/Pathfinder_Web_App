// ---------------------------------------------------------------------------
// Character — Root Entity
// ---------------------------------------------------------------------------

import type { Stats }           from './stat.types'
import type { Combat }          from './combat.types'
import type { SavingThrows }    from './saves.types'
import type { Skill }           from './skill.types'
import type { Inventory }       from './inventory.types'
import type { SpellSection }    from './spell.types'
import type { Feat, SpecialAbility } from './feat.types'
import type { ActiveEffect }         from './effects.types'

export type Alignment =
  | 'Lawful Good'    | 'Neutral Good'    | 'Chaotic Good'
  | 'Lawful Neutral' | 'True Neutral'    | 'Chaotic Neutral'
  | 'Lawful Evil'    | 'Neutral Evil'    | 'Chaotic Evil'

export type SizeCategory =
  | 'Fine' | 'Diminutive' | 'Tiny' | 'Small'
  | 'Medium' | 'Large' | 'Huge' | 'Gargantuan' | 'Colossal'

/**
 * Structured class-option selections (archetype, bloodline, mystery, domains, arcane bond).
 * All fields are optional for backward-compatibility with existing characters.
 */
export interface ClassOptions {
  /** Selected archetype id + name (denormalized for display without extra fetch) */
  archetypeId?:   string | null
  archetypeName?: string | null
  /** Bloodline selection — relevant for Sorcerer, Bloodrager */
  bloodlineId?:   string | null
  bloodlineName?: string | null
  /** Mystery selection — relevant for Oracle */
  mysteryId?:     string | null
  mysteryName?:   string | null
  /** Domain selections — up to 2 for Cleric, 1 for Inquisitor/Druid */
  domainIds?:     string[]
  domainNames?:   string[]
  /**
   * Arcane Bond — relevant for Wizard.
   * A wizard chooses either a bonded item or a familiar at character creation.
   */
  arcaneBondType?:      'bonded_item' | 'familiar' | null
  /** Kind of bonded object chosen (e.g. 'Ring', 'Staff', 'Wand', …). */
  bondedItemKind?:      string | null
  /** Optional player-assigned name for the item (e.g. "Valeron's Staff"). */
  bondedItemName?:      string | null
  /** Freeform notes about the item — appearance, enchantments, history. */
  bondedItemNotes?:     string | null
  /**
   * Daily tracker: whether the wizard has already used the bonded item's
   * once-per-day free spell ability. Reset each in-game day.
   */
  bondedItemUsedToday?: boolean
  /** Familiar — relevant when arcaneBondType === 'familiar'. */
  /** Species/kind of familiar (e.g. 'Cat', 'Raven', 'Owl', …). */
  familiarKind?:        string | null
  /** Player-assigned name for the familiar (e.g. "Mister Whiskers"). */
  familiarName?:        string | null
  /** Freeform notes about the familiar — appearance, personality, history. */
  familiarNotes?:       string | null
  /** Combat stats for the familiar — only relevant when arcaneBondType === 'familiar'. */
  familiarCombat?:      FamiliarCombat
}

/** Familiar status tracker values. */
export type FamiliarStatus = 'active' | 'absent' | 'unconscious' | 'dead'

/**
 * Combat-relevant stats for a wizard's familiar.
 * All fields are manually set — familiar stats depend on species and master
 * level, so we do not calculate them automatically.
 */
export interface FamiliarCombat {
  currentHp:    number
  maxHp:        number
  ac:           number
  touchAc:      number
  flatFootedAc: number
  initiative:   number
  /** Speed in feet */
  speed:        number
  /** Total Perception check bonus */
  perception:   number
  /** Current status of the familiar */
  status:       FamiliarStatus
  /** Quick combat notes */
  notes:        string
}

/**
 * Pathfinder 1e Favored Class Bonus choice.
 * Each time the character gains a level in their favored class they get either
 * +1 maximum HP or +1 skill rank.
 * Stored as optional for backward-compatibility; absent = defaults to 'hp'.
 */
export type FavoredClassBonus = 'hp' | 'skill_rank'

/** Full character sheet data (stored as JSON in the DB). */
export interface AlternativeRacialTrait {
  name: string
  description: string
  replaces?: string[]
}

export interface CharacterData {
  // ── Identity ─────────────────────────────────────────────
  name:        string
  playerName:  string
  race:        string
  className:   string
  level:       number
  alignment:   Alignment
  background:  string
  deity:       string
  size:        SizeCategory
  age:         number
  gender:      string
  height:      string
  weight:      string
  homeland:    string

  // ── Core Mechanics ────────────────────────────────────────
  stats:        Stats
  combat:       Combat
  saves:        SavingThrows

  // ── Proficiencies & Experience ────────────────────────────
  experience:   number
  nextLevelXp:  number

  // ── Skills ───────────────────────────────────────────────
  skills:       Skill[]

  // ── Feats & Abilities ─────────────────────────────────────
  feats:        Feat[]
  abilities:    SpecialAbility[]

  // ── Spells ───────────────────────────────────────────────
  spells:       SpellSection

  // ── Inventory ────────────────────────────────────────────
  inventory:    Inventory

  // ── Miscellaneous ────────────────────────────────────────
  languages:    string[]
  notes:        string
  alternativeRacialTraits?: AlternativeRacialTrait[]

  // ── Progression preference ────────────────────────────────
  /** Favored class bonus chosen at creation; absent on older characters → treat as 'hp'. */
  favoredClassBonus?: FavoredClassBonus

  /** Class-specific option selections (archetype, bloodline, mystery, domains). */
  classOptions?: ClassOptions

  // ── Active Effects (buff/debuff/condition tracking) ───────
  activeEffects?: ActiveEffect[]

  /**
   * Marks a character as needing initial setup (stats, HP, BAB/saves).
   * Set to true when the character is first created; cleared when setup is complete.
   * Absent on existing characters — treated as already set up.
   */
  needsSetup?: boolean

  /**
   * The `nextLevel` value at which HP was last applied via the Level Up workflow.
   * Guards against double-applying the additive HP gain (e.g. after a tab switch that
   * resets local component state). Absent on existing characters → treated as 0.
   */
  lastHpLevelUpApplied?: number
}

/** Full persisted character record (includes DB metadata). */
export interface Character {
  id:        string
  data:      CharacterData
  referenceRaceId?: string | null
  createdAt: string
  updatedAt: string
}

/** Shape used when creating a new character (no id/timestamps). */
export type CreateCharacterInput = {
  data: CharacterData
  referenceRaceId?: string | null
}

/** Shape used for partial updates. */
export type UpdateCharacterInput = {
  data: Partial<CharacterData>
  referenceRaceId?: string | null
}

/** Lightweight card shown on the dashboard. */
export interface CharacterSummary {
  id:        string
  name:      string
  race:      string
  className: string
  level:     number
  alignment: Alignment
  updatedAt: string
}
