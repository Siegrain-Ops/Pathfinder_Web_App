import { useState }          from 'react'
import { SectionPanel }      from './SectionPanel'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'
import { formatModifier }    from '@/lib/utils/format.utils'
import { ABILITY_ABBR }      from '@/lib/constants'
import type { Skill }        from '@/types'
import { clsx }              from 'clsx'

export function SkillsSection() {
  const { data, update } = useCharacterSheet()
  const [filterText, setFilterText] = useState('')

  if (!data) return null

  function updateSkill(id: string, patch: Partial<Skill>) {
    update({
      skills: data!.skills.map(s => s.id === id ? { ...s, ...patch } : s),
    })
  }

  const filtered = filterText
    ? data.skills.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()))
    : data.skills

  return (
    <SectionPanel
      title="Skills"
      action={
        <input
          className="field w-40 text-xs py-1"
          placeholder="Filter…"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
      }
    >
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700/60 text-[10px] uppercase tracking-[0.12em] text-stone-500">
              <th className="text-left py-2 pr-3 w-6">CS</th>
              <th className="text-left py-2 pr-3">Skill</th>
              <th className="text-center py-2 px-2 w-10">Stat</th>
              <th className="text-center py-2 px-2 w-14">Ranks</th>
              <th className="text-center py-2 px-2 w-10">Bonus</th>
              <th className="text-center py-2 px-2 w-16">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {filtered.map(skill => (
              <tr
                key={skill.id}
                className={clsx(
                  'hover:bg-stone-700/20 transition-colors duration-100',
                  skill.trainedOnly && skill.ranks === 0 && 'opacity-40',
                )}
              >
                {/* Class skill checkbox */}
                <td className="py-1.5 pr-3">
                  <input
                    type="checkbox"
                    checked={skill.isClassSkill}
                    onChange={e => updateSkill(skill.id, { isClassSkill: e.target.checked })}
                    className="accent-amber-500"
                    title="Class Skill"
                  />
                </td>

                {/* Name */}
                <td className="py-1.5 pr-3 text-stone-300">
                  {skill.name}
                  {skill.trainedOnly && (
                    <span className="ml-1 text-[10px] text-stone-600" title="Trained only">★</span>
                  )}
                </td>

                {/* Linked stat */}
                <td className="py-1.5 px-2 text-center text-stone-500 text-xs">
                  {ABILITY_ABBR[skill.linkedStat]}
                </td>

                {/* Ranks input */}
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={skill.ranks}
                    onChange={e => updateSkill(skill.id, { ranks: Number(e.target.value) })}
                    className="w-12 rounded-md border border-stone-600/80 bg-stone-900 text-center
                               text-sm text-stone-100 py-0.5 focus:outline-none
                               transition-colors duration-150 hover:border-stone-500/80
                               focus:ring-1 focus:ring-amber-500/40"
                  />
                </td>

                {/* Class bonus (read-only) */}
                <td className="py-1.5 px-2 text-center text-stone-400 text-xs">
                  {skill.classBonus > 0 ? `+${skill.classBonus}` : '—'}
                </td>

                {/* Total */}
                <td className={clsx(
                  'py-1.5 px-2 text-center font-bold font-mono',
                  skill.total >= 10 ? 'text-amber-300' :
                  skill.total >= 5  ? 'text-stone-200' : 'text-stone-400',
                )}>
                  {formatModifier(skill.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionPanel>
  )
}
