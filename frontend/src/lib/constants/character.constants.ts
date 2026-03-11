// ---------------------------------------------------------------------------
// Character creation constants
// ---------------------------------------------------------------------------

import type { Alignment, SizeCategory } from '@/types/character.types'

export const ALIGNMENTS: Alignment[] = [
  'Lawful Good',    'Neutral Good',    'Chaotic Good',
  'Lawful Neutral', 'True Neutral',    'Chaotic Neutral',
  'Lawful Evil',    'Neutral Evil',    'Chaotic Evil',
]

export const SIZE_CATEGORIES: SizeCategory[] = [
  'Fine', 'Diminutive', 'Tiny', 'Small',
  'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal',
]

export const COMMON_RACES: string[] = [
  'Dwarf', 'Elf', 'Gnome', 'Half-Elf',
  'Half-Orc', 'Halfling', 'Human',
]

export const COMMON_CLASSES: string[] = [
  'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Fighter', 'Monk', 'Paladin', 'Ranger',
  'Rogue', 'Sorcerer', 'Witch', 'Wizard',
  'Alchemist', 'Cavalier', 'Gunslinger', 'Inquisitor',
  'Magus', 'Oracle', 'Summoner', 'Witch',
]

/** XP thresholds per level (slow / medium / fast progression) */
export const XP_BY_LEVEL: Record<'slow' | 'medium' | 'fast', number[]> = {
  slow:   [0, 3000,  7500,  14000, 23000, 35000, 53000, 77000, 115000, 160000,
           235000, 330000, 475000, 665000, 955000, 1350000, 1900000, 2700000, 3850000, 5350000],
  medium: [0, 2000,  5000,  9000,  15000, 23000, 35000, 51000, 75000,  105000,
           155000, 220000, 315000, 445000, 635000, 890000, 1300000, 1800000, 2550000, 3600000],
  fast:   [0, 1300,  3300,  6000,  10000, 15000, 23000, 34000, 50000,  71000,
           105000, 145000, 210000, 295000, 425000, 600000, 850000, 1200000, 1700000, 2400000],
}

/** Ability score abbreviations map */
export const ABILITY_ABBR: Record<string, string> = {
  strength:     'STR',
  dexterity:    'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom:       'WIS',
  charisma:     'CHA',
}
