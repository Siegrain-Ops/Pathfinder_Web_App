import { SectionPanel }       from './SectionPanel'
import { StatInput, ModifierBubble } from './StatInput'
import { useCharacterSheet }  from '../../hooks/useCharacterSheet'
import { ABILITY_ABBR }       from '@/lib/constants'
import type { AbilityScoreName, AbilityScore } from '@/types'

const STAT_ORDER: AbilityScoreName[] = [
  'strength', 'dexterity', 'constitution',
  'intelligence', 'wisdom', 'charisma',
]

export function StatsSection() {
  const { data, update } = useCharacterSheet()
  if (!data) return null

  function updateScore(stat: AbilityScoreName, patch: Partial<AbilityScore>) {
    update({
      stats: {
        ...data!.stats,
        [stat]: { ...data!.stats[stat], ...patch },
      },
    })
  }

  return (
    <SectionPanel title="Ability Scores">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_ORDER.map(stat => {
          const score = data.stats[stat]
          return (
            <div
              key={stat}
              className="flex flex-col items-center gap-2 rounded-lg border border-stone-700
                         bg-stone-900 p-3"
            >
              {/* Abbr */}
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                {ABILITY_ABBR[stat]}
              </span>

              {/* Modifier bubble */}
              <ModifierBubble value={score.modifier} />

              {/* Total */}
              <span className="text-lg font-bold text-stone-100">{score.total}</span>

              {/* Divider */}
              <div className="w-full h-px bg-stone-700" />

              {/* Editable breakdown */}
              <StatInput
                label="Base"
                value={score.base}
                onChange={v => updateScore(stat, { base: v })}
                min={1} max={30}
              />
              <StatInput
                label="Racial"
                value={score.racialBonus}
                onChange={v => updateScore(stat, { racialBonus: v })}
                min={-6} max={10}
              />
              <StatInput
                label="Item"
                value={score.itemBonus}
                onChange={v => updateScore(stat, { itemBonus: v })}
                min={-10} max={20}
              />
              <StatInput
                label="Temp"
                value={score.tempBonus}
                onChange={v => updateScore(stat, { tempBonus: v })}
                min={-10} max={20}
              />
            </div>
          )
        })}
      </div>
    </SectionPanel>
  )
}
