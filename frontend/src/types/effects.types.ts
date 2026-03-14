// ---------------------------------------------------------------------------
// Active Effects — Buff / Debuff / Condition system
// ---------------------------------------------------------------------------

/**
 * Which combat statistic a modifier targets.
 * Composite targets (all_attacks, all_saves, all_ac) fan out to their members
 * when bonuses are calculated.
 */
export type EffectTarget =
  | 'melee_attack'  // melee attack bonus
  | 'ranged_attack' // ranged attack bonus
  | 'all_attacks'   // melee + ranged + cmb
  | 'cmb'
  | 'cmd'
  | 'ac_total'
  | 'ac_touch'
  | 'ac_flat'
  | 'all_ac'        // ac_total + ac_touch + ac_flat
  | 'initiative'
  | 'speed'
  | 'fort'
  | 'ref'
  | 'will'
  | 'all_saves'     // fort + ref + will
  | 'concentration'
  | 'spell_dc'

/** Pathfinder 1e bonus types (stacking rules apply in full PF1e, shown as info). */
export type EffectBonusType =
  | 'morale' | 'luck' | 'dodge' | 'enhancement'
  | 'size' | 'circumstance' | 'insight' | 'sacred'
  | 'profane' | 'alchemical' | 'competence' | 'deflection'

export interface EffectModifier {
  target:    EffectTarget
  value:     number
  bonusType?: EffectBonusType
}

export type EffectType = 'buff' | 'debuff' | 'condition' | 'custom'

export interface ActiveEffect {
  id:        string
  name:      string
  type:      EffectType
  active:    boolean
  duration?: string   // free text: "3 rounds", "1 min/level"
  source?:   string   // "Bard", "Enemy spell", etc.
  notes?:    string
  modifiers: EffectModifier[]
}
