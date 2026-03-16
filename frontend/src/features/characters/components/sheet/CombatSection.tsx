import { useState, useMemo }    from 'react'
import { clsx }                 from 'clsx'
import { SectionPanel }         from './SectionPanel'
import { StatInput }            from './StatInput'
import { Button }               from '@/components/ui/Button'
import { useCharacterSheet }    from '../../hooks/useCharacterSheet'
import { useReferenceClasses }  from '../../hooks/useReferenceClasses'
import { formatModifier }       from '@/lib/utils/format.utils'
import { EFFECT_PRESETS }       from '../../constants/effectPresets'
import type {
  ActiveEffect, EffectTarget, EffectType, EffectModifier,
  ArmorClass, HitPoints, SpellSection, Spell,
  WeaponEntry, WeaponType,
} from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sum active effect modifiers that cover `t` (including group targets). */
function getBonus(t: EffectTarget, effects: ActiveEffect[]): number {
  return effects
    .filter(e => e.active)
    .flatMap(e => e.modifiers)
    .filter(m => {
      if (m.target === t) return true
      if (m.target === 'all_attacks' && (t === 'melee_attack' || t === 'ranged_attack' || t === 'cmb')) return true
      if (m.target === 'all_saves'   && (t === 'fort' || t === 'ref' || t === 'will')) return true
      if (m.target === 'all_ac'      && (t === 'ac_total' || t === 'ac_touch' || t === 'ac_flat')) return true
      return false
    })
    .reduce((sum, m) => sum + m.value, 0)
}

