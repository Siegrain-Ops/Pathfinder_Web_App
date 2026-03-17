import { useState }           from 'react'
import { clsx }               from 'clsx'
import { SectionPanel }       from './SectionPanel'
import { StatInput }          from './StatInput'
import { useCharacterSheet }  from '../../hooks/useCharacterSheet'
import type { FamiliarCombat, FamiliarStatus } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_FAMILIAR_COMBAT: FamiliarCombat = {
  currentHp:    0,
  maxHp:        0,
  ac:           10,
  touchAc:      10,
  flatFootedAc: 10,
  initiative:   0,
  speed:        30,
  perception:   0,
  status:       'active',
  notes:        '',
}

const STATUS_CONFIG: Record<FamiliarStatus, {
  label: string
  dot:   string
  pill:  string
  text:  string
}> = {
  active:      { label: 'Active',      dot: 'bg-emerald-500', pill: 'border-emerald-800/50 bg-emerald-950/30', text: 'text-emerald-300' },
  absent:      { label: 'Absent',      dot: 'bg-stone-500',   pill: 'border-stone-700/50 bg-stone-900/30',    text: 'text-stone-400'   },
  unconscious: { label: 'Unconscious', dot: 'bg-amber-500',   pill: 'border-amber-800/50 bg-amber-950/30',    text: 'text-amber-300'   },
  dead:        { label: 'Dead',        dot: 'bg-red-700',     pill: 'border-red-900/50 bg-red-950/30',        text: 'text-red-500'     },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FamiliarCombatSection() {
  const { data, update } = useCharacterSheet()
  const [notesOpen, setNotesOpen] = useState(false)

  if (!data) return null
  const co = data.classOptions ?? {}

  // Only visible for wizards with a familiar
  if (co.arcaneBondType !== 'familiar') return null

  // Merge saved data with defaults (handles missing fields on old records)
  const fc: FamiliarCombat = { ...DEFAULT_FAMILIAR_COMBAT, ...co.familiarCombat }

  function patchFc(patch: Partial<FamiliarCombat>) {
    update({ classOptions: { ...co, familiarCombat: { ...fc, ...patch } } })
  }

  // ── HP thresholds ──────────────────────────────────────────────────────────
  const hpMax = fc.maxHp
  const hpCur = fc.currentHp
  const hpPct = hpMax > 0 ? Math.max(0, Math.min(100, (hpCur / hpMax) * 100)) : 0
  const hpStatus =
    hpCur <= 0                         ? 'dying'
    : hpCur <= Math.floor(hpMax / 4)   ? 'critical'
    : hpCur <= Math.floor(hpMax / 2)   ? 'bloodied'
    : 'healthy'

  const statusCfg   = STATUS_CONFIG[fc.status]
  const displayName = co.familiarName || co.familiarKind || 'Familiar'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SectionPanel
      title={`Familiar — ${displayName}`}
      action={
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stone-600 uppercase tracking-wide">Status</span>
          <select
            className="text-xs rounded border border-stone-700/60 bg-stone-900 text-stone-300 px-2 py-0.5 focus:outline-none cursor-pointer"
            value={fc.status}
            onChange={e => patchFc({ status: e.target.value as FamiliarStatus })}
          >
            {(Object.keys(STATUS_CONFIG) as FamiliarStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      }
    >

      {/* ── Status pill ─────────────────────────────────────────────────────── */}
      <div className={clsx(
        'flex items-center gap-2.5 rounded-xl border px-4 py-2 mb-5 w-fit transition-colors duration-200',
        statusCfg.pill,
      )}>
        <div className={clsx('h-2.5 w-2.5 rounded-full shrink-0', statusCfg.dot)} />
        <span className={clsx('text-sm font-semibold', statusCfg.text)}>
          {statusCfg.label}
        </span>
        {co.familiarKind && (
          <span className="text-xs text-stone-500 italic">({co.familiarKind})</span>
        )}
      </div>

      {/* ── HP tracker ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-4 mb-5 pb-5 border-b border-stone-800/60">

        {/* Large HP input with ± buttons */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Current HP</span>
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded-lg border border-stone-600 bg-stone-800 text-stone-300 text-lg font-bold
                         hover:bg-red-900/50 hover:border-red-700/60 hover:text-red-300 transition-colors"
              onClick={() => patchFc({ currentHp: Math.max(0, hpCur - 1) })}
            >−</button>
            <input
              type="number"
              value={hpCur}
              onChange={e => patchFc({ currentHp: Math.min(Math.max(0, Number(e.target.value)), hpMax) })}
              className={clsx(
                'w-16 rounded-lg border bg-stone-900 text-center font-bold font-mono text-3xl py-1',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors',
                hpStatus === 'dying'    ? 'border-red-700/70 text-red-400'
                : hpStatus === 'critical' ? 'border-red-600/60 text-red-400'
                : hpStatus === 'bloodied' ? 'border-amber-600/60 text-amber-300'
                : 'border-stone-600/80 text-stone-100',
              )}
            />
            <button
              className="h-8 w-8 rounded-lg border border-stone-600 bg-stone-800 text-stone-300 text-lg font-bold
                         hover:bg-emerald-900/50 hover:border-emerald-700/60 hover:text-emerald-300 transition-colors"
              onClick={() => patchFc({ currentHp: Math.min(hpCur + 1, hpMax) })}
            >+</button>
          </div>

          {/* HP status label */}
          <span className={clsx(
            'text-[10px] font-semibold uppercase tracking-widest',
            hpStatus === 'dying'    ? 'text-red-500'
            : hpStatus === 'critical' ? 'text-red-400'
            : hpStatus === 'bloodied' ? 'text-amber-400'
            : 'text-emerald-500',
          )}>
            {hpStatus === 'dying'     ? '— Dying —'
             : hpStatus === 'critical' ? '⚠ Critical'
             : hpStatus === 'bloodied' ? '◐ Bloodied'
             : '● Healthy'}
          </span>
        </div>

        {/* HP bar + Max HP */}
        <div className="flex-1 min-w-[140px] flex flex-col gap-2 pt-5">
          <div className="flex items-center justify-between text-xs font-mono text-stone-400">
            <span>{hpCur} / {hpMax}</span>
            <span className="text-stone-600 text-[10px]">{Math.round(hpPct)}%</span>
          </div>
          <div className="relative h-2.5 rounded-full bg-stone-800 overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-300',
                hpStatus === 'dying'    ? 'bg-red-700/60'
                : hpStatus === 'critical' ? 'bg-red-500/70'
                : hpStatus === 'bloodied' ? 'bg-amber-500/70'
                : 'bg-emerald-500/70',
              )}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <div className="mt-1">
            <StatInput
              label="Max HP"
              value={fc.maxHp}
              min={0}
              onChange={v => patchFc({ maxHp: v, currentHp: Math.min(hpCur, v) })}
            />
          </div>
        </div>

      </div>

      {/* ── Defenses, movement & perception ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 mb-5 pb-5 border-b border-stone-800/60">
        <StatInput label="AC"          value={fc.ac}           min={0} onChange={v => patchFc({ ac: v })} />
        <StatInput label="Touch AC"    value={fc.touchAc}      min={0} onChange={v => patchFc({ touchAc: v })} />
        <StatInput label="Flat-Ft AC"  value={fc.flatFootedAc} min={0} onChange={v => patchFc({ flatFootedAc: v })} />
        <StatInput label="Initiative"  value={fc.initiative}          onChange={v => patchFc({ initiative: v })} />
        <StatInput label="Speed (ft)"  value={fc.speed}        min={0} onChange={v => patchFc({ speed: v })} />
        <StatInput label="Perception"  value={fc.perception}          onChange={v => patchFc({ perception: v })} />
      </div>

      {/* ── Saving throws (derived from master) ─────────────────────────────── */}
      <div className="flex flex-wrap gap-4 mb-5 pb-5 border-b border-stone-800/60">
        <StatInput label="Fort" value={data.saves.fortitude.total} readOnly onChange={() => {}} />
        <StatInput label="Ref"  value={data.saves.reflex.total}    readOnly onChange={() => {}} />
        <StatInput label="Will" value={data.saves.will.total}      readOnly onChange={() => {}} />
        <p className="flex-1 self-center text-[10px] text-stone-600 italic leading-relaxed">
          Familiar uses the master's save bonuses.<br />
          Values update automatically with the wizard's saves.
        </p>
      </div>

      {/* ── Combat notes ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <button
          className="flex items-center gap-3 w-full text-left"
          onClick={() => setNotesOpen(v => !v)}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 whitespace-nowrap">
            Combat Notes
          </span>
          <div className="flex-1 h-px bg-stone-700/50" />
          <span className="text-[10px] text-stone-600">{notesOpen ? '▲' : '▼'}</span>
        </button>
        {notesOpen && (
          <textarea
            className="field min-h-[60px] resize-y text-sm"
            placeholder="Special abilities, conditions, reminders…"
            value={fc.notes}
            onChange={e => patchFc({ notes: e.target.value })}
          />
        )}
      </div>

    </SectionPanel>
  )
}
