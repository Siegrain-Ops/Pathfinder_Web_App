export interface ReferenceSpell {
  id: string
  name: string
  school: string | null
  subschool: string | null
  descriptor: string | null
  spellLevelJson: Record<string, number>
  castingTime: string | null
  components: string | null
  rangeText: string | null
  targetText: string | null
  areaText: string | null
  effectText: string | null
  durationText: string | null
  savingThrow: string | null
  spellResistance: string | null
  description: string
  sourceName: string | null
  sourceUrl: string | null
  edition: string
  createdAt: string
  updatedAt: string
}

export interface ReferenceRace {
  id: string
  name: string
  raceType: string | null
  category: string | null
  size: string | null
  baseSpeed: number | null
  abilityModifiers: Record<string, number> | null
  languages: string[] | null
  traits: Array<{ name?: string; description?: string; type?: string }> | null
  description: string | null
  sourceName: string | null
  sourceUrl: string | null
  edition: string
  createdAt: string
  updatedAt: string
}

export interface ReferenceClass {
  id: string
  name: string
  category: string | null
  role: string | null
  alignmentText: string | null
  description: string | null
  hitDie: number | null
  skillRanks: number | null
  classSkills: Array<{ name: string; stat?: string }> | null
  weaponArmorProficiency: string | null
  startingWealth: string | null
  babProgression: string | null
  goodSaves: string | null
  spellcastingType: string | null
  castingStat: string | null
  progressionTable: Array<{
    level: number
    baseAttackBonus: number | null
    fortSave: number | null
    refSave: number | null
    willSave: number | null
    special: string[]
    spellsPerDay?: string[]
  }> | null
  classFeatures: Array<{ level?: number; name: string; description: string }> | null
  sourceName: string | null
  sourceUrl: string | null
  edition: string
  createdAt: string
  updatedAt: string
}

export interface ReferenceFeat {
  id: string
  name: string
  featType: string | null
  prerequisites: string | null
  benefit: string | null
  normalText: string | null
  specialText: string | null
  description: string | null
  sourceName: string | null
  sourceUrl: string | null
  edition: string
  createdAt: string
  updatedAt: string
}

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
