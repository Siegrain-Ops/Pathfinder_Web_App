// ---------------------------------------------------------------------------
// Character factory utilities
// ---------------------------------------------------------------------------

import type { CharacterData } from '@/types/character.types'
import { defaultStats }        from '@/types/stat.types'
import { defaultCombat }       from '@/types/combat.types'
import { defaultSavingThrows } from '@/types/saves.types'
import { defaultInventory }    from '@/types/inventory.types'
import { defaultSpellSection } from '@/types/spell.types'
import { buildDefaultSkillList } from '@/lib/formulas/skills.formulas'
import { recomputeCharacter }    from '@/lib/formulas/character.formulas'

/** Generates a random UUID using the Web Crypto API (no external deps). */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Returns a blank, fully-initialized CharacterData.
 * All derived values are computed from defaults.
 */
export function createBlankCharacter(): CharacterData {
  const raw: CharacterData = {
    name:       'New Character',
    playerName: '',
    race:       'Human',
    className:  'Fighter',
    level:      1,
    alignment:  'True Neutral',
    background: '',
    deity:      '',
    size:       'Medium',
    age:        20,
    gender:     '',
    height:     '',
    weight:     '',
    homeland:   '',

    stats:   defaultStats(),
    combat:  defaultCombat(),
    saves:   defaultSavingThrows(),
    skills:  buildDefaultSkillList(),
    feats:   [],
    abilities: [],
    spells:  defaultSpellSection(),
    inventory: defaultInventory(),

    experience:  0,
    nextLevelXp: 2000,
    languages:   ['Common'],
    notes:       '',

    favoredClassBonus: 'hp',

    needsSetup: true,
  }

  return recomputeCharacter(raw)
}
