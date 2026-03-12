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
