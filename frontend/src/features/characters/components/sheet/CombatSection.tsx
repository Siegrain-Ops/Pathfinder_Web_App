import { SectionPanel }      from './SectionPanel'
import { StatInput }         from './StatInput'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'
import { formatModifier }    from '@/lib/utils/format.utils'
import type { ArmorClass, HitPoints } from '@/types'

export function CombatSection() {
  const { data, update } = useCharacterSheet()
  if (!data) return null

  const { combat } = data

  function updateHp(patch: Partial<HitPoints>) {
    update({ combat: { ...combat, hitPoints: { ...combat.hitPoints, ...patch } } })
  }

  function updateAc(patch: Partial<ArmorClass>) {
    update({ combat: { ...combat, armorClass: { ...combat.armorClass, ...patch } } })
  }

  function updateCombat(patch: Parameters<typeof update>[0]['combat']) {
    update({ combat: { ...combat, ...patch } })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hit Points ──────────────────────────────────────── */}
      <SectionPanel title="Hit Points">
        <div className="flex flex-wrap gap-6">
          <StatInput label="Max HP"     value={combat.hitPoints.max}     onChange={v => updateHp({ max: v })}     min={0} />
          <StatInput label="Current HP" value={combat.hitPoints.current} onChange={v => updateHp({ current: v })} />
          <StatInput label="Temp HP"    value={combat.hitPoints.temp}    onChange={v => updateHp({ temp: v })}    min={0} />
        </div>
      </SectionPanel>

      {/* ── Armor Class ─────────────────────────────────────── */}
      <SectionPanel title="Armor Class">
        {/* Derived totals */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <DerivedStat label="AC"          value={combat.armorClass.total} />
          <DerivedStat label="Touch AC"    value={combat.armorClass.touch} />
          <DerivedStat label="Flat-Footed" value={combat.armorClass.flatFooted} />
        </div>

        {/* Breakdown inputs */}
        <div className="flex flex-wrap gap-4">
          <StatInput label="Armor"      value={combat.armorClass.armorBonus}      onChange={v => updateAc({ armorBonus: v })}      min={0} />
          <StatInput label="Shield"     value={combat.armorClass.shieldBonus}     onChange={v => updateAc({ shieldBonus: v })}     min={0} />
          <StatInput label="Natural"    value={combat.armorClass.naturalArmor}    onChange={v => updateAc({ naturalArmor: v })}    min={0} />
          <StatInput label="Deflection" value={combat.armorClass.deflectionBonus} onChange={v => updateAc({ deflectionBonus: v })} min={0} />
          <StatInput label="Misc"       value={combat.armorClass.miscBonus}       onChange={v => updateAc({ miscBonus: v })} />
          <StatInput label="DEX (auto)" value={combat.armorClass.dexBonus} onChange={() => {}} readOnly />
        </div>
      </SectionPanel>

      {/* ── Attacks & Movement ──────────────────────────────── */}
      <SectionPanel title="Attack & Movement">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <StatWithLabel label="Initiative"   value={formatModifier(combat.initiative)} />
          <StatWithLabel label="Base Attack"  value={formatModifier(combat.baseAttackBonus)} />
          <StatWithLabel label="Melee Atk"    value={formatModifier(combat.meleeAttackBonus)} />
          <StatWithLabel label="Ranged Atk"   value={formatModifier(combat.rangedAttackBonus)} />
          <StatWithLabel label="CMB"          value={formatModifier(combat.cmb)} />
          <StatWithLabel label="CMD"          value={String(combat.cmd)} />
          <StatWithLabel label="Speed"        value={`${combat.speed} ft`} />

          {/* Editable BAB */}
          <div className="flex flex-col gap-1">
            <StatInput
              label="BAB (base)"
              value={combat.baseAttackBonus}
              onChange={v => updateCombat({ baseAttackBonus: v } as typeof combat)}
              min={0}
            />
          </div>
          <StatInput
            label="Init Misc"
            value={combat.initiativeMiscBonus}
            onChange={v => updateCombat({ initiativeMiscBonus: v } as typeof combat)}
          />
          <StatInput
            label="Speed (ft)"
            value={combat.speed}
            onChange={v => updateCombat({ speed: v } as typeof combat)}
            min={0}
          />
        </div>
      </SectionPanel>
    </div>
  )
}

function DerivedStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-amber-700/40 bg-stone-900/80 py-3 px-3 shadow-sm">
      <span className="text-2xl font-bold font-display text-amber-300">{value}</span>
      <span className="text-[9px] uppercase tracking-[0.15em] text-stone-500">{label}</span>
    </div>
  )
}

function StatWithLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xl font-bold font-mono text-stone-100">{value}</span>
      <span className="text-[9px] uppercase tracking-[0.12em] text-stone-500">{label}</span>
    </div>
  )
}
