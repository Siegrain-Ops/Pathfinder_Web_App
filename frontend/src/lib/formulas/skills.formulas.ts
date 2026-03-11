// ---------------------------------------------------------------------------
// Skill Formulas
// ---------------------------------------------------------------------------

import type { Skill } from '@/types/skill.types'
import type { Stats } from '@/types/stat.types'
import { PATHFINDER_SKILLS } from '@/lib/constants/skills.constants'
import { defaultSkill } from '@/types/skill.types'

/**
 * Class skill bonus: +3 when the skill has at least 1 rank.
 */
export function calcClassBonus(isClassSkill: boolean, ranks: number): number {
  return isClassSkill && ranks >= 1 ? 3 : 0
}

/**
 * Skill total:
 *   total = statModifier + ranks + classBonus + racialBonus + itemBonus + tempBonus + armorPenalty
 *
 * Note: armorPenalty is stored as a negative number (e.g. −2).
 */
export function calcSkillTotal(skill: Skill, stats: Stats): number {
  const statMod    = stats[skill.linkedStat].modifier
  const classBon   = calcClassBonus(skill.isClassSkill, skill.ranks)

  return (
    statMod +
    skill.ranks +
    classBon +
    skill.racialBonus +
    skill.itemBonus +
    skill.tempBonus +
    skill.armorPenalty
  )
}

/**
 * Recomputes a single skill (classBonus + total).
 */
export function calcSkill(skill: Skill, stats: Stats): Skill {
  const classBonus = calcClassBonus(skill.isClassSkill, skill.ranks)
  const total      = calcSkillTotal({ ...skill, classBonus }, stats)
  return { ...skill, classBonus, total }
}

/**
 * Recomputes every skill in the array.
 */
export function calcSkills(skills: Skill[], stats: Stats): Skill[] {
  return skills.map(skill => calcSkill(skill, stats))
}

/**
 * Builds the default full skill list from PATHFINDER_SKILLS.
 * Called when a new character is created — provides all skills at 0 ranks.
 */
export function buildDefaultSkillList(classSkillIds: string[] = []): Skill[] {
  return PATHFINDER_SKILLS.map(def =>
    defaultSkill(def.id, def.name, def.linkedStat, def.trainedOnly)
  ).map(skill => ({
    ...skill,
    isClassSkill: classSkillIds.includes(skill.id),
  }))
}