function iterativeAttacks(meleeBonusEffective: number, bab: number): number[] {
  const atks = [meleeBonusEffective]
  if (bab >= 6)  atks.push(meleeBonusEffective - 5)
  if (bab >= 11) atks.push(meleeBonusEffective - 10)
  if (bab >= 16) atks.push(meleeBonusEffective - 15)
  return atks
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CombatSection() {
  const { data, update }       = useCharacterSheet()
  const { classes }            = useReferenceClasses()

  const [showPresets, setShowPresets]       = useState(false)
  const [showAddForm, setShowAddForm]       = useState(false)
  const [acDetailOpen, setAcDetailOpen]     = useState(false)
  const [presetSearch, setPresetSearch]     = useState('')
  const [showAddWeapon, setShowAddWeapon]   = useState(false)
  const [editingWeaponId, setEditingWeaponId] = useState<string | null>(null)

  if (!data) return null
  const d = data

  const effects: ActiveEffect[] = d.activeEffects ?? []

  // Spellcasting info from reference class
  const refClass = useMemo(
    () => classes.find(c => c.name.toLowerCase() === d.className.toLowerCase()) ?? null,
    [classes, d.className],
  )

  // Caster detection: consider both combat-section override and spells section
  const isCaster =
    !!(refClass?.spellcastingType) ||
    !!(d.combat.casterLevel) ||
    d.spells.casterLevel > 0 ||
    d.spells.spellsPerDay.some(n => n > 0) ||
    d.spells.knownSpells.length > 0

  const castingStat = refClass?.castingStat?.toLowerCase() ?? null
  const castingMod  = castingStat
    ? abilityMod(
        castingStat === 'intelligence' ? d.stats.intelligence.total
      : castingStat === 'wisdom'       ? d.stats.wisdom.total
      : castingStat === 'charisma'     ? d.stats.charisma.total
      : 10,
      )
    : 0
  const casterLevel = d.combat.casterLevel ?? d.level

  // ── Effective values (base + active effect bonuses) ─────────────────────
  const eff = {
    ac:      d.combat.armorClass.total      + getBonus('ac_total',     effects),
    touch:   d.combat.armorClass.touch      + getBonus('ac_touch',     effects),
    flat:    d.combat.armorClass.flatFooted + getBonus('ac_flat',      effects),
    init:    d.combat.initiative            + getBonus('initiative',   effects),
    speed:   d.combat.speed                 + getBonus('speed',        effects),
    melee:   d.combat.meleeAttackBonus      + getBonus('melee_attack', effects),
    ranged:  d.combat.rangedAttackBonus     + getBonus('ranged_attack',effects),
    cmb:     d.combat.cmb                   + getBonus('cmb',          effects),
    cmd:     d.combat.cmd                   + getBonus('cmd',          effects),
    fort:    d.saves.fortitude.total        + getBonus('fort',         effects),
    ref:     d.saves.reflex.total           + getBonus('ref',          effects),
    will:    d.saves.will.total             + getBonus('will',         effects),
    conc:    casterLevel + castingMod + (d.combat.concentrationMisc ?? 0) + getBonus('concentration', effects),
    spellDc: 10 + castingMod + (d.combat.spellDcMisc ?? 0) + getBonus('spell_dc', effects),
  }

  const meleeIt     = iterativeAttacks(eff.melee, d.combat.baseAttackBonus)
  const activeCount = effects.filter(e => e.active).length

  // ── HP thresholds ────────────────────────────────────────────────────────
  const hpMax = d.combat.hitPoints.max
  const hpCur = d.combat.hitPoints.current
  const hpPct = hpMax > 0 ? Math.max(0, Math.min(100, (hpCur / hpMax) * 100)) : 0
  const hpStatus =
    hpCur <= 0                           ? 'dying'
    : hpCur <= Math.floor(hpMax / 4)     ? 'critical'
    : hpCur <= Math.floor(hpMax / 2)     ? 'bloodied'
    : 'healthy'

  // ── Update helpers ──────────────────────────────────────────────────────
  function updateHp(patch: Partial<HitPoints>) {
    update({ combat: { ...d.combat, hitPoints: { ...d.combat.hitPoints, ...patch } } })
  }
  function updateAc(patch: Partial<ArmorClass>) {
    update({ combat: { ...d.combat, armorClass: { ...d.combat.armorClass, ...patch } } })
  }
  function patchCombat<K extends keyof typeof d.combat>(key: K, val: typeof d.combat[K]) {
    update({ combat: { ...d.combat, [key]: val } })
  }

  // ── Effect management ───────────────────────────────────────────────────
  function toggleEffect(id: string) {
    update({ activeEffects: effects.map(e => e.id === id ? { ...e, active: !e.active } : e) })
  }
  function removeEffect(id: string) {
    update({ activeEffects: effects.filter(e => e.id !== id) })
  }
  function applyPreset(preset: (typeof EFFECT_PRESETS)[number]) {
    const existing = effects.find(e => e.name === preset.name)
    if (existing) {
      update({ activeEffects: effects.map(e => e.id === existing.id ? { ...e, active: true } : e) })
    } else {
      const newEffect: ActiveEffect = {
        id:        crypto.randomUUID(),
        name:      preset.name,
        type:      preset.type,
        active:    true,
        duration:  preset.defaultDuration,
        notes:     preset.description,
        modifiers: preset.modifiers,
      }
      update({ activeEffects: [...effects, newEffect] })
    }
    setShowPresets(false)
  }
  function addCustomEffect(effect: Omit<ActiveEffect, 'id'>) {
    update({ activeEffects: [...effects, { ...effect, id: crypto.randomUUID() }] })
    setShowAddForm(false)
  }

  // ── Weapon management ───────────────────────────────────────────────────
  const weapons: WeaponEntry[] = d.combat.weapons ?? []

  function addWeapon(w: Omit<WeaponEntry, 'id'>) {
    update({ combat: { ...d.combat, weapons: [...weapons, { ...w, id: crypto.randomUUID() }] } })
    setShowAddWeapon(false)
  }
  function updateWeapon(id: string, patch: Partial<WeaponEntry>) {
    update({ combat: { ...d.combat, weapons: weapons.map(w => w.id === id ? { ...w, ...patch } : w) } })
  }
  function removeWeapon(id: string) {
    update({ combat: { ...d.combat, weapons: weapons.filter(w => w.id !== id) } })
    if (editingWeaponId === id) setEditingWeaponId(null)
  }

  // ── Spell cast tracking ─────────────────────────────────────────────────
  function patchKnownSpell(id: string, patch: Partial<Spell>) {
    update({
      spells: {
        ...d.spells,
        knownSpells: d.spells.knownSpells.map(s => s.id === id ? { ...s, ...patch } : s),
      },
    })
  }
  function castSpell(id: string) {
    const spell = d.spells.knownSpells.find(s => s.id === id)
    if (!spell) return
    patchKnownSpell(id, { cast: spell.cast + 1 })
  }
  function uncastSpell(id: string) {
    const spell = d.spells.knownSpells.find(s => s.id === id)
    if (!spell || spell.cast <= 0) return
    patchKnownSpell(id, { cast: spell.cast - 1 })
  }
  function resetSpellDay() {
    update({
      spells: {
        ...d.spells,
        knownSpells: d.spells.knownSpells.map(s => ({ ...s, cast: 0 })),
      },
    })
  }

  // ── Combat-relevant skills ──────────────────────────────────────────────
  const COMBAT_SKILL_NAMES = [
    'Perception','Stealth','Acrobatics','Fly','Ride','Swim','Climb',
    'Intimidate','Heal','Spellcraft','Sense Motive','Use Magic Device',
    'Escape Artist','Bluff',
  ]
  const combatSkills = d.skills
    .filter(s => COMBAT_SKILL_NAMES.some(n => s.name.toLowerCase() === n.toLowerCase()))
    .sort((a, b) => b.total - a.total)

  const filteredPresets = presetSearch
    ? EFFECT_PRESETS.filter(p => p.name.toLowerCase().includes(presetSearch.toLowerCase()))
    : EFFECT_PRESETS

  // ── Stat delta rows for effect summary ─────────────────────────────────
  const deltaRows = [
    { label: 'Melee Atk',  base: d.combat.meleeAttackBonus,      effective: eff.melee,  mod: true  },
    { label: 'Ranged Atk', base: d.combat.rangedAttackBonus,     effective: eff.ranged, mod: true  },
    { label: 'AC',         base: d.combat.armorClass.total,      effective: eff.ac,     mod: false },
    { label: 'Touch AC',   base: d.combat.armorClass.touch,      effective: eff.touch,  mod: false },
    { label: 'Flat-Ft',    base: d.combat.armorClass.flatFooted, effective: eff.flat,   mod: false },
    { label: 'Init',       base: d.combat.initiative,            effective: eff.init,   mod: true  },
    { label: 'Fort',       base: d.saves.fortitude.total,        effective: eff.fort,   mod: true  },
    { label: 'Ref',        base: d.saves.reflex.total,           effective: eff.ref,    mod: true  },
    { label: 'Will',       base: d.saves.will.total,             effective: eff.will,   mod: true  },
    { label: 'CMB',        base: d.combat.cmb,                   effective: eff.cmb,    mod: true  },
    { label: 'CMD',        base: d.combat.cmd,                   effective: eff.cmd,    mod: false },
  ].filter(r => r.effective !== r.base)

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* ═══ 1. HP & DEFENSE ════════════════════════════════════════════════ */}
      <SectionPanel title="HP & Defense">

        {/* ── HP Hero row ── */}
        <div className="flex flex-wrap items-start gap-4 mb-5 pb-5 border-b border-stone-800/60">

          {/* Large HP tracker */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Current HP</span>
            <div className="flex items-center gap-2">
              <button
                className="h-9 w-9 rounded-lg border border-stone-600 bg-stone-800 text-stone-300 text-lg font-bold
                           hover:bg-red-900/50 hover:border-red-700/60 hover:text-red-300 transition-colors"
                onClick={() => updateHp({ current: hpCur - 1 })}
              >−</button>
              <div className="relative">
                <input
                  type="number"
                  value={hpCur}
                  onChange={e => updateHp({ current: Number(e.target.value) })}
                  className={clsx(
                    'w-20 rounded-lg border bg-stone-900 text-center font-bold font-mono text-4xl py-1.5',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors',
                    hpStatus === 'dying'    ? 'border-red-700/70 text-red-400'
                    : hpStatus === 'critical' ? 'border-red-600/60 text-red-400'
                    : hpStatus === 'bloodied' ? 'border-amber-600/60 text-amber-300'
                    : 'border-stone-600/80 text-stone-100',
                  )}
                />
                {d.combat.hitPoints.temp > 0 && (
                  <span className="absolute -top-2 -right-3 rounded-full bg-blue-900/80 border border-blue-600/60
                                   px-1.5 py-px text-[9px] font-bold text-blue-300 leading-none whitespace-nowrap">
                    +{d.combat.hitPoints.temp}
                  </span>
                )}
              </div>
              <button
                className="h-9 w-9 rounded-lg border border-stone-600 bg-stone-800 text-stone-300 text-lg font-bold
                           hover:bg-emerald-900/50 hover:border-emerald-700/60 hover:text-emerald-300 transition-colors"
                onClick={() => updateHp({ current: Math.min(hpCur + 1, hpMax) })}
              >+</button>
            </div>
            {/* Status label */}
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

          {/* HP bar + Max / Temp inputs */}
          <div className="flex-1 min-w-[140px] flex flex-col gap-2 pt-5">
            <div className="flex items-center justify-between text-xs font-mono text-stone-400">
              <span>{hpCur} / {hpMax}</span>
              {d.combat.hitPoints.temp > 0 && (
                <span className="text-blue-400 text-[10px]">+{d.combat.hitPoints.temp} temp</span>
              )}
              <span className="text-stone-600 text-[10px]">{Math.round(hpPct)}%</span>
            </div>
            {/* HP bar */}
            <div className="relative h-3 rounded-full bg-stone-800 overflow-hidden">
              {d.combat.hitPoints.temp > 0 && (
                <div
                  className="absolute right-0 h-full bg-blue-600/50 rounded-r-full"
                  style={{ width: `${Math.min(100, (d.combat.hitPoints.temp / Math.max(1, hpMax)) * 100)}%` }}
                />
              )}
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-300',
                  hpStatus === 'dying'    ? 'bg-red-700'
                  : hpStatus === 'critical' ? 'bg-red-500'
                  : hpStatus === 'bloodied' ? 'bg-amber-500'
                  : 'bg-emerald-500',
                )}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <div className="flex gap-3">
              <StatInput label="Max HP"  value={d.combat.hitPoints.max}  onChange={v => updateHp({ max: v })}  min={0} />
              <StatInput label="Temp HP" value={d.combat.hitPoints.temp} onChange={v => updateHp({ temp: v })} min={0} />
            </div>
          </div>
        </div>

        {/* ── Quick-reference number row ── */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
          <QuickStat label="AC"         value={eff.ac}    delta={eff.ac    - d.combat.armorClass.total}      accent />
          <QuickStat label="Touch AC"   value={eff.touch} delta={eff.touch - d.combat.armorClass.touch}  />
          <QuickStat label="Flat-Ft"    value={eff.flat}  delta={eff.flat  - d.combat.armorClass.flatFooted} />
          <QuickStat label="Initiative" value={eff.init}  delta={eff.init  - d.combat.initiative}            fmt="mod" />
          <QuickStat label="Speed"      value={eff.speed} delta={eff.speed - d.combat.speed}                 unit=" ft" />
          <QuickStat label="CMD"        value={eff.cmd}   delta={eff.cmd   - d.combat.cmd}                  />
        </div>

        {/* ── Speed + DR inline ── */}
        <div className="flex flex-wrap gap-4 mb-4">
          <StatInput
            label="Speed (ft)"
            value={d.combat.speed}
            onChange={v => patchCombat('speed', v)}
            min={0}
          />
          <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">DR / Resistances / Immunities</span>
            <input
              className="field text-sm"
              placeholder='e.g. DR 5/cold iron, Fire resist 10'
              value={d.combat.drNote ?? ''}
              onChange={e => patchCombat('drNote', e.target.value)}
            />
          </label>
        </div>

        {/* ── AC breakdown (collapsible) ── */}
        <div>
          <button
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-stone-500 hover:text-stone-300 mb-2 transition-colors"
            onClick={() => setAcDetailOpen(v => !v)}
          >
            <span>AC Breakdown</span>
            <span>{acDetailOpen ? '▲' : '▼'}</span>
          </button>
          {acDetailOpen && (
            <div className="flex flex-wrap gap-4 pt-2 border-t border-stone-800/60">
              <StatInput label="Armor"      value={d.combat.armorClass.armorBonus}      onChange={v => updateAc({ armorBonus: v })}      min={0} />
              <StatInput label="Shield"     value={d.combat.armorClass.shieldBonus}     onChange={v => updateAc({ shieldBonus: v })}     min={0} />
              <StatInput label="Natural"    value={d.combat.armorClass.naturalArmor}    onChange={v => updateAc({ naturalArmor: v })}    min={0} />
              <StatInput label="Deflection" value={d.combat.armorClass.deflectionBonus} onChange={v => updateAc({ deflectionBonus: v })} min={0} />
              <StatInput label="Misc"       value={d.combat.armorClass.miscBonus}       onChange={v => updateAc({ miscBonus: v })} />
              <StatInput label="DEX (auto)" value={d.combat.armorClass.dexBonus}        onChange={() => {}} readOnly />
            </div>
          )}
        </div>
      </SectionPanel>

      {/* ═══ 2. OFFENSE ═════════════════════════════════════════════════════ */}
      <SectionPanel
        title="Offense"
        action={
          <Button size="sm" variant={showAddWeapon ? 'primary' : 'ghost'}
            onClick={() => { setShowAddWeapon(v => !v); setEditingWeaponId(null) }}
          >
            + Weapon
          </Button>
        }
      >
        {/* ── Base attack stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">

          {/* Melee with iteratives */}
          <div className="flex flex-col items-center gap-1 rounded-xl border border-stone-700/60 bg-stone-900/80 py-3 px-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Melee Atk</span>
            <div className="flex flex-wrap justify-center items-baseline gap-px">
              {meleeIt.map((v, i) => (
                <span key={i} className="flex items-center gap-px">
                  {i > 0 && <span className="text-stone-600 text-xs mx-0.5">/</span>}
                  <span className={clsx(
                    'font-bold font-mono',
                    i === 0 ? 'text-2xl text-stone-100' : 'text-sm text-stone-400',
                  )}>
                    {formatModifier(v)}
                  </span>
                </span>
              ))}
            </div>
            {getBonus('melee_attack', effects) !== 0 && (
              <DeltaBadge delta={getBonus('melee_attack', effects)} small />
            )}
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-stone-700/60 bg-stone-900/80 py-3 px-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Ranged Atk</span>
            <span className="text-2xl font-bold font-mono text-stone-100">{formatModifier(eff.ranged)}</span>
            {getBonus('ranged_attack', effects) !== 0 && <DeltaBadge delta={getBonus('ranged_attack', effects)} small />}
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-stone-700/60 bg-stone-900/80 py-3 px-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">CMB</span>
            <span className="text-2xl font-bold font-mono text-stone-100">{formatModifier(eff.cmb)}</span>
            {getBonus('cmb', effects) !== 0 && <DeltaBadge delta={getBonus('cmb', effects)} small />}
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-amber-800/30 bg-amber-950/10 py-3 px-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">BAB</span>
            <span className="text-2xl font-bold font-mono text-amber-300">
              {formatModifier(d.combat.baseAttackBonus)}
            </span>
            <button
              className="text-[9px] text-stone-600 hover:text-stone-400 transition-colors leading-none"
              onClick={() => {
                const val = window.prompt('Base Attack Bonus', String(d.combat.baseAttackBonus))
                if (val !== null && !isNaN(Number(val))) patchCombat('baseAttackBonus', Number(val))
              }}
            >
              edit
            </button>
          </div>
        </div>

        {/* ── Weapon list ── */}
        {weapons.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {weapons.map(weapon => (
              <WeaponCard
                key={weapon.id}
                weapon={weapon}
                effectiveBase={weapon.type === 'melee' ? eff.melee : eff.ranged}
                bab={d.combat.baseAttackBonus}
                isEditing={editingWeaponId === weapon.id}
                onEdit={() => setEditingWeaponId(id => id === weapon.id ? null : weapon.id)}
                onUpdate={patch => updateWeapon(weapon.id, patch)}
                onRemove={() => removeWeapon(weapon.id)}
              />
            ))}
          </div>
        )}

        {weapons.length === 0 && !showAddWeapon && (
          <p className="text-xs text-stone-600 italic text-center py-1 mb-3">
            No weapons — use <strong className="text-stone-500">+ Weapon</strong> to add one.
          </p>
        )}

        {/* ── Add weapon form ── */}
        {showAddWeapon && (
          <AddWeaponForm
            onAdd={addWeapon}
            onClose={() => setShowAddWeapon(false)}
          />
        )}

        {/* ── Misc fields ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-stone-800/50">
          <StatInput
            label="Initiative Misc"
            value={d.combat.initiativeMiscBonus}
            onChange={v => patchCombat('initiativeMiscBonus', v)}
          />
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">General notes (damage / crit)</span>
            <input
              className="field text-sm"
              placeholder='e.g. 1d8+4 / 19–20 ×2'
              value={d.combat.damageNote ?? ''}
              onChange={e => patchCombat('damageNote', e.target.value)}
            />
          </label>
        </div>
      </SectionPanel>

      {/* ═══ 3. SAVING THROWS ════════════════════════════════════════════════ */}
      <SectionPanel title="Saving Throws">
        <div className="grid grid-cols-3 gap-3 mb-2">
          {([
            { label: 'Fortitude', key: 'fort' as const, base: d.saves.fortitude.total, stat: 'CON' },
            { label: 'Reflex',    key: 'ref'  as const, base: d.saves.reflex.total,    stat: 'DEX' },
            { label: 'Will',      key: 'will' as const, base: d.saves.will.total,       stat: 'WIS' },
          ]).map(({ label, key, base, stat }) => {
            const delta     = getBonus(key, effects)
            const effective = base + delta
            return (
              <div key={key} className="flex flex-col items-center gap-1 rounded-xl border border-stone-700/60 bg-stone-900/80 py-3 px-2">
                <span className={clsx(
                  'text-2xl font-bold font-mono',
                  delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-amber-300',
                )}>
                  {formatModifier(effective)}
                </span>
                {delta !== 0 && <DeltaBadge delta={delta} small />}
                <span className="text-[10px] uppercase tracking-wide text-stone-400">{label}</span>
                <span className="text-[9px] text-stone-600">{stat}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-stone-600 text-center italic">
          Edit base save values in the Saves tab.
        </p>
      </SectionPanel>

      {/* ═══ 4. COMBAT SKILLS ════════════════════════════════════════════════ */}
      {combatSkills.length > 0 && (
        <SectionPanel title="Combat Skills">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-0">
            {combatSkills.map(skill => (
              <div key={skill.id} className="flex items-center justify-between py-1.5 border-b border-stone-800/40">
                <span className="text-xs text-stone-400">{skill.name}</span>
                <span className={clsx(
                  'text-sm font-bold font-mono',
                  skill.total >= 10 ? 'text-amber-300' :
                  skill.total >= 5  ? 'text-stone-200' : 'text-stone-500',
                )}>
                  {formatModifier(skill.total)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-stone-600 mt-2 italic">Edit ranks in the Skills tab.</p>
        </SectionPanel>
      )}

      {/* ═══ 5. SPELLCASTING IN COMBAT ══════════════════════════════════════ */}
      {isCaster && (
        <SectionPanel title="Spellcasting in Combat">

          {/* ── Key stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="flex flex-col gap-1 items-center rounded-xl border border-stone-700/60 bg-stone-900/80 py-3 px-2">
              <span className="text-2xl font-bold font-mono text-amber-300">{formatModifier(eff.conc)}</span>
              <span className="text-[10px] uppercase tracking-wide text-stone-500">Concentration</span>
              <span className="text-[9px] text-stone-600">
                CL {casterLevel} + {castingStat?.toUpperCase() ?? '?'} {formatModifier(castingMod)}
              </span>
            </div>
            <div className="flex flex-col gap-1 items-center rounded-xl border border-stone-700/60 bg-stone-900/80 py-3 px-2">
              <span className="text-2xl font-bold font-mono text-stone-100">{casterLevel}</span>
              <span className="text-[10px] uppercase tracking-wide text-stone-500">Caster Level</span>
            </div>
            <div className="flex flex-col gap-1 items-center rounded-xl border border-stone-700/60 bg-stone-900/80 py-3 px-2">
              <span className="text-2xl font-bold font-mono text-stone-100">{eff.spellDc}</span>
              <span className="text-[10px] uppercase tracking-wide text-stone-500">Base Spell DC</span>
              <span className="text-[9px] text-stone-600">
                10 + {castingStat?.toUpperCase() ?? '?'} {formatModifier(castingMod)} + SL
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <StatInput label="CL Override" value={d.combat.casterLevel ?? d.level}       onChange={v => patchCombat('casterLevel', v)}          min={0} />
              <StatInput label="Conc Misc"   value={d.combat.concentrationMisc ?? 0}        onChange={v => patchCombat('concentrationMisc', v)} />
            </div>
          </div>

          {/* ── Spell combat panel ── */}
          <SpellCombatPanel
            spells={d.spells}
            baseDc={eff.spellDc}
            onCast={castSpell}
            onUncast={uncastSpell}
            onResetDay={resetSpellDay}
          />

          {/* ── Notes ── */}
          <label className="flex flex-col gap-1 mt-4">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Spellcasting Notes</span>
            <textarea
              className="field min-h-[60px] resize-y text-sm"
              placeholder='e.g. "Cast defensively: Concentration DC 15+SL", SR to overcome, etc.'
              value={d.combat.spellcastingNotes ?? ''}
              onChange={e => patchCombat('spellcastingNotes', e.target.value)}
            />
          </label>
        </SectionPanel>
      )}

      {/* ═══ 6. ACTIVE EFFECTS ══════════════════════════════════════════════ */}
      <SectionPanel
        title="Active Effects"
        action={
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <span className="rounded-full bg-amber-500/20 border border-amber-600/40 px-2 py-px text-xs text-amber-400 font-bold">
                {activeCount}
              </span>
            )}
            <Button
              size="sm"
              variant={showPresets ? 'primary' : 'secondary'}
              onClick={() => { setShowPresets(v => !v); setShowAddForm(false) }}
            >
              Presets
            </Button>
            <Button
              size="sm"
              variant={showAddForm ? 'primary' : 'ghost'}
              onClick={() => { setShowAddForm(v => !v); setShowPresets(false) }}
            >
              + Custom
            </Button>
          </div>
        }
      >
        {/* Stat-delta summary (only when effects are active) */}
        {deltaRows.length > 0 && (
          <div className="rounded-lg border border-stone-700/40 bg-stone-950/40 px-3 py-2 mb-4">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1.5">Effect Summary</span>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {deltaRows.map(({ label, base, effective, mod }) => {
                const delta = effective - base
                const fmt = (n: number) => mod ? formatModifier(n) : String(n)
                return (
                  <div key={label} className="flex items-center gap-1.5 text-xs">
                    <span className="text-stone-500">{label}</span>
                    <span className="font-mono text-stone-400">{fmt(base)}</span>
                    <span className="text-stone-600">→</span>
                    <span className={clsx('font-bold font-mono', delta > 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {fmt(effective)}
                    </span>
                    <DeltaBadge delta={delta} small />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Effect chips */}
        {effects.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {effects.map(effect => (
              <EffectChip
                key={effect.id}
                effect={effect}
                onToggle={() => toggleEffect(effect.id)}
                onRemove={() => removeEffect(effect.id)}
              />
            ))}
          </div>
        )}

        {effects.length === 0 && !showPresets && !showAddForm && (
          <p className="text-sm text-stone-500 italic text-center py-4">
            No effects active. Use <strong className="text-stone-400">Presets</strong> for common conditions
            or <strong className="text-stone-400">+ Custom</strong> for anything else.
          </p>
        )}

        {/* Preset grid */}
        {showPresets && (
          <div className="mt-2 rounded-xl border border-stone-700/60 bg-stone-950/50 p-3">
            <div className="flex items-center justify-between mb-3 gap-3">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Common PF1e Conditions & Spells
              </span>
              <input
                className="field w-36 text-xs py-1"
                placeholder="Filter…"
                value={presetSearch}
                onChange={e => setPresetSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredPresets.map(preset => {
                const alreadyActive = effects.some(e => e.name === preset.name && e.active)
                return (
                  <button
                    key={preset.name}
                    className={clsx(
                      'flex flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-all duration-150 hover:bg-stone-800/40',
                      alreadyActive
                        ? 'border-amber-600/50 bg-amber-950/20'
                        : preset.color === 'green'  ? 'border-emerald-800/40 bg-emerald-950/10 hover:border-emerald-700/60'
                        : preset.color === 'red'    ? 'border-red-800/40 bg-red-950/10 hover:border-red-700/60'
                        : preset.color === 'yellow' ? 'border-yellow-800/40 bg-yellow-950/10 hover:border-yellow-700/60'
                        : preset.color === 'blue'   ? 'border-blue-800/40 bg-blue-950/10 hover:border-blue-700/60'
                        : preset.color === 'purple' ? 'border-purple-800/40 bg-purple-950/10 hover:border-purple-700/60'
                        : 'border-stone-700/40',
                    )}
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-stone-200">{preset.name}</span>
                      <TypeBadge type={preset.type} />
                      {alreadyActive && (
                        <span className="text-[9px] text-amber-500 ml-auto">Active</span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </span>
                    {preset.defaultDuration && (
                      <span className="text-[9px] text-stone-600 italic">{preset.defaultDuration}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Add custom form */}
        {showAddForm && (
          <AddEffectForm onAdd={addCustomEffect} onClose={() => setShowAddForm(false)} />
        )}
      </SectionPanel>

    </div>
  )
}

// ---------------------------------------------------------------------------
// SpellCombatPanel – slot overview + interactive spell list
// ---------------------------------------------------------------------------

const SCHOOL_ABBR: Record<Spell['school'], string> = {
  abjuration:    'Abj', conjuration: 'Con', divination:   'Div',
  enchantment:   'Enc', evocation:   'Evo', illusion:     'Ill',
  necromancy:    'Nec', transmutation:'Trs', universal:   'Uni',
}
const SCHOOL_COLOR: Record<Spell['school'], string> = {
  abjuration:    'text-blue-400   border-blue-800/40   bg-blue-950/20',
  conjuration:   'text-emerald-400 border-emerald-800/40 bg-emerald-950/20',
  divination:    'text-sky-400    border-sky-800/40    bg-sky-950/20',
  enchantment:   'text-pink-400   border-pink-800/40   bg-pink-950/20',
  evocation:     'text-red-400    border-red-800/40    bg-red-950/20',
  illusion:      'text-purple-400 border-purple-800/40 bg-purple-950/20',
  necromancy:    'text-stone-400  border-stone-700/40  bg-stone-900/40',
  transmutation: 'text-amber-400  border-amber-800/40  bg-amber-950/20',
  universal:     'text-stone-300  border-stone-700/40  bg-stone-900/30',
}

function SpellCombatPanel({
  spells, baseDc, onCast, onUncast, onResetDay,
}: {
  spells:      SpellSection
  baseDc:      number
  onCast:      (id: string) => void
  onUncast:    (id: string) => void
  onResetDay:  () => void
}) {
  const ALL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const

  // Levels that are meaningful to show: has spells OR has slots
  const visibleLevels = ALL_LEVELS.filter(lvl =>
    spells.knownSpells.some(s => s.level === lvl) ||
    (lvl > 0 && spells.spellsPerDay[lvl] > 0),
  )

  const [activeLevel, setActiveLevel] = useState<number>(() =>
    visibleLevels.find(l => l > 0) ?? visibleLevels[0] ?? 1,
  )

  // Keep activeLevel valid if spells change
  const safeLevel = (visibleLevels as number[]).includes(activeLevel) ? activeLevel : (visibleLevels[0] ?? 0)

  if (visibleLevels.length === 0) {
    return (
      <div className="rounded-lg border border-stone-800/40 bg-stone-950/30 px-3 py-2.5">
        <span className="text-[10px] text-stone-600 italic">
          No spells — add them in the Spells tab.
        </span>
      </div>
    )
  }

  // Per-level slot data
  function slotData(lvl: number) {
    const total     = lvl === 0 ? Infinity : spells.spellsPerDay[lvl]
    const castCount = spells.knownSpells
      .filter(s => s.level === lvl)
      .reduce((sum, s) => sum + (s.cast ?? 0), 0)
    const remaining = lvl === 0 ? Infinity : Math.max(0, total - castCount)
    return { total, castCount, remaining }
  }

  const spellsAtLevel = spells.knownSpells.filter(s => s.level === safeLevel)
  const { total: slotTotal, remaining: slotRemaining } = slotData(safeLevel)
  const isLevelEmpty  = slotTotal !== Infinity && slotRemaining === 0
  const isLevelLow    = slotTotal !== Infinity && !isLevelEmpty && slotRemaining <= Math.ceil(slotTotal / 3)
  const anySpellCast  = spells.knownSpells.some(s => s.cast > 0)

  const levelDc = safeLevel === 0 ? null : baseDc + safeLevel

  return (
    <div className="rounded-xl border border-violet-900/30 bg-stone-950/40 overflow-hidden">

      {/* ── Level tab strip ── */}
      <div className="flex items-stretch border-b border-stone-800/60 overflow-x-auto">
        {visibleLevels.map(lvl => {
          const { total, remaining } = slotData(lvl)
          const isEmpty  = total !== Infinity && remaining === 0
          const isLow    = total !== Infinity && !isEmpty && remaining <= Math.ceil(total / 3)
          const isActive = lvl === safeLevel
          return (
            <button
              key={lvl}
              onClick={() => setActiveLevel(lvl)}
              className={clsx(
                'flex flex-col items-center px-3 py-2 text-center transition-colors shrink-0 min-w-[44px]',
                'border-b-2 -mb-px',
                isActive
                  ? 'border-amber-500 bg-stone-900/60'
                  : 'border-transparent hover:bg-stone-800/40',
              )}
            >
              <span className={clsx(
                'text-[10px] font-semibold uppercase tracking-wide leading-none mb-1',
                isActive ? 'text-amber-300' : 'text-stone-500',
              )}>
                {lvl === 0 ? 'C' : lvl}
              </span>
              {lvl === 0 ? (
                <span className="text-[9px] text-stone-600">∞</span>
              ) : (
                <span className={clsx(
                  'text-[10px] font-mono font-bold leading-none',
                  isEmpty ? 'text-red-500' : isLow ? 'text-amber-400' : 'text-stone-300',
                )}>
                  {remaining}/{total}
                </span>
              )}
            </button>
          )
        })}
        {/* Reset Day button — right side */}
        <div className="flex-1" />
        {anySpellCast && (
          <button
            onClick={onResetDay}
            className="px-3 py-2 text-[10px] text-stone-600 hover:text-amber-400 transition-colors shrink-0 whitespace-nowrap"
            title="Reset all cast counts to 0"
          >
            Reset Day
          </button>
        )}
      </div>

      {/* ── Level header ── */}
      <div className="flex items-center gap-3 px-3 pt-2.5 pb-2 border-b border-stone-800/40">
        <span className="text-xs font-semibold text-stone-400">
          {safeLevel === 0 ? 'Cantrips' : `Level ${safeLevel} Spells`}
        </span>
        {safeLevel > 0 && levelDc !== null && (
          <span className="text-[10px] text-stone-600">
            Save DC <span className="text-stone-400 font-mono font-semibold">{levelDc}</span>
          </span>
        )}
        {safeLevel > 0 && (
          <span className={clsx(
            'ml-auto text-xs font-mono font-bold',
            isLevelEmpty ? 'text-red-500' : isLevelLow ? 'text-amber-400' : 'text-stone-300',
          )}>
            {slotRemaining === Infinity ? '∞' : slotRemaining}
            <span className="text-stone-600 font-normal text-[10px]">/{slotTotal}</span>
            {' '}slots
          </span>
        )}
      </div>

      {/* ── Spell list ── */}
      <div className="divide-y divide-stone-800/40">
        {spellsAtLevel.length === 0 && (
          <p className="px-3 py-4 text-xs text-stone-600 italic text-center">
            No {safeLevel === 0 ? 'cantrips' : `level ${safeLevel} spells`} — add them in the Spells tab.
          </p>
        )}
        {spellsAtLevel.map(spell => {
          const isCantrip   = spell.level === 0
          const slotsLeft   = isCantrip ? Infinity : slotRemaining
          // For prepared casters: can't cast same spell more times than prepared (if prepared > 0)
          const prepLimit   = spell.prepared > 0 ? spell.prepared : Infinity
          const canCast     = slotsLeft > 0 && spell.cast < prepLimit
          const fullySpent  = !isCantrip && (slotsLeft === 0 || spell.cast >= prepLimit)

          return (
            <div
              key={spell.id}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 transition-colors',
                fullySpent ? 'opacity-50' : 'hover:bg-stone-800/20',
              )}
            >
              {/* School badge */}
              <span className={clsx(
                'shrink-0 rounded border px-1 py-px text-[9px] font-semibold uppercase tracking-wide',
                SCHOOL_COLOR[spell.school],
              )}>
                {SCHOOL_ABBR[spell.school]}
              </span>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={clsx(
                    'text-sm font-medium truncate',
                    fullySpent ? 'text-stone-600 line-through' : 'text-stone-200',
                  )}>
                    {spell.name || <span className="italic">Unnamed Spell</span>}
                  </span>
                  {spell.prepared > 0 && (
                    <span className="text-[10px] text-stone-600 shrink-0">
                      {spell.cast}/{spell.prepared} prep
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {spell.castingTime && (
                    <span className="text-[10px] text-stone-500">{spell.castingTime}</span>
                  )}
                  {spell.range && (
                    <span className="text-[10px] text-stone-600">· {spell.range}</span>
                  )}
                  {spell.savingThrow && (
                    <span className="text-[10px] text-stone-600">· {spell.savingThrow}</span>
                  )}
                  {spell.cast > 0 && (
                    <span className="text-[10px] text-violet-400/80 ml-auto">
                      cast {spell.cast}×
                    </span>
                  )}
                </div>
              </div>

              {/* Undo cast */}
              {spell.cast > 0 && (
                <button
                  onClick={() => onUncast(spell.id)}
                  className="shrink-0 h-6 w-6 rounded border border-stone-700/60 bg-stone-800/60
                             text-stone-500 hover:text-stone-300 hover:border-stone-600
                             text-xs font-bold transition-colors"
                  title="Undo last cast"
                >
                  −
                </button>
              )}

              {/* Cast button */}
              <button
                onClick={() => canCast && onCast(spell.id)}
                disabled={!canCast}
                className={clsx(
                  'shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors',
                  canCast
                    ? isCantrip
                      ? 'border-stone-600/60 bg-stone-800/60 text-stone-300 hover:bg-stone-700/60 hover:text-stone-100'
                      : 'border-violet-700/60 bg-violet-950/40 text-violet-300 hover:bg-violet-900/50 hover:text-violet-100'
                    : 'border-stone-800/40 bg-transparent text-stone-700 cursor-not-allowed',
                )}
              >
                {isCantrip ? 'Cast' : slotsLeft === 0 ? 'No slots' : 'Cast'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EffectChip
// ---------------------------------------------------------------------------

function EffectChip({
  effect, onToggle, onRemove,
}: { effect: ActiveEffect; onToggle: () => void; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false)

  const borderColorActive =
    effect.type === 'buff'      ? 'border-emerald-700/50 bg-emerald-950/20'
  : effect.type === 'debuff'    ? 'border-red-700/50 bg-red-950/20'
  : effect.type === 'condition' ? 'border-yellow-700/50 bg-yellow-950/20'
  : 'border-blue-700/50 bg-blue-950/20'

  const dotColorActive =
    effect.type === 'buff'      ? 'border-emerald-500 bg-emerald-500'
  : effect.type === 'debuff'    ? 'border-red-500 bg-red-500'
  : effect.type === 'condition' ? 'border-yellow-500 bg-yellow-500'
  : 'border-blue-500 bg-blue-500'

  return (
    <div className={clsx(
      'rounded-lg border transition-all duration-150',
      effect.active ? borderColorActive : 'border-stone-700/30 bg-stone-900/30 opacity-50',
    )}>
      <div className="flex items-center gap-2 px-3 py-2">
        {/* On/off toggle dot */}
        <button
          className={clsx(
            'h-4 w-4 rounded-full border-2 shrink-0 transition-colors duration-150',
            effect.active ? dotColorActive : 'border-stone-600 bg-transparent',
          )}
          title={effect.active ? 'Disable effect' : 'Enable effect'}
          onClick={onToggle}
        />

        {/* Name + badges */}
        <button
          className="flex-1 flex flex-wrap items-center gap-2 text-left min-w-0"
          onClick={() => setExpanded(v => !v)}
        >
          <span className={clsx('text-xs font-medium truncate', effect.active ? 'text-stone-200' : 'text-stone-500')}>
            {effect.name}
          </span>
          <TypeBadge type={effect.type} />
          {effect.duration && (
            <span className="text-[10px] text-stone-600 italic shrink-0">{effect.duration}</span>
          )}
          {effect.modifiers.length > 0 && (
            <span className="text-[10px] text-stone-600 shrink-0 ml-auto hidden sm:block">
              {effect.modifiers.slice(0, 3).map(m => `${m.value >= 0 ? '+' : ''}${m.value} ${m.target.replace(/_/g,' ')}`).join(' · ')}
              {effect.modifiers.length > 3 ? ` +${effect.modifiers.length - 3} more` : ''}
            </span>
          )}
        </button>

        <button
          className="text-stone-600 hover:text-red-400 transition-colors px-1 text-sm leading-none shrink-0"
          title="Remove"
          onClick={onRemove}
        >
          ×
        </button>
      </div>

      {expanded && (
        <div className="border-t border-stone-700/40 px-3 py-2 text-[10px] text-stone-500 space-y-0.5">
          {effect.source && <p><span className="text-stone-600">Source:</span> {effect.source}</p>}
          {effect.notes  && <p className="italic">{effect.notes}</p>}
          {effect.modifiers.map((m, i) => (
            <p key={i} className="font-mono">
              <span className={clsx('font-bold', m.value >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {m.value >= 0 ? '+' : ''}{m.value}
              </span>
              {' '}{m.bonusType ? <span className="text-stone-600">[{m.bonusType}]</span> : ''}
              {' '}{m.target.replace(/_/g, ' ')}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add custom effect form
// ---------------------------------------------------------------------------

const ALL_TARGETS: EffectTarget[] = [
  'melee_attack','ranged_attack','all_attacks','cmb','cmd',
  'ac_total','ac_touch','ac_flat','all_ac',
  'initiative','speed',
  'fort','ref','will','all_saves',
  'concentration','spell_dc',
]

function AddEffectForm({
  onAdd, onClose,
}: { onAdd: (e: Omit<ActiveEffect, 'id'>) => void; onClose: () => void }) {
  const [name,      setName]      = useState('')
  const [type,      setType]      = useState<EffectType>('buff')
  const [duration,  setDuration]  = useState('')
  const [source,    setSource]    = useState('')
  const [notes,     setNotes]     = useState('')
  const [modifiers, setModifiers] = useState<EffectModifier[]>([
    { target: 'all_attacks', value: 0 },
  ])

  function updateMod(idx: number, patch: Partial<EffectModifier>) {
    setModifiers(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }

  function submit() {
    if (!name.trim()) return
    onAdd({
      name:      name.trim(),
      type,
      active:    true,
      duration:  duration || undefined,
      source:    source   || undefined,
      notes:     notes    || undefined,
      modifiers: modifiers.filter(m => m.value !== 0),
    })
  }

  return (
    <div className="mt-2 rounded-xl border border-stone-700/60 bg-stone-950/50 p-4">
      <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3 block">
        Add Custom Effect
      </span>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Name *</span>
          <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Effect name" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Type</span>
          <select className="field" value={type} onChange={e => setType(e.target.value as EffectType)}>
            <option value="buff">Buff</option>
            <option value="debuff">Debuff</option>
            <option value="condition">Condition</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Duration</span>
          <input className="field" value={duration} onChange={e => setDuration(e.target.value)} placeholder="3 rounds, 1 min/level…" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Source</span>
          <input className="field" value={source} onChange={e => setSource(e.target.value)} placeholder="Spell, ability…" />
        </label>
        <label className="flex flex-col gap-1 col-span-2">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Notes</span>
          <input className="field" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes…" />
        </label>
      </div>

      {/* Modifier list */}
      <div className="mb-3">
        <span className="text-[10px] uppercase tracking-wide text-stone-500 block mb-2">
          Stat Modifiers
        </span>
        <div className="flex flex-col gap-2">
          {modifiers.map((mod, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                className="field flex-1 text-xs"
                value={mod.target}
                onChange={e => updateMod(idx, { target: e.target.value as EffectTarget })}
              >
                {ALL_TARGETS.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <input
                type="number"
                className="w-16 rounded-md border border-stone-600/80 bg-stone-900 text-center text-sm
                           text-stone-100 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                value={mod.value}
                onChange={e => updateMod(idx, { value: Number(e.target.value) })}
              />
              <button
                className="text-stone-600 hover:text-red-400 transition-colors text-sm px-1"
                onClick={() => setModifiers(prev => prev.filter((_, i) => i !== idx))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          className="mt-2 text-xs text-stone-500 hover:text-stone-300 transition-colors"
          onClick={() => setModifiers(prev => [...prev, { target: 'all_attacks', value: 0 }])}
        >
          + Add modifier
        </button>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={!name.trim()}>Add Effect</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// WeaponCard
// ---------------------------------------------------------------------------

function WeaponCard({
  weapon, effectiveBase, bab, isEditing, onEdit, onUpdate, onRemove,
}: {
  weapon:        WeaponEntry
  effectiveBase: number   // eff.melee or eff.ranged
  bab:           number
  isEditing:     boolean
  onEdit:        () => void
  onUpdate:      (patch: Partial<WeaponEntry>) => void
  onRemove:      () => void
}) {
  const totalBonus = effectiveBase + weapon.attackBonus
  const iteratives = iterativeAttacks(totalBonus, bab)

  return (
    <div className={clsx(
      'rounded-xl border transition-colors',
      weapon.type === 'melee'
        ? 'border-stone-600/50 bg-stone-900/70'
        : 'border-sky-900/40 bg-sky-950/10',
    )}>
      {/* ── Header row ── */}
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Type icon */}
        <span className="text-base shrink-0 select-none" title={weapon.type}>
          {weapon.type === 'melee' ? '⚔' : '🏹'}
        </span>

        {/* Name */}
        <span className="flex-1 text-sm font-semibold text-stone-200 truncate min-w-0">
          {weapon.name || <span className="italic text-stone-500">Unnamed</span>}
        </span>

        {/* Attack bonus chips */}
        <div className="flex items-baseline gap-px shrink-0">
          {iteratives.map((v, i) => (
            <span key={i} className="flex items-center gap-px">
              {i > 0 && <span className="text-stone-600 text-xs mx-0.5">/</span>}
              <span className={clsx(
                'font-bold font-mono rounded-md border px-1.5 py-0.5',
                i === 0
                  ? 'text-base text-stone-100 border-stone-600/60 bg-stone-800/80'
                  : 'text-xs text-stone-400 border-stone-700/40 bg-stone-900/40',
              )}>
                {formatModifier(v)}
              </span>
            </span>
          ))}
        </div>

        {/* Damage + crit */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <span className="font-mono text-sm font-semibold text-amber-300 rounded-md border border-amber-800/40 bg-amber-950/20 px-2 py-0.5">
            {weapon.damage || '—'}
          </span>
          {(weapon.critRange || weapon.critMult) && (
            <span className="text-xs text-stone-500 font-mono">
              {weapon.critRange}{weapon.critRange && weapon.critMult ? ' ' : ''}{weapon.critMult}
            </span>
          )}
        </div>

        {/* Actions */}
        <button
          className="text-stone-600 hover:text-stone-300 transition-colors text-xs px-1 shrink-0"
          title={isEditing ? 'Chiudi' : 'Modifica'}
          onClick={onEdit}
        >
          {isEditing ? '▲' : '▼'}
        </button>
        <button
          className="text-stone-600 hover:text-red-400 transition-colors text-sm px-1 shrink-0"
          title="Rimuovi arma"
          onClick={onRemove}
        >
          ×
        </button>
      </div>

      {/* ── Inline edit form ── */}
      {isEditing && (
        <div className="border-t border-stone-700/40 px-3 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Name</span>
            <input className="field text-sm" value={weapon.name}
              onChange={e => onUpdate({ name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Type</span>
            <select className="field text-sm" value={weapon.type}
              onChange={e => onUpdate({ type: e.target.value as WeaponType })}>
              <option value="melee">Melee</option>
              <option value="ranged">Ranged</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Attack bonus</span>
            <input type="number" className="field text-sm" value={weapon.attackBonus}
              onChange={e => onUpdate({ attackBonus: Number(e.target.value) })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Damage</span>
            <input className="field text-sm" placeholder="1d8+4" value={weapon.damage}
              onChange={e => onUpdate({ damage: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Crit range</span>
            <input className="field text-sm" placeholder="19–20" value={weapon.critRange}
              onChange={e => onUpdate({ critRange: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Crit multiplier</span>
            <input className="field text-sm" placeholder="×2" value={weapon.critMult}
              onChange={e => onUpdate({ critMult: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 col-span-2 sm:col-span-3">
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Notes</span>
            <input className="field text-sm" placeholder="Special properties, material, enchantments…"
              value={weapon.notes ?? ''}
              onChange={e => onUpdate({ notes: e.target.value })} />
          </label>
          {/* Mobile damage/crit recap */}
          <div className="col-span-2 sm:hidden flex items-center gap-2 text-xs text-stone-500 italic">
            <span>Total:</span>
            <span className="font-mono text-stone-300">{iteratives.map(v => formatModifier(v)).join(' / ')}</span>
            <span>·</span>
            <span className="font-mono text-amber-300">{weapon.damage || '—'}</span>
            {weapon.critRange && <span>· {weapon.critRange} {weapon.critMult}</span>}
          </div>
        </div>
      )}

      {/* Notes row (always visible when filled) */}
      {!isEditing && weapon.notes && (
        <div className="border-t border-stone-800/40 px-3 py-1.5 text-[10px] text-stone-500 italic truncate">
          {weapon.notes}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AddWeaponForm
// ---------------------------------------------------------------------------

function AddWeaponForm({
  onAdd, onClose,
}: { onAdd: (w: Omit<WeaponEntry, 'id'>) => void; onClose: () => void }) {
  const [name,        setName]        = useState('')
  const [type,        setType]        = useState<WeaponType>('melee')
  const [attackBonus, setAttackBonus] = useState(0)
  const [damage,      setDamage]      = useState('')
  const [critRange,   setCritRange]   = useState('20')
  const [critMult,    setCritMult]    = useState('×2')
  const [notes,       setNotes]       = useState('')

  function submit() {
    if (!name.trim()) return
    onAdd({ name: name.trim(), type, attackBonus, damage, critRange, critMult, notes: notes || undefined })
  }

  return (
    <div className="rounded-xl border border-stone-700/60 bg-stone-950/50 px-3 py-3 mb-3">
      <span className="text-[10px] uppercase tracking-wider text-stone-500 block mb-3">New weapon</span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <label className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Name *</span>
          <input className="field text-sm" placeholder="Longsword" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Type</span>
          <select className="field text-sm" value={type}
            onChange={e => setType(e.target.value as WeaponType)}>
            <option value="melee">Melee</option>
            <option value="ranged">Ranged</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Attack bonus</span>
          <input type="number" className="field text-sm" value={attackBonus}
            onChange={e => setAttackBonus(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Damage</span>
          <input className="field text-sm" placeholder="1d8+4" value={damage}
            onChange={e => setDamage(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Crit range</span>
          <input className="field text-sm" placeholder="19–20" value={critRange}
            onChange={e => setCritRange(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Crit multiplier</span>
          <input className="field text-sm" placeholder="×2" value={critMult}
            onChange={e => setCritMult(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 col-span-2 sm:col-span-3">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Notes</span>
          <input className="field text-sm" placeholder="Special properties, material, enchantments…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={!name.trim()}>Add</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

function QuickStat({
  label, value, delta = 0, accent = false, fmt, unit,
}: {
  label:   string
  value:   number
  delta?:  number
  accent?: boolean
  fmt?:    'mod'
  unit?:   string
}) {
  const display = fmt === 'mod' ? formatModifier(value) : `${value}${unit ?? ''}`
  return (
    <div className={clsx(
      'flex flex-col items-center gap-0.5 rounded-xl border py-3 px-2 shadow-sm transition-colors',
      delta > 0 ? 'border-emerald-700/40 bg-emerald-950/10'
      : delta < 0 ? 'border-red-700/40 bg-red-950/10'
      : accent ? 'border-amber-700/40 bg-stone-900/80'
      : 'border-stone-700/50 bg-stone-900/60',
    )}>
      <span className={clsx(
        'font-bold font-mono text-2xl',
        delta > 0 ? 'text-emerald-400'
        : delta < 0 ? 'text-red-400'
        : accent ? 'text-amber-300'
        : 'text-stone-100',
      )}>
        {display}
      </span>
      {delta !== 0 && <DeltaBadge delta={delta} small />}
      <span className="text-[9px] uppercase tracking-[0.13em] text-stone-500 text-center">{label}</span>
    </div>
  )
}

function DeltaBadge({ delta, small = false }: { delta: number; small?: boolean }) {
  if (delta === 0) return null
  return (
    <span className={clsx(
      'rounded px-1 font-medium font-mono border',
      small ? 'text-[9px] py-px' : 'text-xs py-0.5',
      delta > 0
        ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700/40'
        : 'bg-red-900/50 text-red-400 border-red-700/40',
    )}>
      {delta > 0 ? `+${delta}` : `${delta}`}
    </span>
  )
}

function TypeBadge({ type }: { type: EffectType }) {
  const map: Record<EffectType, { label: string; cls: string }> = {
    buff:      { label: 'Buff',   cls: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/40' },
    debuff:    { label: 'Debuff', cls: 'bg-red-900/50 text-red-400 border-red-700/40' },
    condition: { label: 'Cond.', cls: 'bg-yellow-900/50 text-yellow-400 border-yellow-700/40' },
    custom:    { label: 'Custom', cls: 'bg-blue-900/50 text-blue-400 border-blue-700/40' },
  }
  const { label, cls } = map[type]
  return (
    <span className={clsx(
      'rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide shrink-0',
      cls,
    )}>
      {label}
    </span>
  )
}
