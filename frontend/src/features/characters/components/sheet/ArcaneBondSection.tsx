import { useState }           from 'react'
import { clsx }               from 'clsx'
import { SectionPanel }       from './SectionPanel'
import { Button }             from '@/components/ui/Button'
import { useCharacterSheet }  from '../../hooks/useCharacterSheet'
import type { ClassOptions }  from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BONDED_ITEM_KINDS = [
  'Amulet', 'Ring', 'Staff', 'Wand', 'Sword', 'Dagger', 'Axe', 'Bow', 'Other',
] as const

export type BondedItemKind = typeof BONDED_ITEM_KINDS[number]

export const FAMILIAR_KINDS = [
  'Bat', 'Cat', 'Fox', 'Hawk', 'Lizard', 'Monkey',
  'Owl', 'Rat', 'Raven', 'Snake', 'Toad', 'Weasel', 'Other',
] as const

export type FamiliarKind = typeof FAMILIAR_KINDS[number]

// ---------------------------------------------------------------------------
// Shared prop type used by both sub-panels
// ---------------------------------------------------------------------------

interface PanelProps {
  co:           ClassOptions
  isLocked:     boolean
  lockButton:   React.ReactNode
  patchOptions: (patch: Partial<ClassOptions>) => void
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function ArcaneBondSection() {
  const { data, update } = useCharacterSheet()
  const [isLocked, setIsLocked]   = useState(true)
  const [showRules, setShowRules] = useState(false)

  if (!data) return null
  const d  = data
  const co = d.classOptions ?? {}

  // Guard: only renders for Wizards with an arcane bond configured.
  // CharacterPage already controls tab visibility, but this guard prevents
  // rendering stale content if the class changes without a tab reset.
  if (
    d.className.toLowerCase() !== 'wizard' ||
    (co.arcaneBondType !== 'bonded_item' && co.arcaneBondType !== 'familiar')
  ) {
    return (
      <div className="rounded-xl border border-stone-700/40 bg-stone-900/30 px-4 py-6 text-center">
        <p className="text-sm text-stone-500">
          Arcane Bond is not configured for this character.
          Set it in the <strong className="text-stone-400">Overview</strong> tab under Class Options.
        </p>
      </div>
    )
  }

  function patchOptions(patch: Partial<ClassOptions>) {
    update({ classOptions: { ...co, ...patch } })
  }

  const lockButton = (
    <Button
      variant="ghost" size="sm"
      className={`p-1 ${isLocked ? 'text-amber-400 hover:text-amber-300' : 'text-stone-400 hover:text-stone-200'}`}
      title={isLocked ? 'Unlock fields' : 'Lock fields'}
      onClick={() => setIsLocked(l => !l)}
    >
      {isLocked ? '🔒' : '🔓'}
    </Button>
  )

  const panelProps: PanelProps = { co, isLocked, lockButton, patchOptions }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* ═══ Main panel — switches between bonded item and familiar ══════════ */}
      {co.arcaneBondType === 'bonded_item'
        ? <BondedItemPanel {...panelProps} />
        : <FamiliarPanel   {...panelProps} />
      }

      {/* ═══ Rules reference — content also switches by bond type ═══════════ */}
      <SectionPanel
        title="Rules Reference"
        action={
          <button
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors px-2 py-1"
            onClick={() => setShowRules(v => !v)}
          >
            {showRules ? 'Hide ▲' : 'Show ▼'}
          </button>
        }
      >
        {showRules ? (
          co.arcaneBondType === 'bonded_item'
            ? <BondedItemRules />
            : <FamiliarRules />
        ) : (
          <p className="text-xs text-stone-600 italic">
            Click "Show" for a summary of the arcane bond rules.
          </p>
        )}
      </SectionPanel>

    </div>
  )
}

// ---------------------------------------------------------------------------
// Bonded Item panel
// ---------------------------------------------------------------------------

