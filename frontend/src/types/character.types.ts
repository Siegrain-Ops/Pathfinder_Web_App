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
 * Structured class-option selections (archetype, bloodline, mystery, domains).
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
}

/**
 * Pathfinder 1e Favored Class Bonus choice.
 * Each time the character gains a level in their favored class they get either
 * +1 maximum HP or +1 skill rank.
 * Stored as optional for backward-compatibility; absent = defaults to 'hp'.
 */
export type FavoredClassBonus = 'hp' | 'skill_rank'

/** Full character sheet data (stored as JSON in the DB). */
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

  // ── Progression preference ────────────────────────────────
  /** Favored class bonus chosen at creation; absent on older characters → treat as 'hp'. */
  favoredClassBonus?: FavoredClassBonus

  /** Class-specific option selections (archetype, bloodline, mystery, domains). */
  classOptions?: ClassOptions

  // ── Active Effects (buff/debuff/condition tracking) ───────
  activeEffects?: ActiveEffect[]
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
