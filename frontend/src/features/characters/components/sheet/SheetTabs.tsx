import { clsx } from 'clsx'

export type SheetTab =
  | 'overview' | 'stats' | 'combat' | 'saves'
  | 'skills'   | 'feats' | 'abilities'
  | 'spells'   | 'inventory' | 'notes' | 'levelup'

const TABS: { id: SheetTab; label: string; special?: boolean }[] = [
  { id: 'overview',   label: 'Overview'   },
  { id: 'stats',      label: 'Stats'      },
  { id: 'combat',     label: 'Combat'     },
  { id: 'saves',      label: 'Saves'      },
  { id: 'skills',     label: 'Skills'     },
  { id: 'feats',      label: 'Feats'      },
  { id: 'abilities',  label: 'Abilities'  },
  { id: 'spells',     label: 'Spells'     },
  { id: 'inventory',  label: 'Inventory'  },
  { id: 'notes',      label: 'Notes'      },
  { id: 'levelup',    label: 'LvL UP',    special: true },
]

interface SheetTabsProps {
  active:   SheetTab
  onChange: (tab: SheetTab) => void
}

export function SheetTabs({ active, onChange }: SheetTabsProps) {
  return (
    <div className="flex overflow-x-auto border-b border-stone-800 bg-stone-950 scrollbar-hide px-1">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'shrink-0 px-4 py-3 text-xs font-medium tracking-wide transition-all duration-150 border-b-2 -mb-px',
            active === tab.id
            ? tab.special
              ? 'border-emerald-500 text-emerald-400 bg-stone-800/40'
              : 'border-amber-500 text-amber-400 bg-stone-800/40'
            : tab.special
              ? 'border-transparent text-emerald-600 hover:text-emerald-400 hover:border-emerald-600/50 hover:bg-stone-800/20'
              : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-600/50 hover:bg-stone-800/20',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
