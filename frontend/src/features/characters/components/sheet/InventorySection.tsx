import { useState, useMemo }  from 'react'
import { SectionPanel }        from './SectionPanel'
import { Button }              from '@/components/ui/Button'
import { Badge }               from '@/components/ui/Badge'
import { useCharacterSheet }   from '../../hooks/useCharacterSheet'
import { defaultInventoryItem } from '@/types/inventory.types'
import {
  calcTotalWeight,
  getLightLoadLimit, getMediumLoadLimit, getHeavyLoadLimit,
  getEncumbranceCategory,
} from '@/lib/formulas/inventory.formulas'
import { clsx } from 'clsx'
import type { InventoryItem, Currency } from '@/types'

// ── Constants ────────────────────────────────────────────────────────────────

const ITEM_CATEGORIES = [
  'weapon','armor','shield','potion','scroll','wand',
  'ring','wondrous','gear','ammunition','tool','trade good','other',
] as const

const COMBAT_CATS     = new Set<InventoryItem['category']>(['weapon','armor','shield'])
const CONSUMABLE_CATS = new Set<InventoryItem['category']>(['potion','scroll','wand','ammunition'])

type FilterTab = 'all' | 'equipped' | 'combat' | 'consumable' | 'other'
type SortKey   = 'name' | 'category' | 'weight' | 'value'

const COIN_META = {
  platinum: { label: 'PP', color: 'text-sky-300',    dot: 'bg-sky-400',    gpValue: 10    },
  gold:     { label: 'GP', color: 'text-amber-300',  dot: 'bg-amber-400',  gpValue: 1     },
  silver:   { label: 'SP', color: 'text-stone-300',  dot: 'bg-stone-400',  gpValue: 0.1   },
  copper:   { label: 'CP', color: 'text-orange-400', dot: 'bg-orange-500', gpValue: 0.01  },
} as const

const CAT_BADGE: Partial<Record<InventoryItem['category'], 'red' | 'blue' | 'purple' | 'amber' | 'green' | 'default'>> = {
  weapon:       'red',
  armor:        'blue',
  shield:       'blue',
  potion:       'purple',
  scroll:       'purple',
  wand:         'purple',
  ammunition:   'red',
  ring:         'amber',
  wondrous:     'amber',
  gear:         'default',
  tool:         'default',
  'trade good': 'green',
  other:        'default',
}

const ENCUMBRANCE_COLOR = {
  light:  { text: 'text-emerald-400', badge: 'green'  as const },
  medium: { text: 'text-amber-400',   badge: 'amber'  as const },
  heavy:  { text: 'text-red-400',     badge: 'red'    as const },
  over:   { text: 'text-red-600',     badge: 'red'    as const },
}

// ── Component ────────────────────────────────────────────────────────────────