function BondedItemPanel({ co, isLocked, lockButton, patchOptions }: PanelProps) {
  const usedToday = co.bondedItemUsedToday ?? false

  return (
    <SectionPanel title="Bonded Item" action={lockButton}>
      {isLocked && (
        <p className="text-xs text-amber-400/70 italic mb-3">
          Fields are locked. Click 🔒 to enable editing.
        </p>
      )}

      {/* Identity grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 pb-5 border-b border-stone-800/60">

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Bond Type</span>
          <span className="text-sm font-semibold text-violet-300 py-1">Bonded Item</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Item Type</span>
          {isLocked ? (
            <span className="text-sm font-medium text-stone-200 py-1">
              {co.bondedItemKind || <span className="text-stone-600 italic">Not set</span>}
            </span>
          ) : (
            <select
              className="field text-sm"
              value={co.bondedItemKind ?? ''}
              onChange={e => patchOptions({ bondedItemKind: e.target.value || null })}
            >
              <option value="">— Choose type —</option>
              {BONDED_ITEM_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Item Name</span>
          {isLocked ? (
            <span className="text-sm text-stone-300 py-1">
              {co.bondedItemName || <span className="text-stone-600 italic">No custom name</span>}
            </span>
          ) : (
            <input
              className="field text-sm"
              placeholder="Custom name (optional)"
              value={co.bondedItemName ?? ''}
              onChange={e => patchOptions({ bondedItemName: e.target.value || null })}
            />
          )}
        </div>

      </div>

      {/* ── Daily Spell Tracker ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-5 pb-5 border-b border-stone-800/60">

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 whitespace-nowrap">
            Daily Bonus Spell
          </span>
          <div className="flex-1 h-px bg-stone-700/50" />
        </div>

        <p className="text-xs text-stone-400 leading-relaxed">
          Once per day, you may use your bonded item to cast any one spell from your spellbook,
          even if it is not prepared — as long as you have a spell slot of the appropriate level remaining.
        </p>

        <div className="flex items-center gap-4 flex-wrap">

          <div className={clsx(
            'flex items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-colors duration-200',
            usedToday
              ? 'border-red-800/50 bg-red-950/30'
              : 'border-emerald-800/50 bg-emerald-950/30',
          )}>
            <div className={clsx(
              'h-2.5 w-2.5 rounded-full shrink-0 transition-colors duration-200',
              usedToday ? 'bg-red-500' : 'bg-emerald-500',
            )} />
            <span className={clsx(
              'text-sm font-semibold',
              usedToday ? 'text-red-300' : 'text-emerald-300',
            )}>
              {usedToday ? 'Used Today' : 'Available'}
            </span>
          </div>

          {usedToday ? (
            <Button
              size="sm" variant="secondary"
              onClick={() => patchOptions({ bondedItemUsedToday: false })}
            >
              ↺ New Day (Reset)
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => patchOptions({ bondedItemUsedToday: true })}
            >
              Mark as Used
            </Button>
          )}

        </div>
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 whitespace-nowrap">
            Notes
          </span>
          <div className="flex-1 h-px bg-stone-700/50" />
        </div>
        <textarea
          className="field min-h-[80px] resize-y text-sm"
          placeholder="Describe the item — appearance, magical properties, history…"
          disabled={isLocked}
          value={co.bondedItemNotes ?? ''}
          onChange={e => patchOptions({ bondedItemNotes: e.target.value || null })}
        />
      </div>

    </SectionPanel>
  )
}

// ---------------------------------------------------------------------------
// Familiar panel
// ---------------------------------------------------------------------------

function FamiliarPanel({ co, isLocked, lockButton, patchOptions }: PanelProps) {
  return (
    <SectionPanel title="Familiar" action={lockButton}>
      {isLocked && (
        <p className="text-xs text-amber-400/70 italic mb-3">
          Fields are locked. Click 🔒 to enable editing.
        </p>
      )}

      {/* Identity grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 pb-5 border-b border-stone-800/60">

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Bond Type</span>
          <span className="text-sm font-semibold text-violet-300 py-1">Familiar</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Species</span>
          {isLocked ? (
            <span className="text-sm font-medium text-stone-200 py-1">
              {co.familiarKind || <span className="text-stone-600 italic">Not set</span>}
            </span>
          ) : (
            <select
              className="field text-sm"
              value={co.familiarKind ?? ''}
              onChange={e => patchOptions({ familiarKind: e.target.value || null })}
            >
              <option value="">— Choose species —</option>
              {FAMILIAR_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Name</span>
          {isLocked ? (
            <span className="text-sm text-stone-300 py-1">
              {co.familiarName || <span className="text-stone-600 italic">No name given</span>}
            </span>
          ) : (
            <input
              className="field text-sm"
              placeholder="Familiar's name (optional)"
              value={co.familiarName ?? ''}
              onChange={e => patchOptions({ familiarName: e.target.value || null })}
            />
          )}
        </div>

      </div>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 whitespace-nowrap">
            Notes
          </span>
          <div className="flex-1 h-px bg-stone-700/50" />
        </div>
        <textarea
          className="field min-h-[80px] resize-y text-sm"
          placeholder="Describe the familiar — appearance, personality, history…"
          disabled={isLocked}
          value={co.familiarNotes ?? ''}
          onChange={e => patchOptions({ familiarNotes: e.target.value || null })}
        />
      </div>

    </SectionPanel>
  )
}

// ---------------------------------------------------------------------------
// Rules reference — one variant per bond type
// ---------------------------------------------------------------------------

function BondedItemRules() {
  return (
    <div className="flex flex-col gap-3 text-sm text-stone-400 leading-relaxed">
      <p>
        A wizard can form a powerful bond with an object or a creature. This bond can take one
        of two forms: a <strong className="text-stone-300">familiar</strong> or a{' '}
        <strong className="text-stone-300">bonded object</strong>.
      </p>
      <p>
        A bonded object can be an <em>amulet</em>, <em>ring</em>, <em>staff</em>, <em>wand</em>,
        or <em>weapon</em>. A wizard who chooses a bonded object begins play with one at no cost.
        Objects that are the subject of an arcane bond must fall into one of the above categories.
      </p>
      <p>
        A bonded object can be used once per day to cast any one spell that the wizard has in
        his spellbook and is capable of casting, even if the spell is not prepared. This spell
        is treated like any other spell cast by the wizard, including casting time, duration, and
        other effects dependent on the wizard's level.
      </p>
      <p>
        If a bonded object is a ring or amulet, it occupies the ring or neck slot accordingly.
      </p>
      <p className="text-[11px] text-stone-600 italic border-t border-stone-800/40 pt-2 mt-1">
        Source: Pathfinder 1e Core Rulebook — Wizard class features.
      </p>
    </div>
  )
}

function FamiliarRules() {
  return (
    <div className="flex flex-col gap-3 text-sm text-stone-400 leading-relaxed">
      <p>
        A familiar is an animal chosen by a spellcaster to serve him. The familiar grants
        its master a number of <strong className="text-stone-300">special abilities</strong> that
        depend on the familiar's type.
      </p>
      <p>
        Familiars use their master's base attack bonus and saving throw bonuses if higher.
        A familiar has the same hit points as its master. If a familiar is within 1 mile of its
        master, the master can communicate with it telepathically.
      </p>
      <p>
        If the familiar dies, the wizard suffers{' '}
        <strong className="text-stone-300">5 × wizard level</strong> points of damage (no save).
        A replacement familiar can be obtained after 1 year and 1 day.
      </p>
      <p>
        The wizard and familiar share magic. When the master gains a level, the familiar's
        powers and statistics are recalculated. The familiar can also deliver touch spells on
        behalf of its master.
      </p>
      <p className="text-[11px] text-stone-600 italic border-t border-stone-800/40 pt-2 mt-1">
        Source: Pathfinder 1e Core Rulebook — Wizard class features.
      </p>
    </div>
  )
}
