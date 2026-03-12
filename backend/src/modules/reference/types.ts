// ---------------------------------------------------------------------------
// Shared types for the reference archive (spells + feats)
// ---------------------------------------------------------------------------

import type { ReferenceSpell as PrismaSpell, ReferenceFeat as PrismaFeat } from '@prisma/client'
import type { ReferenceRace as PrismaRace } from '@prisma/client'
import type { ReferenceClass as PrismaClass } from '@prisma/client'
import type { ReferenceAbility as PrismaAbility, ReferenceTalent as PrismaTalent } from '@prisma/client'

// ── Reference Spell ─────────────────────────────────────────────────────────

/** spellLevelJson cast from Prisma.JsonValue to a usable map. */
export interface ReferenceSpell extends Omit<PrismaSpell, 'spellLevelJson'> {
  spellLevelJson: Record<string, number>
}

export interface SpellSearchParams {
  q?:      string   // name contains (case-insensitive)
  school?: string   // exact school name
  class?:  string   // class key in spellLevelJson, e.g. "wizard"
  level?:  number   // max spell level for that class
  limit?:  number
  offset?: number
}

// ── Reference Feat ──────────────────────────────────────────────────────────

export type ReferenceFeat = PrismaFeat

export type ReferenceRace = PrismaRace
export type ReferenceClass = PrismaClass
export type ReferenceAbility = PrismaAbility
export type ReferenceTalent = PrismaTalent

export interface ReferenceAbilityResult {
  id: string
  name: string
  kind: 'ability' | 'talent'
  abilityType: string | null
  category: string | null
  className: string | null
  sourceParentName: string | null
  sourceOptionName: string | null
  usesPerDay: number | null
  frequencyText: string | null
  levelRequirement: number | null
  description: string | null
  sourceName: string | null
  sourceUrl: string | null
}

export interface RaceSearchParams {
  q?: string
  category?: string
  limit?: number
  offset?: number
}

export interface ClassSearchParams {
  q?: string
  category?: string
  limit?: number
  offset?: number
}

export interface AbilitySearchParams {
  q?: string
  kind?: 'ability' | 'talent'
  className?: string
  category?: string
  limit?: number
  offset?: number
}

export interface FeatSearchParams {
  q?:     string   // name contains
  type?:  string   // exact featType
  limit?: number
  offset?: number
}

// ── Character junction types ─────────────────────────────────────────────────

export interface CharacterSpellRecord {
  id:               string
  characterId:      string
  referenceSpellId: string
  isPrepared:       boolean
  notes:            string | null
  createdAt:        Date
  referenceSpell:   ReferenceSpell
}

export interface CharacterFeatRecord {
  id:             string
  characterId:    string
  referenceFeatId: string
  notes:          string | null
  createdAt:      Date
  referenceFeat:  ReferenceFeat
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function toSpell(row: PrismaSpell): ReferenceSpell {
  return {
    ...row,
    spellLevelJson: row.spellLevelJson as unknown as Record<string, number>,
  }
}