export function InventorySection() {
  const { data, update } = useCharacterSheet()

  const [activeTab,   setActiveTab]   = useState<FilterTab>('all')
  const [searchTerm,  setSearchTerm]  = useState('')
  const [sortBy,      setSortBy]      = useState<SortKey>('name')
  const [sortAsc,     setSortAsc]     = useState(true)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)

  if (!data) return null

  const { inventory, stats } = data
  const strScore    = stats.strength.total
  const totalWeight = calcTotalWeight(inventory.items)
  const encumbrance = getEncumbranceCategory(totalWeight, strScore)
  const lightLimit  = getLightLoadLimit(strScore)
  const medLimit    = getMediumLoadLimit(strScore)
  const heavyLimit  = getHeavyLoadLimit(strScore)

  // Currency gold-equivalent
  const totalGp = (
    inventory.currency.platinum * 10 +
    inventory.currency.gold      * 1  +
    inventory.currency.silver    * 0.1 +
    inventory.currency.copper    * 0.01
  )

  // ── Mutations ──────────────────────────────────────────────────────────────

  function addItem() {
    const item = defaultInventoryItem(crypto.randomUUID())
    update({ inventory: { ...inventory, items: [...inventory.items, item] } })
    setExpandedId(item.id)
  }

  function removeItem(id: string) {
    update({ inventory: { ...inventory, items: inventory.items.filter(i => i.id !== id) } })
    if (expandedId === id) setExpandedId(null)
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

  // ── Derived list ──────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    let list = [...inventory.items]

    // Filter by tab
    if (activeTab === 'equipped')   list = list.filter(i => i.equipped)
    if (activeTab === 'combat')     list = list.filter(i => COMBAT_CATS.has(i.category))
    if (activeTab === 'consumable') list = list.filter(i => CONSUMABLE_CATS.has(i.category))
    if (activeTab === 'other')      list = list.filter(i => !COMBAT_CATS.has(i.category) && !CONSUMABLE_CATS.has(i.category))

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
      )
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name')     cmp = a.name.localeCompare(b.name)
      if (sortBy === 'category') cmp = a.category.localeCompare(b.category)
      if (sortBy === 'weight')   cmp = (a.weight * a.quantity) - (b.weight * b.quantity)
      if (sortBy === 'value')    cmp = a.value - b.value
      return sortAsc ? cmp : -cmp
    })

    return list
  }, [inventory.items, activeTab, searchTerm, sortBy, sortAsc])

  // Tab counts
  const counts: Record<FilterTab, number> = {
    all:        inventory.items.length,
    equipped:   inventory.items.filter(i => i.equipped).length,
    combat:     inventory.items.filter(i => COMBAT_CATS.has(i.category)).length,
    consumable: inventory.items.filter(i => CONSUMABLE_CATS.has(i.category)).length,
    other:      inventory.items.filter(i => !COMBAT_CATS.has(i.category) && !CONSUMABLE_CATS.has(i.category)).length,
  }

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortAsc(a => !a)
    else { setSortBy(key); setSortAsc(true) }
  }

  // ── Weight bar ────────────────────────────────────────────────────────────
  const weightPct   = Math.min(100, (totalWeight / heavyLimit) * 100)
  const lightPct    = (lightLimit  / heavyLimit) * 100
  const medPct      = (medLimit    / heavyLimit) * 100
  const barColor    = encumbrance === 'light' ? 'bg-emerald-500' : encumbrance === 'medium' ? 'bg-amber-500' : 'bg-red-500'

  const enc = ENCUMBRANCE_COLOR[encumbrance]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* ── Summary strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Weight panel */}
        <SectionPanel title="Carrying Capacity">
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <div>
                <span className={clsx('text-3xl font-bold font-mono leading-none', enc.text)}>
                  {totalWeight.toFixed(1)}
                </span>
                <span className="ml-1 text-sm text-stone-500">lbs</span>
              </div>
              <Badge variant={enc.badge}>
                {encumbrance === 'over' ? 'Overloaded' : encumbrance.charAt(0).toUpperCase() + encumbrance.slice(1) + ' Load'}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="relative h-2.5 rounded-full bg-stone-800 overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all duration-300', barColor)}
                style={{ width: `${weightPct}%` }}
              />
              {/* threshold markers */}
              <div className="absolute top-0 bottom-0 w-px bg-stone-600/60" style={{ left: `${lightPct}%` }} />
              <div className="absolute top-0 bottom-0 w-px bg-stone-600/60" style={{ left: `${medPct}%`   }} />
            </div>

            <div className="flex justify-between text-[10px] text-stone-500 font-mono">
              <span>0</span>
              <span className="text-emerald-600">{lightLimit} <span className="font-sans">Light</span></span>
              <span className="text-amber-600">{medLimit} <span className="font-sans">Med</span></span>
              <span className="text-red-600">{heavyLimit} <span className="font-sans">Heavy</span></span>
            </div>
          </div>
        </SectionPanel>

        {/* Currency panel */}
        <SectionPanel title="Currency">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2">
              {(['platinum','gold','silver','copper'] as const).map(coin => {
                const m = COIN_META[coin]
                return (
                  <label key={coin} className="flex flex-col items-center gap-1.5">
                    <div className={clsx('h-2 w-2 rounded-full', m.dot)} />
                    <span className={clsx('text-[10px] font-bold tracking-widest', m.color)}>{m.label}</span>
                    <input
                      type="number" min={0}
                      value={inventory.currency[coin]}
                      onChange={e => updateCurrency({ [coin]: Number(e.target.value) })}
                      className="w-full rounded border border-stone-700 bg-stone-900/80 text-center
                                 text-sm font-mono text-stone-100 py-1.5 px-1
                                 focus:outline-none focus:ring-1 focus:ring-amber-500/50
                                 hover:border-stone-600 transition-colors"
                    />
                  </label>
                )
              })}
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-stone-800/60">
              <span className="text-[10px] text-stone-600 uppercase tracking-widest">Total value</span>
              <span className="text-sm font-mono text-amber-400 font-semibold">
                {totalGp % 1 === 0 ? totalGp : totalGp.toFixed(2)} <span className="text-amber-600/70 text-xs">gp</span>
              </span>
            </div>
          </div>
        </SectionPanel>
      </div>

      {/* ── Items panel ────────────────────────────────────────────────── */}
      <SectionPanel
        title={`Items (${inventory.items.length})`}
        action={<Button size="sm" onClick={addItem}>+ Add Item</Button>}
      >
        <div className="flex flex-col gap-3">

          {/* Search + sort bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                className="field text-sm"
                placeholder="Filter by name, category or note…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-1 text-[10px] text-stone-500">
              <span className="uppercase tracking-wider pr-1">Sort:</span>
              {(['name','category','weight','value'] as SortKey[]).map(k => (
                <button
                  key={k}
                  onClick={() => toggleSort(k)}
                  className={clsx(
                    'px-2 py-1 rounded capitalize transition-colors',
                    sortBy === k
                      ? 'bg-stone-700 text-stone-200'
                      : 'hover:bg-stone-800 text-stone-500',
                  )}
                >
                  {k}{sortBy === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 flex-wrap">
            {([ 'all', 'equipped', 'combat', 'consumable', 'other'] as FilterTab[]).map(tab => {
              const labels: Record<FilterTab, string> = {
                all: 'All', equipped: 'Equipped', combat: 'Combat', consumable: 'Consumables', other: 'Other',
              }
              const c = counts[tab]
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-amber-900/40 border border-amber-700/50 text-amber-300'
                      : 'border border-stone-700/50 text-stone-400 hover:border-stone-600 hover:text-stone-200',
                  )}
                >
                  {labels[tab]}{c > 0 && <span className="ml-1.5 opacity-70">{c}</span>}
                </button>
              )
            })}
          </div>

          {/* Item list */}
          {filteredItems.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-8">
              {inventory.items.length === 0
                ? 'No items in inventory. Click + Add Item to get started.'
                : 'No items match the current filter.'}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onUpdate={patch => updateItem(item.id, patch)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          )}

          {/* Stats footer */}
          {inventory.items.length > 0 && (
            <div className="flex flex-wrap gap-4 pt-2 border-t border-stone-800/60 text-xs text-stone-500">
              <span>
                <span className="text-stone-400 font-mono">{inventory.items.length}</span> items total
              </span>
              <span>
                <span className={clsx('font-mono', enc.text)}>{totalWeight.toFixed(1)}</span> lbs total weight
              </span>
              <span>
                <span className="text-amber-400 font-mono">{counts.equipped}</span> equipped
              </span>
              <span>
                <span className="text-purple-400 font-mono">{counts.consumable}</span> consumables
              </span>
            </div>
          )}
        </div>
      </SectionPanel>
    </div>
  )
}

