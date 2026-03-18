import { useState, useMemo }   from 'react'
import { SectionPanel }        from './SectionPanel'
import { Button }              from '@/components/ui/Button'
import { useCharacterSheet }   from '../../hooks/useCharacterSheet'
import { useReferenceClasses } from '../../hooks/useReferenceClasses'
import { formatModifier }      from '@/lib/utils/format.utils'
import { ABILITY_ABBR }        from '@/lib/constants'
import {
  getSpecializableBase,
  type SpecializableBase,
} from '@/lib/constants/skills.constants'
import {
  createSpecializationSkill,
  totalRanksSpent,
  approximateRankBudget,
} from '@/lib/formulas/skills.formulas'
import type { Skill }          from '@/types'
import { clsx }                from 'clsx'

export function SkillsSection() {
  const { data, update }   = useCharacterSheet()
  const { classes }        = useReferenceClasses()

  const [filterText, setFilterText] = useState('')
  const [addingBase, setAddingBase] = useState<SpecializableBase | null>(null)
  const [addingText, setAddingText] = useState('')
  const [addError,   setAddError]   = useState<string | null>(null)

  // ── Reference class (for rank budget) ──────────────────────────────────
  const refClass = useMemo(
    () => classes.find(c => c.name.toLowerCase() === (data?.className ?? '').toLowerCase()) ?? null,
    [classes, data?.className],
  )

  // ── Display list: alphabetical, filtered ───────────────────────────────
  const displaySkills = useMemo(() => {
    const skills = [...(data?.skills ?? [])].sort((a, b) => a.name.localeCompare(b.name))
    if (!filterText) return skills
    const q = filterText.toLowerCase()
    return skills.filter(s => s.name.toLowerCase().includes(q))
  }, [data?.skills, filterText])

  if (!data) return null

  // ── Rank budget ─────────────────────────────────────────────────────────
  const intMod    = Math.floor((data.stats.intelligence.total - 10) / 2)
  const spent     = totalRanksSpent(data.skills)
  const budget    = approximateRankBudget(
    data.level,
    refClass?.skillRanks ?? null,
    intMod,
    data.favoredClassBonus ?? 'hp',
  )
  const remaining = budget !== null ? budget - spent : null

  // ── Skill CRUD ──────────────────────────────────────────────────────────
  function updateSkill(id: string, patch: Partial<Skill>) {
    update({ skills: data!.skills.map(s => s.id === id ? { ...s, ...patch } : s) })
  }

  function removeSkill(id: string) {
    update({ skills: data!.skills.filter(s => s.id !== id) })
  }

  function confirmAdd() {
    if (!addingBase || !addingText.trim()) return
    const name = `${addingBase} (${addingText.trim()})`
    if (data!.skills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      setAddError(`"${name}" already exists in your skill list.`)
      return
    }
    const newSkill = createSpecializationSkill(addingBase, addingText.trim())
    update({ skills: [...data!.skills, newSkill] })
    setAddingText('')
    setAddError(null)
    setAddingBase(null)
  }

  function cancelAdd() {
    setAddingBase(null)
    setAddingText('')
    setAddError(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <SectionPanel
      title="Skills"
      action={
        <div className="flex items-center gap-3">
          {/* Rank budget indicator — only shown when reference class is known */}
          {budget !== null && (
            <span
              title={`Approx. total rank budget across all ${data.level} level${data.level !== 1 ? 's' : ''} · ${spent} spent, ${remaining} remaining`}
              className={clsx(
                'text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap',
                remaining !== null && remaining < 0
                  ? 'border-red-700/60 bg-red-950/30 text-red-400'
                  : remaining === 0
                    ? 'border-amber-700/60 bg-amber-950/30 text-amber-300'
                    : 'border-stone-600/60 bg-stone-800/40 text-stone-400',
              )}
            >
              {spent} / {budget} ranks
            </span>
          )}
          <input
            className="field w-36 text-xs py-1"
            placeholder="Filter…"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>
      }
    >
      {/* ── Skill table ──────────────────────────────────────────────────── */}
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
              <th className="w-5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {displaySkills.map(skill => {
              const isSpecializable = getSpecializableBase(skill.name) !== null
              // Allow removing any 0-rank specializable skill (including defaults)
              const canRemove = isSpecializable && skill.ranks === 0

              return (
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
                      title="Class Skill (+3 when trained)"
                    />
                  </td>

                  {/* Skill name */}
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

                  {/* Ranks */}
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

                  {/* Remove button — only for 0-rank specializable skills */}
                  <td className="py-1.5 pl-1">
                    {canRemove && (
                      <button
                        onClick={() => removeSkill(skill.id)}
                        className="text-stone-700 hover:text-red-400 transition-colors text-xs leading-none p-0.5"
                        title={`Remove ${skill.name} from skill list`}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add specialization ────────────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-stone-800/60 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-stone-600 uppercase tracking-wider">Add specialization:</span>
          {(['Craft', 'Perform', 'Profession'] as SpecializableBase[]).map(base => (
            <button
              key={base}
              onClick={() => {
                setAddingBase(addingBase === base ? null : base)
                setAddingText('')
                setAddError(null)
              }}
              className={clsx(
                'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
                addingBase === base
                  ? 'border-amber-600/60 bg-amber-950/30 text-amber-300'
                  : 'border-stone-700/60 bg-stone-800/40 text-stone-400 hover:text-stone-200 hover:border-stone-600/60',
              )}
            >
              + {base}
            </button>
          ))}
        </div>

        {addingBase && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-stone-500 shrink-0">{addingBase} (</span>
            <input
              className="field w-48 text-sm py-1"
              placeholder={
                addingBase === 'Craft'      ? 'e.g. Bows, Jewelry, Traps…'
                : addingBase === 'Perform'  ? 'e.g. Oratory, Comedy, Keyboard…'
                :                            'e.g. Sailor, Herbalist, Soldier…'
              }
              value={addingText}
              onChange={e => { setAddingText(e.target.value); setAddError(null) }}
              onKeyDown={e => {
                if (e.key === 'Enter')  confirmAdd()
                if (e.key === 'Escape') cancelAdd()
              }}
              autoFocus
            />
            <span className="text-xs text-stone-500 shrink-0">)</span>
            <Button size="sm" onClick={confirmAdd} disabled={!addingText.trim()}>
              Add
            </Button>
            <button
              onClick={cancelAdd}
              className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {addError && (
          <p className="text-xs text-red-400">{addError}</p>
        )}
      </div>
    </SectionPanel>
  )
}
