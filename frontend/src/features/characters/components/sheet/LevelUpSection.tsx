import { useState, useMemo } from 'react'
import { SectionPanel }          from './SectionPanel'
import { Button }                from '@/components/ui/Button'
import { useCharacterSheet }     from '../../hooks/useCharacterSheet'
import { useReferenceClasses }   from '../../hooks/useReferenceClasses'
import { clsx }                  from 'clsx'
import type { ReferenceClass }   from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function abilityMod(score: number) {
  return Math.floor((score - 10) / 2)
}

function formatMod(n: number) {
  return n >= 0 ? `+${n}` : `${n}`
}

function rollAverage(die: number) {
  return Math.floor(die / 2) + 1
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepId =
  | 'confirm'
  | 'hp'
  | 'bab_saves'
  | 'skills'
  | 'features'
  | 'feat'
  | 'ability'
  | 'spells'

const ALL_STEPS: StepId[] = [
  'confirm', 'hp', 'bab_saves', 'skills', 'features', 'feat', 'ability', 'spells',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LevelUpSection() {
  const { data, update, save } = useCharacterSheet()
  const { classes, isLoading } = useReferenceClasses()

  const [done, setDone]                               = useState<Set<StepId>>(new Set())
  const [expanded, setExpanded]                       = useState<StepId | null>('confirm')
  const [hpApplied, setHpApplied]                     = useState(false)
  const [babApplied, setBabApplied]                   = useState(false)
  const [savesApplied, setSavesApplied]               = useState(false)
  const [currentLevelAtStart, setCurrentLevelAtStart] = useState<number | null>(null)

  if (!data) return null

  // Capture narrowed non-null reference so closures can access it safely
  const d = data

  // Use the frozen level (set when workflow began) so nextLevel stays stable
  // even after applyLevelUp increments data.level.
  const currentLevel = currentLevelAtStart ?? d.level
  const nextLevel    = currentLevel + 1

  // Match reference class by name (case-insensitive)
  const refClass: ReferenceClass | null = useMemo(
    () => classes.find(c => c.name.toLowerCase() === d.className.toLowerCase()) ?? null,
    [classes, d.className],
  )

  const nextRow    = refClass?.progressionTable?.find(r => r.level === nextLevel) ?? null

  const intMod         = abilityMod(d.stats.intelligence.total)
  const conMod         = abilityMod(d.stats.constitution.total)
  const hitDie         = refClass?.hitDie ?? 8
  const rankBudget     = Math.max(1, (refClass?.skillRanks ?? 2) + intMod)
  const avgHpGain      = Math.max(1, rollAverage(hitDie) + conMod)

  const favoredClassBonus = d.favoredClassBonus ?? 'hp'
  const fcbHpBonus        = favoredClassBonus === 'hp' ? 1 : 0
  const fcbRankBonus      = favoredClassBonus === 'skill_rank' ? 1 : 0

  const gainsFeat         = nextLevel % 2 === 1
  const gainsAbilityScore = nextLevel % 4 === 0
  const isCaster          = !!(refClass?.spellcastingType)

  const newFeatures = refClass?.classFeatures?.filter(f => f.level === nextLevel) ?? []

  const newBab  = nextRow?.baseAttackBonus ?? null
  const newFort = nextRow?.fortSave        ?? null
  const newRef  = nextRow?.refSave         ?? null
  const newWill = nextRow?.willSave        ?? null

  const newSpellsPerDay = nextRow?.spellsPerDay ?? null

  // Steps that are relevant at this level
  const activeSteps: StepId[] = ALL_STEPS.filter(s => {
    if (s === 'feat')    return gainsFeat
    if (s === 'ability') return gainsAbilityScore
    if (s === 'spells')  return isCaster
    return true
  })

  // ── Action helpers ────────────────────────────────────────────────────────

  function markDone(step: StepId) {
    const newDone = new Set([...done, step])
    setDone(newDone)
    // Auto-advance to next undone step
    const idx  = activeSteps.indexOf(step)
    const next = activeSteps.slice(idx + 1).find(s => !done.has(s))
    setExpanded(next ?? null)
    // When all steps are done: save and reset the workflow for the next level
    if (activeSteps.every(s => newDone.has(s))) {
      save().then(() => {
        setDone(new Set())
        setExpanded('confirm')
        setHpApplied(false)
        setBabApplied(false)
        setSavesApplied(false)
        setCurrentLevelAtStart(null)
      })
    }
  }

  function toggleExpand(step: StepId) {
    setExpanded(prev => prev === step ? null : step)
  }

  function applyLevelUp() {
    setCurrentLevelAtStart(d.level)  // freeze the current level for this session
    update({ level: d.level + 1 })
    markDone('confirm')
  }

  function applyHp() {
    const totalGain = avgHpGain + fcbHpBonus
    update({
      combat: {
        ...d.combat,
        hitPoints: {
          ...d.combat.hitPoints,
          max:     d.combat.hitPoints.max     + totalGain,
          current: d.combat.hitPoints.current + totalGain,
        },
      },
    })
    setHpApplied(true)
  }

  function applyBab() {
    if (newBab === null) return
    update({ combat: { ...d.combat, baseAttackBonus: newBab } })
    setBabApplied(true)
  }

  function applySaves() {
    if (newFort === null && newRef === null && newWill === null) return
    update({
      saves: {
        fortitude: { ...d.saves.fortitude, base: newFort ?? d.saves.fortitude.base },
        reflex:    { ...d.saves.reflex,    base: newRef  ?? d.saves.reflex.base    },
        will:      { ...d.saves.will,      base: newWill ?? d.saves.will.base      },
      },
    })
    setSavesApplied(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SectionPanel title="Level Up">
      <div className="flex flex-col gap-6">

        {/* ── Character summary ───────────────────────────────────────── */}
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-5 py-4">
          <div className="flex flex-wrap items-center gap-6">
            <LvlBadge current={currentLevel} next={nextLevel} />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-stone-500 uppercase tracking-wide">Character</span>
              <span className="font-semibold text-stone-100">{d.name || 'Unnamed Hero'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-stone-500 uppercase tracking-wide">Class</span>
              <span className="font-semibold text-stone-200">
                {d.className || '—'}
                {refClass && <span className="ml-1 text-xs text-stone-500">(d{hitDie})</span>}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-stone-500 uppercase tracking-wide">Race</span>
              <span className="font-semibold text-stone-200">{d.race || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-stone-500 uppercase tracking-wide">FCB</span>
              <span className={clsx(
                'text-xs font-semibold px-2 py-0.5 rounded-full border',
                favoredClassBonus === 'hp'
                  ? 'border-amber-600/50 bg-amber-950/30 text-amber-300'
                  : 'border-emerald-600/50 bg-emerald-950/30 text-emerald-300',
              )}>
                {favoredClassBonus === 'hp' ? '+1 HP / lvl' : '+1 Rank / lvl'}
              </span>
            </div>
            {isLoading && (
              <span className="text-xs text-stone-500 italic">Loading class data…</span>
            )}
            {!isLoading && !refClass && d.className && (
              <span className="text-xs text-amber-500/70 italic">
                Class "{d.className}" not found in reference archive — some steps will be manual.
              </span>
            )}
          </div>
        </div>

        {/* ── Step list ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          {activeSteps.map((step, idx) => (
            <Step
              key={step}
              step={step}
              index={idx + 1}
              isDone={done.has(step)}
              isExpanded={expanded === step}
              onToggle={() => toggleExpand(step)}
              onMarkDone={() => markDone(step)}
            >
              {step === 'confirm' && (
                <ConfirmStep
                  currentLevel={currentLevel}
                  nextLevel={nextLevel}
                  alreadyApplied={done.has('confirm')}
                  onApply={applyLevelUp}
                />
              )}
              {step === 'hp' && (
                <HpStep
                  hitDie={hitDie}
                  conMod={conMod}
                  avgGain={avgHpGain}
                  fcbBonus={fcbHpBonus}
                  currentMax={d.combat.hitPoints.max}
                  applied={hpApplied}
                  onApply={applyHp}
                />
              )}
              {step === 'bab_saves' && (
                <BabSavesStep
                  currentBab={d.combat.baseAttackBonus}
                  newBab={newBab}
                  currentFort={d.saves.fortitude.base}
                  currentRef={d.saves.reflex.base}
                  currentWill={d.saves.will.base}
                  newFort={newFort}
                  newRef={newRef}
                  newWill={newWill}
                  babApplied={babApplied}
                  savesApplied={savesApplied}
                  onApplyBab={applyBab}
                  onApplySaves={applySaves}
                />
              )}
              {step === 'skills' && (
                <SkillsStep
                  rankBudget={rankBudget}
                  fcbBonus={fcbRankBonus}
                  skillRanksBase={refClass?.skillRanks ?? null}
                  intMod={intMod}
                  classSkills={refClass?.classSkills?.map(s => s.name) ?? null}
                />
              )}
              {step === 'features' && (
                <FeaturesStep
                  features={newFeatures}
                  level={nextLevel}
                  className={d.className}
                />
              )}
              {step === 'feat' && (
                <FeatStep level={nextLevel} />
              )}
              {step === 'ability' && (
                <AbilityStep level={nextLevel} />
              )}
              {step === 'spells' && (
                <SpellsStep
                  spellsPerDay={newSpellsPerDay}
                  castingType={refClass?.spellcastingType ?? null}
                  castingStat={refClass?.castingStat ?? null}
                  level={nextLevel}
                />
              )}
            </Step>
          ))}
        </div>

      </div>
    </SectionPanel>
  )
}

// ---------------------------------------------------------------------------
// Step shell
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<StepId, string> = {
  confirm:   'Confirm Level Up',
  hp:        'Hit Points',
  bab_saves: 'BAB & Saving Throws',
  skills:    'Skill Ranks',
  features:  'Class Features',
  feat:      'New Feat',
  ability:   'Ability Score Increase',
  spells:    'Spellcasting Progression',
}

interface StepProps {
  step:       StepId
  index:      number
  isDone:     boolean
  isExpanded: boolean
  onToggle:   () => void
  onMarkDone: () => void
  children:   React.ReactNode
}

function Step({ step, index, isDone, isExpanded, onToggle, onMarkDone, children }: StepProps) {
  return (
    <div className={clsx(
      'rounded-xl border transition-colors duration-150',
      isDone
        ? 'border-emerald-800/40 bg-emerald-950/10'
        : 'border-stone-700/60 bg-stone-900/60',
    )}>
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* Step number / check */}
        <div className={clsx(
          'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-150',
          isDone
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-600/40'
            : 'bg-stone-800 text-stone-400 border border-stone-600/60',
        )}>
          {isDone ? '✓' : index}
        </div>

        <span className={clsx(
          'flex-1 text-sm font-medium tracking-wide',
          isDone ? 'text-emerald-400/70 line-through' : 'text-stone-200',
        )}>
          {STEP_LABELS[step]}
        </span>

        {!isDone && (
          <Button
            variant="ghost" size="sm"
            className="text-emerald-500 hover:text-emerald-300 text-xs px-2 py-1 shrink-0"
            onClick={e => { e.stopPropagation(); onMarkDone() }}
          >
            Mark done
          </Button>
        )}

        <span className="text-stone-600 text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-stone-800/60 px-4 py-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step contents
// ---------------------------------------------------------------------------

function ConfirmStep({
  currentLevel, nextLevel, alreadyApplied, onApply,
}: {
  currentLevel: number
  nextLevel: number
  alreadyApplied: boolean
  onApply: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-400">
        Advance this character from <strong className="text-stone-200">Level {currentLevel}</strong> to{' '}
        <strong className="text-emerald-400">Level {nextLevel}</strong>.
        This will update the <em>Level</em> field in the Overview tab.
      </p>
      {alreadyApplied ? (
        <p className="text-xs text-emerald-500/80 italic">✓ Level incremented to {nextLevel}.</p>
      ) : (
        <Button size="sm" onClick={onApply} className="self-start">
          Level Up → {nextLevel}
        </Button>
      )}
    </div>
  )
}

function HpStep({
  hitDie, conMod, avgGain, fcbBonus, currentMax, applied, onApply,
}: {
  hitDie: number
  conMod: number
  avgGain: number
  fcbBonus: number
  currentMax: number
  applied: boolean
  onApply: () => void
}) {
  const formula   = `d${hitDie} ${conMod >= 0 ? '+' : ''}${conMod} CON`
  const avg       = rollAverage(hitDie)
  const totalGain = avgGain + fcbBonus

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-400">
        Roll <strong className="text-stone-200">{formula}</strong> (minimum 1) and add to your maximum HP.
        Average result: <strong className="text-amber-400">{avg} + {conMod} = {avgGain}</strong>.
        {fcbBonus > 0 && (
          <> Plus <strong className="text-amber-300">+{fcbBonus} Favored Class Bonus</strong>.</>
        )}
      </p>

      <div className="grid grid-cols-4 gap-3">
        <InfoChip label="Hit Die"  value={`d${hitDie}`} />
        <InfoChip label="CON Mod"  value={formatMod(conMod)} />
        {fcbBonus > 0 && <InfoChip label="FCB" value={`+${fcbBonus}`} fcb />}
        <InfoChip label="Avg Gain" value={`+${totalGain}`} accent />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-stone-500">Current Max HP: {currentMax}</span>
        <span className="text-xs text-stone-500">→</span>
        <span className="text-xs text-stone-300 font-mono">{currentMax + totalGain} (after avg{fcbBonus > 0 ? ' + FCB' : ''})</span>
      </div>

      {applied ? (
        <p className="text-xs text-emerald-500/80 italic">✓ HP (+{totalGain}{fcbBonus > 0 ? `, including +${fcbBonus} FCB` : ''}) applied to Max & Current HP.</p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={onApply}>Apply avg HP (+{totalGain})</Button>
          <span className="text-xs text-stone-500 self-center">or roll manually and update the Combat tab</span>
        </div>
      )}
    </div>
  )
}

function BabSavesStep({
  currentBab, newBab,
  currentFort, currentRef, currentWill,
  newFort, newRef, newWill,
  babApplied, savesApplied,
  onApplyBab, onApplySaves,
}: {
  currentBab: number;  newBab: number | null
  currentFort: number; currentRef: number; currentWill: number
  newFort: number | null; newRef: number | null; newWill: number | null
  babApplied: boolean; savesApplied: boolean
  onApplyBab: () => void; onApplySaves: () => void
}) {
  const hasBab   = newBab !== null
  const hasSaves = newFort !== null || newRef !== null || newWill !== null

  return (
    <div className="flex flex-col gap-5">
      {/* BAB */}
      <div className="flex flex-col gap-3">
        <SubLabel>Base Attack Bonus</SubLabel>
        {hasBab ? (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <InfoChip label="Current BAB" value={formatMod(currentBab)} />
              <span className="text-stone-600">→</span>
              <InfoChip label="New BAB" value={formatMod(newBab!)} accent />
            </div>
            {babApplied ? (
              <p className="text-xs text-emerald-500/80 italic">✓ BAB updated.</p>
            ) : (
              <Button size="sm" className="self-start" onClick={onApplyBab}>
                Apply new BAB ({formatMod(newBab!)})
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs text-stone-500 italic">
            Progression table unavailable — update BAB manually in the Combat tab.
          </p>
        )}
      </div>

      {/* Saves */}
      <div className="flex flex-col gap-3">
        <SubLabel>Saving Throw Base Bonuses</SubLabel>
        {hasSaves ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <SaveChip label="Fort" current={currentFort} next={newFort} />
              <SaveChip label="Ref"  current={currentRef}  next={newRef}  />
              <SaveChip label="Will" current={currentWill} next={newWill} />
            </div>
            {savesApplied ? (
              <p className="text-xs text-emerald-500/80 italic">✓ Save base values updated.</p>
            ) : (
              <Button size="sm" className="self-start" onClick={onApplySaves}>
                Apply save bonuses
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs text-stone-500 italic">
            Progression table unavailable — update saves manually in the Saves tab.
          </p>
        )}
      </div>
    </div>
  )
}

function SkillsStep({
  rankBudget, fcbBonus, skillRanksBase, intMod, classSkills,
}: {
  rankBudget: number
  fcbBonus: number
  skillRanksBase: number | null
  intMod: number
  classSkills: string[] | null
}) {
  const totalBudget = rankBudget + fcbBonus

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-400">
        You earn <strong className="text-amber-400">{totalBudget} skill rank{totalBudget !== 1 ? 's' : ''}</strong> this level
        {skillRanksBase !== null && (
          <> ({skillRanksBase} class + {formatMod(intMod)} INT, min 1{fcbBonus > 0 ? `, +${fcbBonus} FCB` : ''})</>
        )}.
        {fcbBonus > 0 && (
          <> Includes <strong className="text-amber-300">+{fcbBonus} Favored Class Bonus</strong>.</>
        )}
        {' '}Open the <strong className="text-stone-300">Skills</strong> tab to distribute them.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {skillRanksBase !== null && <InfoChip label="Class ranks/lvl" value={String(skillRanksBase)} />}
        <InfoChip label="INT modifier"  value={formatMod(intMod)} />
        {fcbBonus > 0 && <InfoChip label="FCB" value={`+${fcbBonus}`} fcb />}
        <InfoChip label="Total budget"  value={`+${totalBudget}`} accent />
      </div>

      {classSkills && classSkills.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubLabel>Class Skills</SubLabel>
          <div className="flex flex-wrap gap-1.5">
            {classSkills.map(name => (
              <span
                key={name}
                className="rounded-full bg-stone-800 border border-stone-700/60 px-2.5 py-0.5 text-xs text-stone-300"
              >
                {name}
              </span>
            ))}
          </div>
          <p className="text-xs text-stone-500 italic">
            Class skills get +3 when you have at least 1 rank.
          </p>
        </div>
      )}
    </div>
  )
}

function FeaturesStep({
  features, level, className,
}: {
  features: Array<{ level?: number; name: string; description: string }>
  level: number
  className: string
}) {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      {features.length > 0 ? (
        <>
          <p className="text-sm text-stone-400">
            At level {level}, <strong className="text-stone-200">{className}</strong> gains the following class feature{features.length !== 1 ? 's' : ''}:
          </p>
          <div className="flex flex-col gap-2">
            {features.map(f => (
              <div key={f.name} className="rounded-lg border border-stone-700/60 bg-stone-900/60">
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer"
                  onClick={() => setExpandedFeature(expandedFeature === f.name ? null : f.name)}
                >
                  <span className="text-sm font-medium text-stone-200">{f.name}</span>
                  <span className="text-stone-600 text-xs">{expandedFeature === f.name ? '▲' : '▼'}</span>
                </div>
                {expandedFeature === f.name && f.description && (
                  <div className="border-t border-stone-800/60 px-3 py-3">
                    <p className="text-xs text-stone-400 leading-relaxed whitespace-pre-wrap">{f.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500 italic">
            Add any relevant abilities or spells in the Abilities / Spells tabs.
          </p>
        </>
      ) : (
        <p className="text-sm text-stone-400">
          {className
            ? `No class features found for ${className} at level ${level} in the reference archive. Check the class description manually.`
            : 'No class set. Set your class in the Overview tab to see class features.'}
        </p>
      )}
    </div>
  )
}

function FeatStep({ level }: { level: number }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-stone-400">
        Level {level} grants a <strong className="text-stone-200">General Feat</strong>.
        Open the <strong className="text-stone-300">Feats</strong> tab to search the reference archive and add your chosen feat.
      </p>
      <p className="text-xs text-stone-500 italic">
        In Pathfinder 1e, general feats are gained at levels 1, 3, 5, 7, 9, 11, 13, 15, 17, and 19.
        Some classes provide additional bonus feats — check your class features above.
      </p>
    </div>
  )
}

function AbilityStep({ level }: { level: number }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-stone-400">
        At level {level} you gain <strong className="text-amber-400">+1 to any ability score</strong>.
        Open the <strong className="text-stone-300">Stats</strong> tab and increase the Base value of
        your chosen ability.
      </p>
      <p className="text-xs text-stone-500 italic">
        Pathfinder 1e grants an ability score increase every 4 levels (4, 8, 12, 16, 20).
        The +1 applies to the raw score — your modifier and all derived values update automatically.
      </p>
    </div>
  )
}

function SpellsStep({
  spellsPerDay, castingType, castingStat, level,
}: {
  spellsPerDay: string[] | null
  castingType: string | null
  castingStat: string | null
  level: number
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {castingType && <InfoChip label="Casting Type" value={castingType} />}
        {castingStat && <InfoChip label="Casting Stat" value={castingStat.toUpperCase()} />}
      </div>

      {spellsPerDay && spellsPerDay.length > 0 ? (
        <div className="flex flex-col gap-2">
          <SubLabel>Spells per Day at Level {level}</SubLabel>
          <div className="flex flex-wrap gap-2">
            {spellsPerDay.map((count, idx) => (
              <div key={idx} className="flex flex-col items-center rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 min-w-[48px]">
                <span className="text-xs text-stone-500 uppercase tracking-wide">L{idx}</span>
                <span className="text-base font-bold text-stone-200 font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-400">
          Spell slot table not available in reference archive for this class at level {level}.
          Check the class description or a Pathfinder reference for updated slots.
        </p>
      )}

      <p className="text-xs text-stone-500 italic">
        Open the <strong className="text-stone-300">Spells</strong> tab to add any newly available spells.
        If your caster level increases your bonus spells (from casting stat), update your spell slots there.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small UI atoms
// ---------------------------------------------------------------------------

function LvlBadge({ current, next }: { current: number; next: number }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="rounded-lg border border-stone-700/60 bg-stone-900 px-3 py-2 text-center min-w-[56px]">
        <span className="text-[10px] text-stone-500 block uppercase tracking-wide">Current Lv.</span>
        <span className="text-2xl font-bold font-display text-stone-300">{current}</span>
      </div>
      <span className="text-stone-600 text-lg">→</span>
      <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-center min-w-[56px]">
        <span className="text-[10px] text-emerald-600 block uppercase tracking-wide">Leveling to</span>
        <span className="text-2xl font-bold font-display text-emerald-400">{next}</span>
      </div>
    </div>
  )
}

function InfoChip({
  label, value, accent = false, fcb = false,
}: { label: string; value: string; accent?: boolean; fcb?: boolean }) {
  return (
    <div className={clsx(
      'flex flex-col items-center rounded-lg border px-3 py-2',
      fcb ? 'border-amber-700/50 bg-amber-950/20' : 'border-stone-700/60 bg-stone-900/80',
    )}>
      <span className={clsx(
        'text-[10px] uppercase tracking-wide',
        fcb ? 'text-amber-600' : 'text-stone-500',
      )}>{label}</span>
      <span className={clsx(
        'text-base font-bold font-mono',
        fcb || accent ? 'text-amber-300' : 'text-stone-200',
      )}>
        {value}
      </span>
    </div>
  )
}

function SaveChip({
  label, current, next,
}: { label: string; current: number; next: number | null }) {
  const changed = next !== null && next !== current
  return (
    <div className="flex flex-col items-center rounded-lg border border-stone-700/60 bg-stone-900/80 px-3 py-2 gap-1">
      <span className="text-[10px] uppercase tracking-wide text-stone-500">{label}</span>
      <span className="text-sm text-stone-400 font-mono">{formatMod(current)}</span>
      {next !== null && (
        <>
          <span className="text-stone-600 text-xs">↓</span>
          <span className={clsx(
            'text-base font-bold font-mono',
            changed ? 'text-amber-300' : 'text-stone-400',
          )}>
            {formatMod(next)}
          </span>
        </>
      )}
    </div>
  )
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-stone-700/50" />
    </div>
  )
}
