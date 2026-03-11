import { SectionPanel }      from './SectionPanel'
import { StatInput }         from './StatInput'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'
import { formatModifier }    from '@/lib/utils/format.utils'
import type { SavingThrow }  from '@/types'

const SAVES = [
  { key: 'fortitude' as const, label: 'Fortitude', stat: 'CON' },
  { key: 'reflex'    as const, label: 'Reflex',    stat: 'DEX' },
  { key: 'will'      as const, label: 'Will',       stat: 'WIS' },
]

export function SavesSection() {
  const { data, update } = useCharacterSheet()
  if (!data) return null

  function updateSave(key: 'fortitude' | 'reflex' | 'will', patch: Partial<SavingThrow>) {
    update({
      saves: {
        ...data!.saves,
        [key]: { ...data!.saves[key], ...patch },
      },
    })
  }

  return (
    <SectionPanel title="Saving Throws">
      <div className="flex flex-col gap-4">
        {SAVES.map(({ key, label, stat }) => {
          const save = data.saves[key]
          return (
            <div
              key={key}
              className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 items-center
                         rounded border border-stone-700 bg-stone-900 p-3"
            >
              {/* Total bubble */}
              <div className="flex flex-col items-center gap-0.5 row-span-2">
                <div className="h-12 w-12 rounded-full border-2 border-amber-600/50 bg-stone-800
                                flex items-center justify-center font-display font-bold text-lg text-amber-300">
                  {formatModifier(save.total)}
                </div>
                <span className="text-[10px] text-stone-500 uppercase tracking-wider">{label}</span>
              </div>

              {/* Label row */}
              <div className="flex items-center gap-1 text-sm">
                <span className="font-medium text-stone-300">{label}</span>
                <span className="text-xs text-stone-500">({stat})</span>
              </div>

              {/* Inputs row */}
              <div className="flex flex-wrap gap-3">
                <StatInput label="Base"   value={save.base}       onChange={v => updateSave(key, { base: v })} />
                <StatInput label="Stat"   value={save.statModifier} onChange={() => {}} readOnly />
                <StatInput label="Magic"  value={save.magicBonus}  onChange={v => updateSave(key, { magicBonus: v })} />
                <StatInput label="Misc"   value={save.miscBonus}   onChange={v => updateSave(key, { miscBonus: v })} />
                <StatInput label="Temp"   value={save.tempBonus}   onChange={v => updateSave(key, { tempBonus: v })} />
              </div>
            </div>
          )
        })}
      </div>
    </SectionPanel>
  )
}
