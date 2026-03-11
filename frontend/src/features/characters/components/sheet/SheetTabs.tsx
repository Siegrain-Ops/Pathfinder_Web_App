import { clsx } from 'clsx'

export type SheetTab =
  | 'overview' | 'stats' | 'combat' | 'saves'
  | 'skills'   | 'feats' | 'abilities'
  | 'spells'   | 'inventory' | 'notes'

const TABS: { id: SheetTab; label: string }[] = [
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
]

interface SheetTabsProps {
  active:   SheetTab
  onChange: (tab: SheetTab) => void
}

export function SheetTabs({ active, onChange }: SheetTabsProps) {
  return (
    <div className="flex overflow-x-auto border-b border-stone-700 bg-stone-900 scrollbar-hide">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            active === tab.id
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-600',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
