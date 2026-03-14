// ---------------------------------------------------------------------------
// Pathfinder 1e – preset conditions / spells for the Active Effects panel
// ---------------------------------------------------------------------------

import type { EffectModifier, EffectType } from '@/types'

export interface EffectPreset {
  name:            string
  type:            EffectType
  description:     string
  modifiers:       EffectModifier[]
  defaultDuration?: string
  color:           'green' | 'red' | 'yellow' | 'blue' | 'purple'
}

export const EFFECT_PRESETS: EffectPreset[] = [
  // ── Buffs ────────────────────────────────────────────────────────────────
  {
    name:            'Bless',
    type:            'buff',
    description:     '+1 morale to attack rolls. (+1 vs fear saves — apply manually)',
    defaultDuration: '1 min/level',
    color:           'green',
    modifiers: [
      { target: 'all_attacks', value: 1, bonusType: 'morale' },
    ],
  },
  {
    name:            'Haste',
    type:            'buff',
    description:     '+1 attack, +1 dodge AC/touch, +1 Reflex, +30 ft speed. (Extra attack at full BAB — track manually)',
    defaultDuration: '1 round/level',
    color:           'green',
    modifiers: [
      { target: 'all_attacks', value: 1,  bonusType: 'dodge' },
      { target: 'ac_total',    value: 1,  bonusType: 'dodge' },
      { target: 'ac_touch',    value: 1,  bonusType: 'dodge' },
      { target: 'ref',         value: 1,  bonusType: 'dodge' },
      { target: 'speed',       value: 30 },
    ],
  },
  {
    name:            'Rage',
    type:            'buff',
    description:     '+4 STR/CON (→ +2 melee att/CMB), +2 Will (morale), −2 AC, +2 Fort from CON',
    defaultDuration: 'Until rage ends',
    color:           'purple',
    modifiers: [
      { target: 'melee_attack', value: 2,  bonusType: 'morale' },
      { target: 'cmb',          value: 2,  bonusType: 'morale' },
      { target: 'will',         value: 2,  bonusType: 'morale' },
      { target: 'fort',         value: 2,  bonusType: 'morale' },
      { target: 'all_ac',       value: -2 },
    ],
  },
  {
    name:            'Inspire Courage',
    type:            'buff',
    description:     '+1 morale to attack and damage rolls',
    defaultDuration: 'While performing',
    color:           'green',
    modifiers: [
      { target: 'all_attacks', value: 1, bonusType: 'morale' },
    ],
  },
  {
    name:            'Aid',
    type:            'buff',
    description:     '+1 morale to attack rolls, +1 morale to saves vs fear',
    defaultDuration: '1 min/level',
    color:           'green',
    modifiers: [
      { target: 'all_attacks', value: 1, bonusType: 'morale' },
    ],
  },
  {
    name:            'Shield of Faith',
    type:            'buff',
    description:     '+2 deflection bonus to AC (scales: +3 at CL8, +4 at CL12, +5 at CL16)',
    defaultDuration: '1 min/level',
    color:           'blue',
    modifiers: [
      { target: 'all_ac', value: 2, bonusType: 'deflection' },
    ],
  },
  {
    name:            'Enlarge Person',
    type:            'buff',
    description:     '+2 STR/−2 DEX: net 0 melee att, −1 init, −2 AC (DEX+size), +1 CMB/CMD',
    defaultDuration: '1 min/level',
    color:           'blue',
    modifiers: [
      { target: 'ac_total',    value: -2, bonusType: 'size' },
      { target: 'ac_touch',    value: -2, bonusType: 'size' },
      { target: 'ac_flat',     value: -1, bonusType: 'size' },
      { target: 'initiative',  value: -1 },
      { target: 'cmb',         value: 1,  bonusType: 'size' },
      { target: 'cmd',         value: 1,  bonusType: 'size' },
    ],
  },
  {
    name:            'Reduce Person',
    type:            'buff',
    description:     '−2 STR/+2 DEX: net 0 melee att, +1 init, +2 AC (DEX+size), −1 CMB/CMD',
    defaultDuration: '1 min/level',
    color:           'blue',
    modifiers: [
      { target: 'ac_total',    value: 2, bonusType: 'size' },
      { target: 'ac_touch',    value: 2, bonusType: 'size' },
      { target: 'ac_flat',     value: 1, bonusType: 'size' },
      { target: 'initiative',  value: 1 },
      { target: 'cmb',         value: -1, bonusType: 'size' },
      { target: 'cmd',         value: -1, bonusType: 'size' },
    ],
  },
  {
    name:            'Flanking',
    type:            'buff',
    description:     '+2 circumstance bonus to attack rolls',
    defaultDuration: 'While flanking',
    color:           'green',
    modifiers: [
      { target: 'all_attacks', value: 2, bonusType: 'circumstance' },
    ],
  },
  {
    name:            'Prayer',
    type:            'buff',
    description:     '+1 luck to attack, saves, skills and ability checks',
    defaultDuration: '1 round/level',
    color:           'green',
    modifiers: [
      { target: 'all_attacks', value: 1, bonusType: 'luck' },
      { target: 'all_saves',   value: 1, bonusType: 'luck' },
    ],
  },

  // ── Debuffs / Conditions ─────────────────────────────────────────────────
  {
    name:        'Shaken',
    type:        'condition',
    description: '−2 to attack rolls, saving throws, skill checks, and ability checks',
    color:       'red',
    modifiers: [
      { target: 'all_attacks', value: -2 },
      { target: 'all_saves',   value: -2 },
    ],
  },
  {
    name:        'Sickened',
    type:        'condition',
    description: '−2 to attack, damage, saves, and skill checks',
    color:       'red',
    modifiers: [
      { target: 'all_attacks', value: -2 },
      { target: 'all_saves',   value: -2 },
    ],
  },
  {
    name:        'Fatigued',
    type:        'condition',
    description: '−2 STR/DEX (→ −1 melee att, −1 AC, −1 init). Cannot run or charge.',
    color:       'yellow',
    modifiers: [
      { target: 'melee_attack', value: -1 },
      { target: 'cmb',          value: -1 },
      { target: 'ac_total',     value: -1 },
      { target: 'ac_touch',     value: -1 },
      { target: 'initiative',   value: -1 },
    ],
  },
  {
    name:        'Exhausted',
    type:        'condition',
    description: '−6 STR/DEX (→ −3 melee att, −3 AC, −3 init). Speed halved.',
    color:       'red',
    modifiers: [
      { target: 'melee_attack', value: -3 },
      { target: 'cmb',          value: -3 },
      { target: 'ac_total',     value: -3 },
      { target: 'ac_touch',     value: -3 },
      { target: 'initiative',   value: -3 },
    ],
  },
  {
    name:        'Prone',
    type:        'condition',
    description: '−4 melee attack, −4 AC vs melee (simplified: −4 AC). +4 AC vs ranged (apply separately).',
    color:       'red',
    modifiers: [
      { target: 'melee_attack', value: -4 },
      { target: 'cmb',          value: -4 },
      { target: 'all_ac',       value: -4 },
    ],
  },
  {
    name:        'Frightened',
    type:        'condition',
    description: '−2 to attack rolls, saves, skill and ability checks. Must flee.',
    color:       'red',
    modifiers: [
      { target: 'all_attacks', value: -2 },
      { target: 'all_saves',   value: -2 },
    ],
  },
  {
    name:        'Staggered',
    type:        'condition',
    description: 'Only a move or standard action each turn. No effect on attack/AC stats.',
    color:       'yellow',
    modifiers:   [],
  },
  {
    name:        'Confused',
    type:        'condition',
    description: 'Acts randomly each turn. No direct stat modifier.',
    color:       'yellow',
    modifiers:   [],
  },
  {
    name:        'Entangled',
    type:        'condition',
    description: '−2 attack, −4 Dex (→ −2 ranged att, −2 AC, −2 init).',
    color:       'yellow',
    modifiers: [
      { target: 'all_attacks', value: -2 },
      { target: 'ac_total',    value: -2 },
      { target: 'ac_touch',    value: -2 },
      { target: 'initiative',  value: -2 },
    ],
  },
  {
    name:        'Dazzled',
    type:        'condition',
    description: '−1 to attack rolls and sight-based Perception checks.',
    color:       'yellow',
    modifiers: [
      { target: 'all_attacks', value: -1 },
    ],
  },
  {
    name:        'Prayer (Negative)',
    type:        'debuff',
    description: '−1 luck to attack, saves, skills (enemies of Prayer caster)',
    color:       'red',
    modifiers: [
      { target: 'all_attacks', value: -1, bonusType: 'luck' },
      { target: 'all_saves',   value: -1, bonusType: 'luck' },
    ],
  },
]
