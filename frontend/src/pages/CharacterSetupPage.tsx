// ---------------------------------------------------------------------------
// Character Setup Page
//
// Obbligatorio per i nuovi personaggi. Guida l'utente attraverso:
//   1. Punteggi di caratteristica (statistiche base)
//   2. HP iniziali (massimo dado vita + MOD CON al livello 1)
//   3. BAB e Tiri salvezza dalla tabella di progressione di classe
//   4. Caratteristiche di classe di livello 1 (informativo)
//   5. Talento iniziale (informativo)
//   6. Magie per giorno (solo incantatori)
//
// Alla fine del setup, `needsSetup` viene impostato a false e il PG viene
// salvato, quindi l'utente viene reindirizzato alla scheda personaggio.
// ---------------------------------------------------------------------------

import { useEffect, useState, useMemo } from 'react'
import { Link, useParams, useNavigate }  from 'react-router-dom'
import { clsx }                          from 'clsx'

import { useCharacterStore }   from '@/app/store/characterStore'
import { useCharacterSheet }   from '@/features/characters/hooks/useCharacterSheet'
import { useReferenceClasses } from '@/features/characters/hooks/useReferenceClasses'
import { isCasterSpellcastingType } from '@/lib/utils/spellcasting.utils'
import { Spinner }             from '@/components/ui/Spinner'
import { Button }              from '@/components/ui/Button'
import type { ReferenceClass } from '@/types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function roll4d6DropLowest(): number {
  const rolls = [1, 2, 3, 4].map(() => Math.floor(Math.random() * 6) + 1)
  rolls.sort((a, b) => a - b)
  return rolls.slice(1).reduce((sum, n) => sum + n, 0)
}

type AbilityKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

const ABILITY_ROWS: { key: AbilityKey; abbr: string; label: string }[] = [
  { key: 'strength',     abbr: 'STR', label: 'Strength'     },
  { key: 'dexterity',    abbr: 'DEX', label: 'Dexterity'    },
  { key: 'constitution', abbr: 'CON', label: 'Constitution' },
  { key: 'intelligence', abbr: 'INT', label: 'Intelligence' },
  { key: 'wisdom',       abbr: 'WIS', label: 'Wisdom'       },
  { key: 'charisma',     abbr: 'CHA', label: 'Charisma'     },
]

const STANDARD_ARRAY_VALUES = [15, 14, 13, 12, 10, 8] as const

const DEFAULT_LOCAL_STATS: Record<AbilityKey, number> = {
  strength: 10, dexterity: 10, constitution: 10,
  intelligence: 10, wisdom: 10, charisma: 10,
}

type StepId = 'stats' | 'hp' | 'bab_saves' | 'features' | 'feat' | 'spells'

const STEP_LABELS: Record<StepId, string> = {
  stats:     'Ability Scores',
  hp:        'Hit Points',
  bab_saves: 'BAB & Saving Throws',
  features:  'Class Features',
  feat:      'Starting Feat',
  spells:    'Spellcasting',
}

// ── Main component ───────────────────────────────────────────────────────────

