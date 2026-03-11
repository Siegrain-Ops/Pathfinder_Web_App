// ---------------------------------------------------------------------------
// Pathfinder 1e — Complete Skill List
// ---------------------------------------------------------------------------

import type { AbilityScoreName } from '@/types/stat.types'

export interface SkillDefinition {
  id:          string
  name:        string
  linkedStat:  AbilityScoreName
  trainedOnly: boolean
}

export const PATHFINDER_SKILLS: SkillDefinition[] = [
  { id: 'acrobatics',          name: 'Acrobatics',          linkedStat: 'dexterity',     trainedOnly: false },
  { id: 'appraise',            name: 'Appraise',            linkedStat: 'intelligence',  trainedOnly: false },
  { id: 'bluff',               name: 'Bluff',               linkedStat: 'charisma',      trainedOnly: false },
  { id: 'climb',               name: 'Climb',               linkedStat: 'strength',      trainedOnly: false },
  { id: 'craft_alchemy',       name: 'Craft (Alchemy)',     linkedStat: 'intelligence',  trainedOnly: false },
  { id: 'craft_armor',         name: 'Craft (Armor)',       linkedStat: 'intelligence',  trainedOnly: false },
  { id: 'craft_weapons',       name: 'Craft (Weapons)',     linkedStat: 'intelligence',  trainedOnly: false },
  { id: 'diplomacy',           name: 'Diplomacy',           linkedStat: 'charisma',      trainedOnly: false },
  { id: 'disable_device',      name: 'Disable Device',      linkedStat: 'dexterity',     trainedOnly: true  },
  { id: 'disguise',            name: 'Disguise',            linkedStat: 'charisma',      trainedOnly: false },
  { id: 'escape_artist',       name: 'Escape Artist',       linkedStat: 'dexterity',     trainedOnly: false },
  { id: 'fly',                 name: 'Fly',                 linkedStat: 'dexterity',     trainedOnly: false },
  { id: 'handle_animal',       name: 'Handle Animal',       linkedStat: 'charisma',      trainedOnly: true  },
  { id: 'heal',                name: 'Heal',                linkedStat: 'wisdom',        trainedOnly: false },
  { id: 'intimidate',          name: 'Intimidate',          linkedStat: 'charisma',      trainedOnly: false },
  { id: 'knowledge_arcana',    name: 'Knowledge (Arcana)',  linkedStat: 'intelligence',  trainedOnly: true  },
  { id: 'knowledge_dungeon',   name: 'Knowledge (Dungeoneering)', linkedStat: 'intelligence', trainedOnly: true },
  { id: 'knowledge_engineering', name: 'Knowledge (Engineering)', linkedStat: 'intelligence', trainedOnly: true },
  { id: 'knowledge_geography', name: 'Knowledge (Geography)',linkedStat: 'intelligence',  trainedOnly: true  },
  { id: 'knowledge_history',   name: 'Knowledge (History)', linkedStat: 'intelligence',  trainedOnly: true  },
  { id: 'knowledge_local',     name: 'Knowledge (Local)',   linkedStat: 'intelligence',  trainedOnly: true  },
  { id: 'knowledge_nature',    name: 'Knowledge (Nature)',  linkedStat: 'intelligence',  trainedOnly: true  },
  { id: 'knowledge_nobility',  name: 'Knowledge (Nobility)',linkedStat: 'intelligence',  trainedOnly: true  },
  { id: 'knowledge_planes',    name: 'Knowledge (Planes)',  linkedStat: 'intelligence',  trainedOnly: true  },
  { id: 'knowledge_religion',  name: 'Knowledge (Religion)',linkedStat: 'intelligence',  trainedOnly: true  },
  { id: 'linguistics',         name: 'Linguistics',         linkedStat: 'intelligence',  trainedOnly: true  },
  { id: 'perception',          name: 'Perception',          linkedStat: 'wisdom',        trainedOnly: false },
  { id: 'perform_act',         name: 'Perform (Act)',       linkedStat: 'charisma',      trainedOnly: false },
  { id: 'perform_dance',       name: 'Perform (Dance)',     linkedStat: 'charisma',      trainedOnly: false },
  { id: 'perform_sing',        name: 'Perform (Sing)',      linkedStat: 'charisma',      trainedOnly: false },
  { id: 'profession',          name: 'Profession',          linkedStat: 'wisdom',        trainedOnly: true  },
  { id: 'ride',                name: 'Ride',                linkedStat: 'dexterity',     trainedOnly: false },
  { id: 'sense_motive',        name: 'Sense Motive',        linkedStat: 'wisdom',        trainedOnly: false },
  { id: 'sleight_of_hand',     name: 'Sleight of Hand',     linkedStat: 'dexterity',     trainedOnly: true  },
  { id: 'spellcraft',          name: 'Spellcraft',          linkedStat: 'intelligence',  trainedOnly: true  },
  { id: 'stealth',             name: 'Stealth',             linkedStat: 'dexterity',     trainedOnly: false },
  { id: 'survival',            name: 'Survival',            linkedStat: 'wisdom',        trainedOnly: false },
  { id: 'swim',                name: 'Swim',                linkedStat: 'strength',      trainedOnly: false },
  { id: 'use_magic_device',    name: 'Use Magic Device',    linkedStat: 'charisma',      trainedOnly: true  },
]
