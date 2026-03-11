// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

import type { AbilityScoreName } from './stat.types'

export interface Skill {
  id: string
  name: string
  linkedStat: AbilityScoreName
  /** Whether this is a class skill for the character */
  isClassSkill: boolean
  /** Whether the skill can be used untrained */
  trainedOnly: boolean
  ranks: number
  /** +3 bonus when at least 1 rank and it is a class skill */
  classBonus: number
  racialBonus: number
  itemBonus: number
  tempBonus: number
  /** Negative ACP for armored skills */
  armorPenalty: number
  /** Computed total */
  total: number
}

/** Subset of a skill that can be edited by the user */
export type SkillInput = Pick<
  Skill,
  'ranks' | 'racialBonus' | 'itemBonus' | 'tempBonus'
>

export const defaultSkill = (
  id: string,
  name: string,
  linkedStat: AbilityScoreName,
  trainedOnly = false,
): Skill => ({
  id,
  name,
  linkedStat,
  isClassSkill: false,
  trainedOnly,
  ranks: 0,
  classBonus: 0,
  racialBonus: 0,
  itemBonus: 0,
  tempBonus: 0,
  armorPenalty: 0,
  total: 0,
})
