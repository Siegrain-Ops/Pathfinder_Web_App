import { useState }          from 'react'
import { clsx }              from 'clsx'
import { SectionPanel }      from './SectionPanel'
import { Button }            from '@/components/ui/Button'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'
import { useReferenceClasses } from '../../hooks/useReferenceClasses'
import type { FavoredClassBonus } from '@/types'
import { useReferenceRaces } from '../../hooks/useReferenceRaces'
import { ALIGNMENTS, COMMON_CLASSES, COMMON_RACES, SIZE_CATEGORIES } from '@/lib/constants'

export function OverviewSection() {
  const { data, update, setReferenceRaceId } = useCharacterSheet()
  const { classes, isLoading: classesLoading } = useReferenceClasses()
  const { races, isLoading: racesLoading } = useReferenceRaces()
  const [isLocked, setIsLocked] = useState(true)

  if (!data) return null

  // Capture narrowed non-null reference so closures can access it safely
  const d = data
  const raceOptions = races.length > 0 ? races.map(race => race.name) : COMMON_RACES
  const classOptions = classes.length > 0 ? classes.map(classRecord => classRecord.name) : COMMON_CLASSES

  function field(key: keyof typeof d) {
    return {
      value:    String(d[key] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        update({ [key]: e.target.value }),
    }
  }

  return (
    <SectionPanel
      title="Overview"
      action={
        <Button
          variant="ghost" size="sm"
          className={`p-1 ${isLocked ? 'text-amber-400 hover:text-amber-300' : 'text-stone-400 hover:text-stone-200'}`}
          title={isLocked ? 'Unlock overview fields' : 'Lock overview fields'}
          onClick={() => setIsLocked(l => !l)}
        >
          {isLocked ? '🔒' : '🔓'}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">

        {isLocked && (
          <p className="text-xs text-amber-400/70 italic">
            Fields are locked. Click 🔒 to enable editing.
          </p>
        )}

        {/* ── Identity ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Character Name">
            <input
              className="field text-base font-semibold text-stone-100 placeholder:font-normal"
              placeholder="Unnamed Hero"
              disabled={isLocked}
              {...field('name')}
            />
          </FormField>
          <FormField label="Player Name">
            <input className="field" disabled={isLocked} {...field('playerName')} />
          </FormField>
        </div>

        {/* ── Class & Race ──────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <SubHeader>Class &amp; Race</SubHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <FormField label="Race">
              <select
                className="field"
                value={data.race}
                onChange={e => {
                  const nextRace = races.find(race => race.name === e.target.value) ?? null
                  update({ race: e.target.value })
                  setReferenceRaceId(nextRace?.id ?? null)
                }}
                disabled={isLocked || racesLoading}
              >
                {!raceOptions.includes(data.race) && (
                  <option value={data.race}>{data.race}</option>
                )}
                {raceOptions.map(raceName => <option key={raceName} value={raceName}>{raceName}</option>)}
              </select>
            </FormField>
            <FormField label="Class">
              <select
                className="field"
                value={data.className}
                onChange={e => update({ className: e.target.value })}
                disabled={isLocked || classesLoading}
              >
                {!classOptions.includes(data.className) && (
                  <option value={data.className}>{data.className}</option>
                )}
                {classOptions.map(className => <option key={className} value={className}>{className}</option>)}
              </select>
            </FormField>
            <FormField label="Level">
              <input
                className="field"
                type="number" min={1} max={20}
                value={data.level}
                disabled={isLocked}
                onChange={e => update({ level: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Alignment">
              <select
                className="field"
                value={data.alignment}
                disabled={isLocked}
                onChange={e => update({ alignment: e.target.value as typeof d.alignment })}
              >
                {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </FormField>
            <FormField label="Size">
              <select className="field" value={data.size} disabled={isLocked} onChange={e => update({ size: e.target.value as typeof d.size })}>
                {SIZE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
        </div>

        {/* ── Background & Lore ─────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <SubHeader>Background &amp; Lore</SubHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Background">
              <input className="field" disabled={isLocked} {...field('background')} />
            </FormField>
            <FormField label="Deity">
              <input className="field" disabled={isLocked} {...field('deity')} />
            </FormField>
            <FormField label="Homeland">
              <input className="field" disabled={isLocked} {...field('homeland')} />
            </FormField>
          </div>
        </div>

        {/* ── Physical Description ──────────────────────────── */}
        <div className="flex flex-col gap-3">
          <SubHeader>Physical Description</SubHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField label="Age">
              <input
                className="field" type="number" min={0}
                value={data.age}
                disabled={isLocked}
                onChange={e => update({ age: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Gender">
              <input className="field" disabled={isLocked} {...field('gender')} />
            </FormField>
            <FormField label="Height">
              <input className="field" placeholder="e.g. 5'10&quot;" disabled={isLocked} {...field('height')} />
            </FormField>
            <FormField label="Weight">
              <input className="field" placeholder="e.g. 180 lbs" disabled={isLocked} {...field('weight')} />
            </FormField>
          </div>
        </div>

        {/* ── Progression ───────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <SubHeader>Progression</SubHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Experience Points">
              <input
                className="field" type="number" min={0}
                value={data.experience}
                disabled={isLocked}
                onChange={e => update({ experience: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Languages">
              <input
                className="field"
                value={data.languages.join(', ')}
                disabled={isLocked}
                onChange={e => update({ languages: e.target.value.split(',').map(l => l.trim()).filter(Boolean) })}
                placeholder="Common, Elvish, …"
              />
            </FormField>
          </div>

          {/* Favored Class Bonus */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500 whitespace-nowrap">
                Favored Class Bonus
              </span>
              <div className="flex-1 h-px bg-stone-700/50" />
            </div>
            <p className="text-[10px] text-stone-600">
              Bonus applied at each level-up. Used by the <strong className="text-stone-500">LvL UP</strong> workflow.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['hp', 'skill_rank'] as const).map((choice: FavoredClassBonus) => {
                const isActive = (data.favoredClassBonus ?? 'hp') === choice
                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={isLocked}
                    onClick={() => update({ favoredClassBonus: choice })}
                    className={clsx(
                      'flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                      isActive
                        ? 'border-amber-600/60 bg-amber-950/20'
                        : 'border-stone-700/50 hover:border-stone-600/60 hover:bg-stone-800/30',
                    )}
                  >
                    <span className={clsx(
                      'text-xs font-semibold',
                      isActive ? 'text-amber-300' : 'text-stone-400',
                    )}>
                      {choice === 'hp' ? '+1 HP / level' : '+1 Skill Rank / level'}
                    </span>
                    <span className="text-[10px] text-stone-500 leading-snug">
                      {choice === 'hp'
                        ? 'Extra hit point each favored-class level'
                        : 'Extra skill rank each favored-class level'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </SectionPanel>
  )
}

function SubHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-stone-700/50" />
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">{label}</span>
      {children}
    </label>
  )
}
