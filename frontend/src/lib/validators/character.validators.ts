// ---------------------------------------------------------------------------
// Zod schemas — character creation & editing forms
// ---------------------------------------------------------------------------

import { z } from 'zod'
import { ALIGNMENTS, SIZE_CATEGORIES } from '@/lib/constants'

// ── Ability Score ─────────────────────────────────────────────────────────

export const abilityScoreSchema = z.object({
  base:        z.number().int().min(1).max(30),
  racialBonus: z.number().int().min(-10).max(10),
  itemBonus:   z.number().int().min(-10).max(20),
  tempBonus:   z.number().int().min(-10).max(20),
  total:       z.number().int(),
  modifier:    z.number().int(),
})

export const statsSchema = z.object({
  strength:     abilityScoreSchema,
  dexterity:    abilityScoreSchema,
  constitution: abilityScoreSchema,
  intelligence: abilityScoreSchema,
  wisdom:       abilityScoreSchema,
  charisma:     abilityScoreSchema,
})

// ── Combat ────────────────────────────────────────────────────────────────

export const hitPointsSchema = z.object({
  max:     z.number().int().min(0),
  current: z.number().int(),
  temp:    z.number().int().min(0),
})

export const armorClassSchema = z.object({
  total:           z.number().int(),
  touch:           z.number().int(),
  flatFooted:      z.number().int(),
  armorBonus:      z.number().int(),
  shieldBonus:     z.number().int(),
  dexBonus:        z.number().int(),
  naturalArmor:    z.number().int(),
  deflectionBonus: z.number().int(),
  miscBonus:       z.number().int(),
})

export const combatSchema = z.object({
  hitPoints:          hitPointsSchema,
  armorClass:         armorClassSchema,
  initiative:         z.number().int(),
  initiativeMiscBonus:z.number().int(),
  baseAttackBonus:    z.number().int().min(0),
  meleeAttackBonus:   z.number().int(),
  rangedAttackBonus:  z.number().int(),
  speed:              z.number().int().min(0),
  cmb:                z.number().int(),
  cmd:                z.number().int(),
})

// ── Saving Throws ─────────────────────────────────────────────────────────

export const savingThrowSchema = z.object({
  base:         z.number().int(),
  statModifier: z.number().int(),
  magicBonus:   z.number().int(),
  miscBonus:    z.number().int(),
  tempBonus:    z.number().int(),
  total:        z.number().int(),
})

export const savingThrowsSchema = z.object({
  fortitude: savingThrowSchema,
  reflex:    savingThrowSchema,
  will:      savingThrowSchema,
})

// ── Skill ─────────────────────────────────────────────────────────────────

export const skillSchema = z.object({
  id:          z.string(),
  name:        z.string().min(1),
  linkedStat:  z.enum(['strength','dexterity','constitution','intelligence','wisdom','charisma']),
  isClassSkill:z.boolean(),
  trainedOnly: z.boolean(),
  ranks:       z.number().int().min(0),
  classBonus:  z.number().int(),
  racialBonus: z.number().int(),
  itemBonus:   z.number().int(),
  tempBonus:   z.number().int(),
  armorPenalty:z.number().int(),
  total:       z.number().int(),
})

// ── Inventory ─────────────────────────────────────────────────────────────

const ITEM_CATEGORIES = [
  'weapon','armor','shield','potion','scroll','wand','ring',
  'wondrous','gear','ammunition','tool','trade good','other',
] as const

export const inventoryItemSchema = z.object({
  id:          z.string(),
  name:        z.string().min(1, 'Item name is required'),
  category:    z.enum(ITEM_CATEGORIES),
  quantity:    z.number().int().min(0),
  weight:      z.number().min(0),
  value:       z.number().min(0),
  equipped:    z.boolean(),
  description: z.string(),
})

// ── Character — Identity ──────────────────────────────────────────────────

export const characterIdentitySchema = z.object({
  name:       z.string().min(1, 'Name is required').max(100),
  playerName: z.string().max(100),
  race:       z.string().min(1, 'Race is required').max(50),
  className:  z.string().min(1, 'Class is required').max(50),
  level:      z.number().int().min(1).max(20),
  alignment:  z.enum(ALIGNMENTS as [string, ...string[]]),
  background: z.string().max(100),
  deity:      z.string().max(100),
  size:       z.enum(SIZE_CATEGORIES as [string, ...string[]]),
  age:        z.number().int().min(0),
  gender:     z.string().max(50),
  height:     z.string().max(20),
  weight:     z.string().max(20),
  homeland:   z.string().max(100),
})

export type CharacterIdentityFormValues = z.infer<typeof characterIdentitySchema>