// ── ItemCard ─────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item:           InventoryItem
  expanded:       boolean
  onToggleExpand: () => void
  onUpdate:       (patch: Partial<InventoryItem>) => void
  onRemove:       () => void
}

function ItemCard({ item, expanded, onToggleExpand, onUpdate, onRemove }: ItemCardProps) {
  const totalItemWeight = (item.weight * item.quantity).toFixed(1)

  return (
    <div className={clsx(
      'rounded-xl border transition-colors duration-150',
      item.equipped
        ? 'border-amber-700/40 bg-amber-950/10'
        : 'border-stone-700/50 bg-stone-900/40',
    )}>
      {/* ── Main row ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5">

        {/* Equipped toggle */}
        <button
          type="button"
          title={item.equipped ? 'Unequip' : 'Equip'}
          onClick={() => onUpdate({ equipped: !item.equipped })}
          className={clsx(
            'shrink-0 h-7 w-7 rounded-full border flex items-center justify-center text-sm transition-all duration-150',
            item.equipped
              ? 'border-amber-600/60 bg-amber-900/40 text-amber-400 shadow-sm shadow-amber-900/30'
              : 'border-stone-700 bg-stone-800/60 text-stone-600 hover:border-stone-500 hover:text-stone-400',
          )}
        >
          {item.equipped ? '⚔' : '○'}
        </button>

        {/* Name */}
        <input
          className={clsx(
            'flex-1 bg-transparent font-medium focus:outline-none',
            'border-b border-transparent hover:border-stone-600 focus:border-amber-500/50',
            'transition-colors text-sm min-w-0',
            item.equipped ? 'text-stone-100' : 'text-stone-200',
          )}
          value={item.name}
          placeholder="Item name"
          onChange={e => onUpdate({ name: e.target.value })}
        />

        {/* Category badge */}
        <Badge variant={CAT_BADGE[item.category] ?? 'default'}>
          {item.category}
        </Badge>

        {/* Stats chips */}
        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-stone-400 shrink-0">
          <span title="Quantity" className="flex items-center gap-0.5">
            <span className="text-stone-600 text-[10px]">×</span>
            <input
              type="number" min={0}
              value={item.quantity}
              onClick={e => e.stopPropagation()}
              onChange={e => onUpdate({ quantity: Number(e.target.value) })}
              className="w-9 rounded border border-stone-700 bg-stone-900 text-center py-0.5 text-xs
                         focus:outline-none focus:ring-1 focus:ring-amber-500/40 hover:border-stone-600"
            />
          </span>
          <span title={`${totalItemWeight} lbs total`} className="text-stone-500">
            <span className="text-stone-400">{item.weight}</span>
            <span className="text-stone-600 text-[10px]"> lb</span>
          </span>
          <span title="Value in GP" className="text-amber-500/70">
            <span className="text-amber-400">{item.value > 0 ? item.value : '—'}</span>
            {item.value > 0 && <span className="text-amber-600/50 text-[10px]"> gp</span>}
          </span>
        </div>

        {/* Expand / remove */}
        <button
          onClick={onToggleExpand}
          className="shrink-0 text-stone-600 hover:text-stone-300 text-xs px-1 transition-colors"
          title={expanded ? 'Collapse' : 'Edit details'}
        >
          {expanded ? '▲' : '▼'}
        </button>
        <button
          onClick={onRemove}
          className="shrink-0 text-stone-700 hover:text-red-400 text-xs transition-colors px-1"
          title="Remove item"
        >
          ✕
        </button>
      </div>

      {/* ── Expanded editor ──────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-stone-800/60 px-3 py-3 flex flex-col gap-3">
          {/* Mobile qty/weight/value (hidden on sm+) */}
          <div className="flex sm:hidden flex-wrap gap-3">
            <StatField label="Qty"    type="number" min={0}         value={String(item.quantity)} onChange={v => onUpdate({ quantity: Number(v) })} />
            <StatField label="Weight" type="number" min={0} step={0.1} value={String(item.weight)}  onChange={v => onUpdate({ weight:   Number(v) })} />
            <StatField label="Value"  type="number" min={0} step={0.01} value={String(item.value)}   onChange={v => onUpdate({ value:    Number(v) })} />
          </div>

          {/* Full edit row — weight/value always visible on desktop */}
          <div className="hidden sm:grid grid-cols-4 gap-3">
            <StatField label="Quantity" type="number" min={0}          value={String(item.quantity)} onChange={v => onUpdate({ quantity: Number(v) })} />
            <StatField label="Weight (lbs)" type="number" min={0} step={0.1}  value={String(item.weight)}  onChange={v => onUpdate({ weight:   Number(v) })} />
            <StatField label="Value (gp)"   type="number" min={0} step={0.01} value={String(item.value)}   onChange={v => onUpdate({ value:    Number(v) })} />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-widest text-stone-500">Category</span>
              <select
                className="field text-sm"
                value={item.category}
                onChange={e => onUpdate({ category: e.target.value as InventoryItem['category'] })}
              >
                {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Mobile category */}
          <div className="flex sm:hidden flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-stone-500">Category</span>
            <select
              className="field text-sm"
              value={item.category}
              onChange={e => onUpdate({ category: e.target.value as InventoryItem['category'] })}
            >
              {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Total weight callout */}
          {(item.weight > 0 && item.quantity > 1) && (
            <p className="text-xs text-stone-500 italic">
              Total carried weight: <span className="font-mono text-stone-300">{totalItemWeight} lbs</span> ({item.quantity} × {item.weight} lbs)
            </p>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-stone-500">Notes / Description</span>
            <textarea
              className="field min-h-[72px] resize-y text-sm"
              value={item.description}
              placeholder="Properties, effects, notes…"
              onChange={e => onUpdate({ description: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── StatField ─────────────────────────────────────────────────────────────────

function StatField({
  label, value, onChange, type = 'text', min, step,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  min?: number
  step?: number
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-widest text-stone-500">{label}</span>
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="field text-sm font-mono"
      />
    </label>
  )
}
