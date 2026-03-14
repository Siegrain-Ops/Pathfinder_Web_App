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
  ArmorClass, HitPoints,
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

  const [showPresets, setShowPresets]   = useState(false)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [acDetailOpen, setAcDetailOpen] = useState(false)
  const [presetSearch, setPresetSearch] = useState('')

  if (!data) return null
  const d = data

  const effects: ActiveEffect[] = d.activeEffects ?? []

  // Spellcasting info from reference class
  const refClass = useMemo(
    () => classes.find(c => c.name.toLowerCase() === d.className.toLowerCase()) ?? null,
    [classes, d.className],
  )
  const isCaster   = !!(refClass?.spellcastingType) || !!(d.combat.casterLevel)
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

  const meleeIt    = iterativeAttacks(eff.melee, d.combat.baseAttackBonus)
  const activeCount = effects.filter(e => e.active).length

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

  // ── Stat delta rows for the summary ────────────────────────────────────
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

      {/* ═══ 1. VITAL STATS ══════════════════════════════════════════════ */}
      <SectionPanel title="Vital Stats">
        {/* Quick-reference number row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
          <QuickStat label="AC"        value={eff.ac}    delta={eff.ac    - d.combat.armorClass.total}      accent />
          <QuickStat label="Touch AC"  value={eff.touch} delta={eff.touch - d.combat.armorClass.touch}  />
          <QuickStat label="Flat-Ft"   value={eff.flat}  delta={eff.flat  - d.combat.armorClass.flatFooted} />
          <QuickStat label="Initiative" value={eff.init} delta={eff.init  - d.combat.initiative}            fmt="mod" />
          <QuickStat label="Speed"     value={eff.speed} delta={eff.speed - d.combat.speed}                 unit=" ft" />
          <QuickStat label="CMD"       value={eff.cmd}   delta={eff.cmd   - d.combat.cmd}                  />
        </div>

        {/* HP row */}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Current HP</span>
            <div className="flex items-center gap-1">
              <button
                className="h-8 w-8 rounded border border-stone-600 bg-stone-800 text-stone-300 text-base font-bold
                           hover:bg-red-900/50 hover:border-red-700/60 hover:text-red-300 transition-colors"
                onClick={() => updateHp({ current: d.combat.hitPoints.current - 1 })}
              >−</button>
              <input
                type="number"
                value={d.combat.hitPoints.current}
                onChange={e => updateHp({ current: Number(e.target.value) })}
                className={clsx(
                  'w-16 rounded-md border bg-stone-900 text-center font-bold font-mono text-xl py-1',
                  'focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-colors',
                  d.combat.hitPoints.current <= 0
                    ? 'border-red-700/60 text-red-400'
                    : d.combat.hitPoints.current <= Math.floor(d.combat.hitPoints.max / 4)
                      ? 'border-amber-700/60 text-amber-300'
                      : 'border-stone-600/80 text-stone-100',
                )}
              />
              <button
                className="h-8 w-8 rounded border border-stone-600 bg-stone-800 text-stone-300 text-base font-bold
                           hover:bg-emerald-900/50 hover:border-emerald-700/60 hover:text-emerald-300 transition-colors"
                onClick={() => updateHp({ current: Math.min(d.combat.hitPoints.current + 1, d.combat.hitPoints.max) })}
              >+</button>
            </div>
          </div>
          <StatInput label="Max HP"  value={d.combat.hitPoints.max}  onChange={v => updateHp({ max: v })}  min={0} />
          <StatInput label="Temp HP" value={d.combat.hitPoints.temp} onChange={v => updateHp({ temp: v })} min={0} />
          <div className="flex-1 min-w-[120px]">
            <div className="flex justify-between text-[10px] text-stone-500 mb-1">
              <span>HP</span>
              <span>{d.combat.hitPoints.current} / {d.combat.hitPoints.max}</span>
            </div>
            <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-300',
                  d.combat.hitPoints.current <= 0
                    ? 'bg-red-600'
                    : d.combat.hitPoints.current <= Math.floor(d.combat.hitPoints.max / 4)
                      ? 'bg-red-500'
                      : d.combat.hitPoints.current <= Math.floor(d.combat.hitPoints.max / 2)
                        ? 'bg-amber-500'
                        : 'bg-emerald-500',
                )}
                style={{
                  width: `${Math.max(0, Math.min(100, (d.combat.hitPoints.current / Math.max(1, d.combat.hitPoints.max)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* AC breakdown (collapsible) */}
        <div>
          <button
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-stone-500 hover:text-stone-300 mb-2 transition-colors"
            onClick={() => setAcDetailOpen(v => !v)}
          >
            <span>AC Breakdown</span>
            <span>{acDetailOpen ? '▲' : '▼'}</span>
          </button>
          {acDetailOpen && (
            <div className="flex flex-wrap gap-4 pt-1 border-t border-stone-800/60">
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

      {/* ═══ 2. OFFENSE ══════════════════════════════════════════════════ */}
      <SectionPanel title="Offense">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {/* Melee with iteratives */}
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Melee Attack</span>
            <div className="flex flex-wrap justify-center gap-0.5 items-baseline">
              {meleeIt.map((v, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  {i > 0 && <span className="text-stone-600 text-xs">/</span>}
                  <span className={clsx('font-bold font-mono', i === 0 ? 'text-xl text-stone-100' : 'text-base text-stone-400')}>
                    {formatModifier(v)}
                  </span>
                </span>
              ))}
            </div>
            {getBonus('melee_attack', effects) !== 0 && (
              <DeltaBadge delta={getBonus('melee_attack', effects)} />
            )}
          </div>

          <div className="flex flex-col gap-1 items-center">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Ranged Attack</span>
            <span className="text-xl font-bold font-mono text-stone-100">{formatModifier(eff.ranged)}</span>
            {getBonus('ranged_attack', effects) !== 0 && <DeltaBadge delta={getBonus('ranged_attack', effects)} />}
          </div>

          <div className="flex flex-col gap-1 items-center">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">CMB</span>
            <span className="text-xl font-bold font-mono text-stone-100">{formatModifier(eff.cmb)}</span>
            {getBonus('cmb', effects) !== 0 && <DeltaBadge delta={getBonus('cmb', effects)} />}
          </div>

          <StatInput
            label="Base Attack"
            value={d.combat.baseAttackBonus}
            onChange={v => patchCombat('baseAttackBonus', v)}
            min={0}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Damage / Crit</span>
            <input
              className="field text-sm"
              placeholder='e.g. 1d8+4 / 19–20 ×2'
              value={d.combat.damageNote ?? ''}
              onChange={e => patchCombat('damageNote', e.target.value)}
            />
          </label>
          <div className="flex flex-col gap-1">
            <StatInput
              label="Initiative Misc"
              value={d.combat.initiativeMiscBonus}
              onChange={v => patchCombat('initiativeMiscBonus', v)}
            />
          </div>
        </div>
      </SectionPanel>

      {/* ═══ 3. SAVING THROWS ════════════════════════════════════════════ */}
      <SectionPanel title="Saving Throws">
        <div className="grid grid-cols-3 gap-3 mb-2">
          {([
            { label: 'Fortitude', key: 'fort' as const, base: d.saves.fortitude.total, stat: 'CON' },
            { label: 'Reflex',    key: 'ref'  as const, base: d.saves.reflex.total,    stat: 'DEX' },
            { label: 'Will',      key: 'will' as const, base: d.saves.will.total,       stat: 'WIS' },
          ]).map(({ label, key, base, stat }) => {
            const delta    = getBonus(key, effects)
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

      {/* ═══ 4. DEFENSE DETAIL ═══════════════════════════════════════════ */}
      <SectionPanel title="Defense">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">CMD</span>
            <span className="text-xl font-bold font-mono text-stone-100">{eff.cmd}</span>
            {getBonus('cmd', effects) !== 0 && <DeltaBadge delta={getBonus('cmd', effects)} />}
          </div>
          <StatInput
            label="Speed (ft)"
            value={d.combat.speed}
            onChange={v => patchCombat('speed', v)}
            min={0}
          />
          <div className="col-span-2 sm:col-span-1">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">DR / Resistances / Immunities</span>
              <input
                className="field text-sm"
                placeholder='e.g. DR 5/cold iron, Fire resist 10'
                value={d.combat.drNote ?? ''}
                onChange={e => patchCombat('drNote', e.target.value)}
              />
            </label>
          </div>
        </div>
      </SectionPanel>

      {/* ═══ 5. COMBAT SKILLS ════════════════════════════════════════════ */}
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

      {/* ═══ 6. SPELLCASTING ═════════════════════════════════════════════ */}
      {isCaster && (
        <SectionPanel title="Spellcasting in Combat">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
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
              <StatInput label="CL Override"  value={d.combat.casterLevel ?? d.level}         onChange={v => patchCombat('casterLevel', v)}          min={0} />
              <StatInput label="Conc Misc"     value={d.combat.concentrationMisc ?? 0}          onChange={v => patchCombat('concentrationMisc', v)} />
            </div>
          </div>
          <label className="flex flex-col gap-1">
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

      {/* ═══ 7. ACTIVE EFFECTS ════════════════════════════════════════════ */}
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
    buff:      { label: 'Buff',      cls: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/40' },
    debuff:    { label: 'Debuff',    cls: 'bg-red-900/50 text-red-400 border-red-700/40' },
    condition: { label: 'Cond.',     cls: 'bg-yellow-900/50 text-yellow-400 border-yellow-700/40' },
    custom:    { label: 'Custom',    cls: 'bg-blue-900/50 text-blue-400 border-blue-700/40' },
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
