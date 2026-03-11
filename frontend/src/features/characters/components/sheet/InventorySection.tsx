import { SectionPanel }      from './SectionPanel'
import { Button }            from '@/components/ui/Button'
import { Badge }             from '@/components/ui/Badge'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'
import { defaultInventoryItem } from '@/types/inventory.types'
import {
  calcTotalWeight, getLightLoadLimit,
  getMediumLoadLimit, getHeavyLoadLimit, getEncumbranceCategory,
} from '@/lib/formulas/inventory.formulas'
import { clsx }              from 'clsx'
import type { InventoryItem, Currency } from '@/types'

const CATEGORIES = [
  'weapon','armor','shield','potion','scroll','wand',
  'ring','wondrous','gear','ammunition','tool','trade good','other',
] as const

const ENCUMBRANCE_COLOR = {
  light:  'text-green-400',
  medium: 'text-amber-400',
  heavy:  'text-red-400',
  over:   'text-red-600',
}

export function InventorySection() {
  const { data, update } = useCharacterSheet()
  if (!data) return null

  const { inventory, stats } = data
  const strScore     = stats.strength.total
  const totalWeight  = calcTotalWeight(inventory.items)
  const encumbrance  = getEncumbranceCategory(totalWeight, strScore)

  function addItem() {
    const item = defaultInventoryItem(crypto.randomUUID())
    update({ inventory: { ...inventory, items: [...inventory.items, item] } })
  }

  function removeItem(id: string) {
    update({ inventory: { ...inventory, items: inventory.items.filter(i => i.id !== id) } })
  }

  function updateItem(id: string, patch: Partial<InventoryItem>) {
    update({
      inventory: {
        ...inventory,
        items: inventory.items.map(i => i.id === id ? { ...i, ...patch } : i),
      },
    })
  }

  function updateCurrency(patch: Partial<Currency>) {
    update({ inventory: { ...inventory, currency: { ...inventory.currency, ...patch } } })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Currency ────────────────────────────────────────── */}
      <SectionPanel title="Currency">
        <div className="flex flex-wrap gap-6">
          {(['platinum','gold','silver','copper'] as const).map(coin => (
            <label key={coin} className="flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-stone-500 capitalize">
                {coin[0].toUpperCase()} ({coin})
              </span>
              <input
                type="number" min={0}
                value={inventory.currency[coin]}
                onChange={e => updateCurrency({ [coin]: Number(e.target.value) })}
                className="w-20 rounded border border-stone-600 bg-stone-900 text-center
                           text-sm font-mono text-stone-100 py-1 focus:outline-none
                           focus:ring-1 focus:ring-amber-500/50"
              />
            </label>
          ))}
        </div>
      </SectionPanel>

      {/* ── Carry Weight ────────────────────────────────────── */}
      <SectionPanel title="Carry Weight">
        <div className="flex flex-wrap gap-6 items-center">
          <div className="flex flex-col items-center gap-0.5">
            <span className={clsx('text-xl font-bold font-mono', ENCUMBRANCE_COLOR[encumbrance])}>
              {totalWeight.toFixed(1)} lbs
            </span>
            <span className="text-[10px] uppercase tracking-wider text-stone-500">Carried</span>
          </div>
          <div className="text-sm text-stone-400 flex gap-4">
            <span>Light ≤ {getLightLoadLimit(strScore)} lbs</span>
            <span>Medium ≤ {getMediumLoadLimit(strScore)} lbs</span>
            <span>Heavy ≤ {getHeavyLoadLimit(strScore)} lbs</span>
          </div>
          <Badge
            variant={encumbrance === 'light' ? 'green' : encumbrance === 'medium' ? 'amber' : 'red'}
          >
            {encumbrance.charAt(0).toUpperCase() + encumbrance.slice(1)} Load
          </Badge>
        </div>
      </SectionPanel>

      {/* ── Items ───────────────────────────────────────────── */}
      <SectionPanel
        title={`Items (${inventory.items.length})`}
        action={<Button size="sm" onClick={addItem}>+ Add Item</Button>}
      >
        {inventory.items.length === 0 && (
          <p className="text-sm text-stone-500 text-center py-6">No items in inventory.</p>
        )}

        {inventory.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-[10px] uppercase tracking-wider text-stone-500">
                  <th className="text-left py-2 pr-3">Name</th>
                  <th className="text-left py-2 px-2">Category</th>
                  <th className="text-center py-2 px-2 w-16">Qty</th>
                  <th className="text-center py-2 px-2 w-16">Wt (ea)</th>
                  <th className="text-center py-2 px-2 w-16">Value (gp)</th>
                  <th className="text-center py-2 px-2 w-14">Equip</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {inventory.items.map(item => (
                  <tr key={item.id} className="hover:bg-stone-700/20 transition-colors">
                    <td className="py-1.5 pr-3">
                      <input
                        className="w-full bg-transparent text-stone-200 focus:outline-none
                                   border-b border-transparent hover:border-stone-600
                                   focus:border-amber-500/50"
                        value={item.name}
                        placeholder="Item name"
                        onChange={e => updateItem(item.id, { name: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        className="bg-transparent text-stone-400 text-xs focus:outline-none"
                        value={item.category}
                        onChange={e => updateItem(item.id, { category: e.target.value as InventoryItem['category'] })}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number" min={0}
                        className="w-12 rounded border border-stone-600 bg-stone-900 text-center
                                   text-xs text-stone-100 py-0.5 focus:outline-none
                                   focus:ring-1 focus:ring-amber-500/50"
                        value={item.quantity}
                        onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number" min={0} step={0.1}
                        className="w-14 rounded border border-stone-600 bg-stone-900 text-center
                                   text-xs text-stone-100 py-0.5 focus:outline-none
                                   focus:ring-1 focus:ring-amber-500/50"
                        value={item.weight}
                        onChange={e => updateItem(item.id, { weight: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number" min={0} step={0.01}
                        className="w-16 rounded border border-stone-600 bg-stone-900 text-center
                                   text-xs text-stone-100 py-0.5 focus:outline-none
                                   focus:ring-1 focus:ring-amber-500/50"
                        value={item.value}
                        onChange={e => updateItem(item.id, { value: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.equipped}
                        onChange={e => updateItem(item.id, { equipped: e.target.checked })}
                        className="accent-amber-500"
                        title="Equipped"
                      />
                    </td>
                    <td className="py-1.5 pl-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-stone-600 hover:text-red-400 transition-colors text-xs"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>
    </div>
  )
}
