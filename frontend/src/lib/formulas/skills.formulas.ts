// ---------------------------------------------------------------------------
// Skill Formulas
// ---------------------------------------------------------------------------

import type { Skill } from '@/types/skill.types'
import type { Stats } from '@/types/stat.types'
import type { AbilityScoreName } from '@/types/stat.types'
import { PATHFINDER_SKILLS, type SpecializableBase } from '@/lib/constants/skills.constants'
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

// ── Specializable skill helpers ───────────────────────────────────────────────

const SPECIALIZABLE_CONFIG: Record<SpecializableBase, { linkedStat: AbilityScoreName; trainedOnly: boolean }> = {
  Craft:      { linkedStat: 'intelligence', trainedOnly: false },
  Perform:    { linkedStat: 'charisma',     trainedOnly: false },
  Profession: { linkedStat: 'wisdom',       trainedOnly: true  },
}

/**
 * Creates a new custom specialization Skill instance.
 * E.g. createSpecializationSkill('Craft', 'Bows') → Skill { name: 'Craft (Bows)', ... }
 *
 * A stable UUID is used for the id so the skill can be safely persisted and
 * referenced without collisions.
 */
export function createSpecializationSkill(
  base: SpecializableBase,
  specialization: string,
): Skill {
  const { linkedStat, trainedOnly } = SPECIALIZABLE_CONFIG[base]
  const id   = crypto.randomUUID()
  const name = `${base} (${specialization.trim()})`
  return defaultSkill(id, name, linkedStat, trainedOnly)
}

/**
 * Total skill ranks currently invested across all skills.
 * Used to display spent-vs-budget in the Skills tab.
 */
export function totalRanksSpent(skills: Skill[]): number {
  return skills.reduce((sum, s) => sum + s.ranks, 0)
}

/**
 * Approximate total skill rank budget accumulated across all character levels.
 *
 * Assumes the character's INT modifier and FCB choice have been constant
 * throughout their career — this is a good-enough approximation for a budget
 * hint; it is not a hard game-enforced cap.
 *
 * Returns null when ranksPerLevel is unknown (class not in the reference archive).
 */
export function approximateRankBudget(
  level: number,
  ranksPerLevel: number | null,
  intMod: number,
  favoredClassBonus: string,
): number | null {
  if (ranksPerLevel === null) return null
  const perLevel = Math.max(1, ranksPerLevel + intMod)
  const fcbBonus = favoredClassBonus === 'skill_rank' ? level : 0
  return level * perLevel + fcbBonus
}