export function CharacterSetupPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()

  const { loadCharacter, clearActive, isLoading, error } = useCharacterStore()
  const { data, update, save, isSaving }  = useCharacterSheet()
  const { classes }                       = useReferenceClasses()

  // ── Load character ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) { navigate('/'); return }
    void loadCharacter(id)
    return () => clearActive()
  }, [id, loadCharacter, clearActive, navigate])

  // ── Redirect if setup already done (or existing character) ───────────────
  useEffect(() => {
    if (!isLoading && data && data.needsSetup !== true) {
      navigate(`/characters/${id}`, { replace: true })
    }
  }, [isLoading, data, id, navigate])

  // ── Reference class ───────────────────────────────────────────────────────
  const refClass: ReferenceClass | null = useMemo(
    () => classes.find(c => c.name.toLowerCase() === (data?.className ?? '').toLowerCase()) ?? null,
    [classes, data?.className],
  )

  // ── Local stats state (before applying to character) ─────────────────────
  const [localStats, setLocalStats] = useState<Record<AbilityKey, number>>(DEFAULT_LOCAL_STATS)

  // ── Step state ────────────────────────────────────────────────────────────
  const [done,         setDone]         = useState<Set<StepId>>(new Set())
  const [expanded,     setExpanded]     = useState<StepId | null>('stats')
  const [statsApplied, setStatsApplied] = useState(false)
  const [hpApplied,    setHpApplied]    = useState(false)
  const [babApplied,   setBabApplied]   = useState(false)
  const [savesApplied, setSavesApplied] = useState(false)

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400">{error}</p>
        <button className="text-sm text-stone-400 underline" onClick={() => navigate('/')}>
          Back to characters
        </button>
      </div>
    )
  }

  const d = data

  // ── Derived values ────────────────────────────────────────────────────────
  const levelRow   = refClass?.progressionTable?.find(r => r.level === d.level) ?? null
  const hitDie     = refClass?.hitDie ?? 8
  const isCaster   = isCasterSpellcastingType(refClass?.spellcastingType)

  // CON modifier: after applying stats, use character data; before, use local
  const conBase  = statsApplied
    ? (d.stats.constitution.base + (d.stats.constitution.racialBonus ?? 0))
    : localStats.constitution
  const conMod   = abilityMod(conBase)
  const fcbHpBonus = d.favoredClassBonus === 'hp' ? 1 : 0
  const initHp   = Math.max(1, hitDie + conMod) + fcbHpBonus

  const newBab   = levelRow?.baseAttackBonus ?? null
  const newFort  = levelRow?.fortSave        ?? null
  const newRef   = levelRow?.refSave         ?? null
  const newWill  = levelRow?.willSave        ?? null

  const newFeatures = refClass?.classFeatures?.filter(f => f.level === d.level) ?? []
  const newSpells   = levelRow?.spellsPerDay ?? null

  const activeSteps: StepId[] = (
    ['stats', 'hp', 'bab_saves', 'features', 'feat', 'spells'] as StepId[]
  ).filter(s => s !== 'spells' || isCaster)

  // ── Actions ───────────────────────────────────────────────────────────────

  function markDone(step: StepId) {
    if (step === 'stats' && !statsApplied) {
      applyStats()
    }

    if (step === 'hp' && !hpApplied) {
      if (!statsApplied) applyStats()
      applyHp()
    }

    if (step === 'bab_saves') {
      if (!babApplied) applyBab()
      if (!savesApplied) applySaves()
    }

    const newDone = new Set([...done, step])
    setDone(newDone)
    const idx  = activeSteps.indexOf(step)
    const next = activeSteps.slice(idx + 1).find(s => !newDone.has(s))
    setExpanded(next ?? null)
  }

  function toggleExpand(step: StepId) {
    setExpanded(prev => prev === step ? null : step)
  }

  function applyStats() {
    update({
      stats: {
        strength:     { ...d.stats.strength,     base: localStats.strength     },
        dexterity:    { ...d.stats.dexterity,    base: localStats.dexterity    },
        constitution: { ...d.stats.constitution, base: localStats.constitution },
        intelligence: { ...d.stats.intelligence, base: localStats.intelligence },
        wisdom:       { ...d.stats.wisdom,       base: localStats.wisdom       },
        charisma:     { ...d.stats.charisma,     base: localStats.charisma     },
      },
    })
    setStatsApplied(true)
  }

  function applyHp() {
    update({
      combat: {
        ...d.combat,
        hitPoints: { max: initHp, current: initHp, temp: 0 },
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

  async function completeSetup() {
    // Clears the setup flag; recomputeCharacter preserves all other fields
    update({ needsSetup: false })
    await save()
    navigate(`/characters/${id}`, { replace: true })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full py-6 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Page header */}
        <div className="flex flex-col gap-1">
          <Link to="/" className="text-stone-500 hover:text-stone-300 transition-colors text-sm mb-1 self-start">
            ← Characters
          </Link>
          <h1 className="font-display font-bold text-2xl text-stone-100">
            Initial Setup
          </h1>
          <p className="text-stone-400 text-sm">
            Initialize your new Level {d.level} {d.className}. Complete each step to prepare your character sheet.
          </p>
        </div>

        {/* Character identity card */}
        <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 px-5 py-4">
          <div className="flex flex-wrap items-center gap-6">
            <IdentityChip label="Character" value={d.name} />
            <IdentityChip
              label="Class"
              value={d.className}
              sub={refClass ? `d${hitDie}` : undefined}
            />
            <IdentityChip label="Race"  value={d.race} />
            <IdentityChip label="Level" value={String(d.level)} highlight />
            <IdentityChip label="FCB"   value={d.favoredClassBonus === 'hp' ? '+1 HP/lvl' : '+1 Rank/lvl'} />
          </div>
          {!refClass && d.className && (
            <p className="mt-3 text-xs text-amber-500/70 italic">
              Class "{d.className}" not found in the reference archive — some steps require manual entry in the sheet.
            </p>
          )}
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-2">
          {activeSteps.map((step, idx) => (
            <SetupStep
              key={step}
              step={step}
              index={idx + 1}
              isDone={done.has(step)}
              isExpanded={expanded === step}
              onToggle={() => toggleExpand(step)}
              onMarkDone={() => markDone(step)}
            >
              {step === 'stats' && (
                <StatsStep
                  localStats={localStats}
                  onChange={setLocalStats}
                  onApply={applyStats}
                  applied={statsApplied}
                />
              )}
              {step === 'hp' && (
                <HpStep
                  hitDie={hitDie}
                  conMod={conMod}
                  fcbBonus={fcbHpBonus}
                  initHp={initHp}
                  statsApplied={statsApplied}
                  applied={hpApplied}
                  onApply={applyHp}
                />
              )}
              {step === 'bab_saves' && (
                <BabSavesSetupStep
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
              {step === 'features' && (
                <FeaturesSetupStep
                  features={newFeatures}
                  level={d.level}
                  className={d.className}
                />
              )}
              {step === 'feat' && (
                <FeatSetupStep level={d.level} />
              )}
              {step === 'spells' && (
                <SpellsSetupStep
                  spellsPerDay={newSpells}
                  castingType={refClass?.spellcastingType ?? null}
                  castingStat={refClass?.castingStat ?? null}
                  level={d.level}
                />
              )}
            </SetupStep>
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pb-8 pt-2 border-t border-stone-800">
          <Button variant="secondary" onClick={() => navigate('/')}>
            Skip for now
          </Button>
          <Button
            onClick={() => { void completeSetup() }}
            loading={isSaving}
          >
            Complete Setup →
          </Button>
        </div>

      </div>
    </div>
  )
}

// ── Step shell ───────────────────────────────────────────────────────────────

interface SetupStepProps {
  step:       StepId
  index:      number
  isDone:     boolean
  isExpanded: boolean
  onToggle:   () => void
  onMarkDone: () => void
  children:   React.ReactNode
}

function SetupStep({ step, index, isDone, isExpanded, onToggle, onMarkDone, children }: SetupStepProps) {
  return (
    <div className={clsx(
      'rounded-xl border transition-colors duration-150',
      isDone
        ? 'border-amber-800/40 bg-amber-950/10'
        : 'border-stone-700/60 bg-stone-900/60',
    )}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className={clsx(
          'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          isDone
            ? 'bg-amber-500/20 text-amber-400 border border-amber-600/40'
            : 'bg-stone-800 text-stone-400 border border-stone-600/60',
        )}>
          {isDone ? '✓' : index}
        </div>
        <span className={clsx(
          'flex-1 text-sm font-medium tracking-wide',
          isDone ? 'text-amber-400/70 line-through' : 'text-stone-200',
        )}>
          {STEP_LABELS[step]}
        </span>
        {!isDone && (
          <Button
            variant="ghost" size="sm"
            className="text-amber-500 hover:text-amber-300 text-xs px-2 py-1 shrink-0"
            onClick={e => { e.stopPropagation(); onMarkDone() }}
          >
            Mark done
          </Button>
        )}
        <span className="text-stone-600 text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
      </div>
      {isExpanded && (
        <div className="border-t border-stone-800/60 px-4 py-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Stats step ───────────────────────────────────────────────────────────────

function StatsStep({
  localStats, onChange, onApply, applied,
}: {
  localStats: Record<AbilityKey, number>
  onChange:   (s: Record<AbilityKey, number>) => void
  onApply:    () => void
  applied:    boolean
}) {
  const [mode, setMode] = useState<'manual' | 'standard_array' | 'rolled'>('manual')
  const [availableValues, setAvailableValues] = useState<number[]>([])

  function setOne(key: AbilityKey, val: number) {
    onChange({ ...localStats, [key]: Math.max(3, Math.min(20, val)) })
  }

  function assignValue(key: AbilityKey, nextValue: number) {
    const previousValue = localStats[key]
    const nextPool = [...availableValues]
    const pickedIndex = nextPool.findIndex(value => value === nextValue)
    if (pickedIndex === -1) return

    nextPool.splice(pickedIndex, 1)
    if (previousValue !== 10) nextPool.push(previousValue)
    nextPool.sort((a, b) => b - a)

    onChange({ ...localStats, [key]: nextValue })
    setAvailableValues(nextPool)
  }

  function rollOne(key: AbilityKey) {
    if (mode !== 'manual') return
    setOne(key, roll4d6DropLowest())
  }

  function startStandardArray() {
    setMode('standard_array')
    setAvailableValues([...STANDARD_ARRAY_VALUES])
    onChange({ ...DEFAULT_LOCAL_STATS })
  }

  function startRolledArray() {
    setMode('rolled')
    const rolled = ABILITY_ROWS.map(() => roll4d6DropLowest()).sort((a, b) => b - a)
    setAvailableValues(rolled)
    onChange({ ...DEFAULT_LOCAL_STATS })
  }

  function switchToManual() {
    setMode('manual')
    setAvailableValues([])
  }

  const total   = Object.values(localStats).reduce((s, n) => s + n, 0)
  const average = (total / 6).toFixed(1)
  const needsAssignment = mode !== 'manual' && availableValues.length > 0

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-400">
        Set your character's ability scores. Use the Standard Array, roll 4d6 drop lowest,
        or enter values manually. The array <strong className="text-stone-300">[15, 14, 13, 12, 10, 8]</strong> is
        the most common balanced option.
      </p>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={mode === 'standard_array' ? 'primary' : 'secondary'} onClick={startStandardArray}>
          Standard Array
        </Button>
        <Button size="sm" variant={mode === 'rolled' ? 'primary' : 'secondary'} onClick={startRolledArray}>
          Roll 6 Scores
        </Button>
        <Button size="sm" variant={mode === 'manual' ? 'primary' : 'secondary'} onClick={switchToManual}>
          Manual Entry
        </Button>
      </div>

      {mode !== 'manual' && (
        <div className="rounded-lg border border-amber-800/30 bg-amber-950/10 px-3 py-3">
          <p className="text-xs text-stone-400">
            Assign the generated values to the abilities you want.
            {needsAssignment ? ' Pick a value from the dropdown on each row.' : ' All values assigned.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableValues.length > 0 ? availableValues.map((value, idx) => (
              <span key={`${value}-${idx}`} className="rounded-full border border-amber-700/40 bg-stone-900/70 px-2.5 py-1 text-xs font-mono text-amber-300">
                {value}
              </span>
            )) : (
              <span className="text-xs text-emerald-400 italic">All scores assigned.</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {ABILITY_ROWS.map(({ key, abbr, label }) => {
          const val = localStats[key]
          const mod = abilityMod(val)
          return (
            <div key={key} className="flex items-center gap-3 rounded-lg border border-stone-700/50 bg-stone-900/60 px-3 py-2">
              <span className="w-8 text-xs font-bold text-stone-400 uppercase shrink-0">{abbr}</span>
              <span className="flex-1 text-xs text-stone-500 hidden sm:block">{label}</span>
              {mode === 'manual' ? (
                <>
                  <button
                    onClick={() => rollOne(key)}
                    className="text-[11px] text-stone-500 hover:text-amber-400 active:text-amber-300 transition-colors px-2 py-1 rounded"
                    title="Roll 4d6 drop lowest"
                  >
                    🎲 Roll
                  </button>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={val}
                    onChange={e => setOne(key, parseInt(e.target.value, 10) || 10)}
                    className="w-16 text-center bg-stone-800 border border-stone-600/60 rounded-md text-sm font-bold text-stone-100 py-1.5 tabular-nums"
                  />
                </>
              ) : (
                <select
                  value={val === 10 ? '' : String(val)}
                  onChange={e => assignValue(key, parseInt(e.target.value, 10))}
                  className="w-28 bg-stone-800 border border-stone-600/60 rounded-md text-sm font-bold text-stone-100 py-1.5 px-2"
                >
                  <option value="">Assign…</option>
                  {val !== 10 && <option value={val}>{val} (current)</option>}
                  {availableValues.map((value, idx) => (
                    <option key={`${key}-${value}-${idx}`} value={value}>{value}</option>
                  ))}
                </select>
              )}
              <span className={clsx(
                'w-10 text-center text-sm font-bold tabular-nums shrink-0',
                mod > 0 ? 'text-emerald-400' : mod < 0 ? 'text-red-400' : 'text-stone-400',
              )}>
                {formatMod(mod)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-stone-500">
        <span>Total: <strong className="text-stone-300">{total}</strong></span>
        <span>Average: <strong className="text-stone-300">{average}</strong></span>
      </div>

      {needsAssignment && (
        <p className="text-xs text-amber-500/80 italic">
          Assign all generated values before applying ability scores.
        </p>
      )}

      {applied ? (
        <p className="text-xs text-amber-500/80 italic">✓ Ability scores applied to character.</p>
      ) : (
        <Button size="sm" onClick={onApply} className="self-start" disabled={needsAssignment}>
          Apply Ability Scores
        </Button>
      )}
    </div>
  )
}

// ── HP step ──────────────────────────────────────────────────────────────────

function HpStep({
  hitDie, conMod, fcbBonus, initHp, statsApplied, applied, onApply,
}: {
  hitDie:       number
  conMod:       number
  fcbBonus:     number
  initHp:       number
  statsApplied: boolean
  applied:      boolean
  onApply:      () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-400">
        At level 1, you receive the <strong className="text-stone-200">maximum hit die value</strong> plus
        your Constitution modifier — no rolling required.
        {!statsApplied && (
          <span className="text-amber-500/80"> Apply Ability Scores first for an accurate CON modifier.</span>
        )}
      </p>

      <div className="grid grid-cols-4 gap-3">
        <InfoChip label={`Hit Die`}  value={`d${hitDie}`} />
        <InfoChip label="Max roll"   value={`${hitDie}`}  />
        <InfoChip label="CON Mod"    value={formatMod(conMod)} />
        {fcbBonus > 0 && <InfoChip label="FCB" value={`+${fcbBonus}`} amber />}
        <InfoChip label="Total HP"   value={`${initHp}`}  accent />
      </div>

      <p className="text-xs text-stone-500">
        Formula: max(1, {hitDie} {conMod >= 0 ? '+' : ''}{conMod}){fcbBonus > 0 ? ` + ${fcbBonus} FCB` : ''} = <strong className="text-stone-300">{initHp} HP</strong>
      </p>

      {applied ? (
        <p className="text-xs text-amber-500/80 italic">✓ HP initialized to {initHp} (max and current).</p>
      ) : (
        <Button size="sm" onClick={onApply} className="self-start">
          Set HP to {initHp}
        </Button>
      )}
    </div>
  )
}

// ── BAB & Saves step ─────────────────────────────────────────────────────────

function BabSavesSetupStep({
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
              <InfoChip label={`Level ${1} BAB`} value={formatMod(newBab!)} accent />
            </div>
            {babApplied ? (
              <p className="text-xs text-amber-500/80 italic">✓ BAB updated to {formatMod(newBab!)}.</p>
            ) : (
              <Button size="sm" className="self-start" onClick={onApplyBab}>
                Apply BAB ({formatMod(newBab!)})
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs text-stone-500 italic">
            Progression table unavailable — set BAB manually in the Combat tab after setup.
          </p>
        )}
      </div>

      {/* Saving Throws */}
      <div className="flex flex-col gap-3">
        <SubLabel>Base Saving Throws</SubLabel>
        {hasSaves ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <SaveChip label="Fort" current={currentFort} next={newFort} />
              <SaveChip label="Ref"  current={currentRef}  next={newRef}  />
              <SaveChip label="Will" current={currentWill} next={newWill} />
            </div>
            {savesApplied ? (
              <p className="text-xs text-amber-500/80 italic">✓ Base saving throws applied.</p>
            ) : (
              <Button size="sm" className="self-start" onClick={onApplySaves}>
                Apply Saving Throws
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs text-stone-500 italic">
            Progression table unavailable — set saves manually in the Saves tab after setup.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Class Features step ───────────────────────────────────────────────────────

function FeaturesSetupStep({
  features, level, className,
}: {
  features: Array<{ level?: number; name: string; description: string }>
  level:    number
  className: string
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      {features.length > 0 ? (
        <>
          <p className="text-sm text-stone-400">
            At level {level}, <strong className="text-stone-200">{className}</strong> starts with
            the following class feature{features.length !== 1 ? 's' : ''}:
          </p>
          <div className="flex flex-col gap-2">
            {features.map(f => (
              <div key={f.name} className="rounded-lg border border-stone-700/60 bg-stone-900/60">
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer"
                  onClick={() => setExpanded(expanded === f.name ? null : f.name)}
                >
                  <span className="text-sm font-medium text-stone-200">{f.name}</span>
                  <span className="text-stone-600 text-xs">{expanded === f.name ? '▲' : '▼'}</span>
                </div>
                {expanded === f.name && f.description && (
                  <div className="border-t border-stone-800/60 px-3 py-3">
                    <p className="text-xs text-stone-400 leading-relaxed whitespace-pre-wrap">{f.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500 italic">
            Add relevant class abilities in the Abilities tab after setup.
          </p>
        </>
      ) : (
        <p className="text-sm text-stone-400">
          {className
            ? `No level ${level} features found for ${className} in the reference archive. Check the class description.`
            : 'No class set — set your class in the Overview tab.'}
        </p>
      )}
    </div>
  )
}

// ── Feat step ────────────────────────────────────────────────────────────────

function FeatSetupStep({ level }: { level: number }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-stone-400">
        Level {level} includes a <strong className="text-stone-200">General Feat</strong>.
        Open the <strong className="text-stone-300">Feats</strong> tab after setup to search the
        reference archive and record your chosen feat.
      </p>
      <p className="text-xs text-stone-500 italic">
        In Pathfinder 1e, general feats are gained at levels 1, 3, 5, 7, 9, 11, 13, 15, 17, and 19.
        Some classes provide additional bonus feats — check your class features above.
      </p>
    </div>
  )
}

// ── Spells step ───────────────────────────────────────────────────────────────

function SpellsSetupStep({
  spellsPerDay, castingType, castingStat, level,
}: {
  spellsPerDay: string[] | null
  castingType:  string | null
  castingStat:  string | null
  level:        number
}) {
  const normalizedSpellsPerDay = (spellsPerDay ?? [])
    .map(count => count?.trim?.() ?? count)
    .filter(count => count !== '' && count !== '-' && count !== '—')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {castingType && <InfoChip label="Casting Type" value={castingType} />}
        {castingStat && <InfoChip label="Casting Stat" value={castingStat.toUpperCase()} />}
      </div>

      {normalizedSpellsPerDay.length > 0 ? (
        <div className="flex flex-col gap-2">
          <SubLabel>Spells per Day at Level {level}</SubLabel>
          <div className="flex flex-wrap gap-2">
            {normalizedSpellsPerDay.map((count, idx) => {
              const spellLevel = idx
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 min-w-[48px]"
                >
                  <span className="text-xs text-stone-500 uppercase tracking-wide">L{spellLevel}</span>
                  <span className="text-base font-bold text-stone-200 font-mono">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-400">
          Spell slot table not available for this class at level {level} in the reference archive.
        </p>
      )}

      <p className="text-xs text-stone-500 italic">
        Open the <strong className="text-stone-300">Spells</strong> tab after setup to add your
        starting spells. Bonus spells from high casting stat can be updated there too.
      </p>
    </div>
  )
}

// ── Small atoms ──────────────────────────────────────────────────────────────

function IdentityChip({
  label, value, sub, highlight = false,
}: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</span>
      <span className={clsx(
        'font-bold',
        highlight ? 'text-amber-400 text-2xl font-display' : 'text-stone-100 text-sm',
      )}>
        {value}
        {sub && <span className="ml-1 text-xs text-stone-500 font-normal">({sub})</span>}
      </span>
    </div>
  )
}

function InfoChip({
  label, value, accent = false, amber = false,
}: { label: string; value: string; accent?: boolean; amber?: boolean }) {
  return (
    <div className={clsx(
      'flex flex-col items-center rounded-lg border px-3 py-2',
      amber  ? 'border-amber-700/50 bg-amber-950/20' : 'border-stone-700/60 bg-stone-900/80',
    )}>
      <span className={clsx('text-[10px] uppercase tracking-wide', amber ? 'text-amber-600' : 'text-stone-500')}>
        {label}
      </span>
      <span className={clsx(
        'text-base font-bold font-mono',
        amber || accent ? 'text-amber-300' : 'text-stone-200',
      )}>
        {value}
      </span>
    </div>
  )
}

function SaveChip({ label, current, next }: { label: string; current: number; next: number | null }) {
  const changed = next !== null && next !== current
  return (
    <div className="flex flex-col items-center rounded-lg border border-stone-700/60 bg-stone-900/80 px-3 py-2 gap-1">
      <span className="text-[10px] uppercase tracking-wide text-stone-500">{label}</span>
      <span className="text-sm text-stone-400 font-mono">{formatMod(current)}</span>
      {next !== null && (
        <>
          <span className="text-stone-600 text-xs">↓</span>
          <span className={clsx('text-base font-bold font-mono', changed ? 'text-amber-300' : 'text-stone-400')}>
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
