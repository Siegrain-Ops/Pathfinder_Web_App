import { clsx } from 'clsx'

export type SheetTab =
  | 'overview' | 'stats' | 'combat' | 'saves'
  | 'skills'   | 'feats' | 'abilities'
  | 'spells'   | 'arcane_bond'
  | 'inventory' | 'notes' | 'levelup' | 'dice'

type TabColor = 'amber' | 'red' | 'emerald' | 'violet'

const TABS: { id: SheetTab; label: string; color?: TabColor }[] = [
  { id: 'overview',    label: 'Overview',     color: 'amber'  },
  { id: 'combat',      label: 'Combat',       color: 'red'    },
  { id: 'stats',       label: 'Stats'         },
  { id: 'saves',       label: 'Saves'         },
  { id: 'skills',      label: 'Skills'        },
  { id: 'feats',       label: 'Feats'         },
  { id: 'abilities',   label: 'Abilities'     },
  { id: 'spells',      label: 'Spells'        },
  { id: 'arcane_bond', label: 'Arcane Bond',  color: 'violet' },
  { id: 'inventory',   label: 'Inventory'     },
  { id: 'notes',       label: 'Notes'         },
  { id: 'dice',        label: '🎲 Dice',      color: 'amber'  },
  { id: 'levelup',     label: 'LvL UP',       color: 'emerald'},
]

interface SheetTabsProps {
  active:      SheetTab
  onChange:    (tab: SheetTab) => void
  /** Tab IDs to hide from the bar (used for class-specific tabs). */
  hiddenTabs?: SheetTab[]
}

// Active and inactive styles per color
const COLOR_ACTIVE: Record<TabColor, string> = {
  amber:   'border-amber-500   text-amber-300   bg-amber-950/30',
  red:     'border-red-500     text-red-300     bg-red-950/30',
  emerald: 'border-emerald-500 text-emerald-300 bg-emerald-950/30',
  violet:  'border-violet-500  text-violet-300  bg-violet-950/30',
}
const COLOR_INACTIVE: Record<TabColor, string> = {
  amber:   'border-transparent text-amber-600/80   hover:text-amber-400   hover:border-amber-600/40   hover:bg-amber-950/20',
  red:     'border-transparent text-red-600/80     hover:text-red-400     hover:border-red-600/40     hover:bg-red-950/20',
  emerald: 'border-transparent text-emerald-600/80 hover:text-emerald-400 hover:border-emerald-600/40 hover:bg-emerald-950/20',
  violet:  'border-transparent text-violet-600/80  hover:text-violet-400  hover:border-violet-600/40  hover:bg-violet-950/20',
}

export function SheetTabs({ active, onChange, hiddenTabs = [] }: SheetTabsProps) {
  const visibleTabs = hiddenTabs.length > 0
    ? TABS.filter(t => !hiddenTabs.includes(t.id))
    : TABS

  return (
    <div className="relative border-b border-stone-800 bg-stone-950">
    <div className="flex overflow-x-auto scrollbar-hide px-1">
      {visibleTabs.map((tab, idx) => {
        const isActive = active === tab.id
        const colored  = tab.color

        // Separator before the first non-colored tab (after the hero group)
        const prevColored = idx > 0 && visibleTabs[idx - 1].color && !colored
        // Separator before the last colored tab (dice/levelup)
        const nextSeparator = !colored && idx < visibleTabs.length - 1 && visibleTabs[idx + 1].color

        return (
          <span key={tab.id} className="flex items-center">
            {prevColored && (
              <span className="self-stretch my-2 w-px bg-stone-700/60 mx-1 shrink-0" />
            )}
            <button
              onClick={() => onChange(tab.id)}
              className={clsx(
                'shrink-0 px-4 py-3 text-xs font-medium tracking-wide transition-all duration-150 border-b-2 -mb-px',
                colored
                  ? isActive
                    ? COLOR_ACTIVE[colored]
                    : COLOR_INACTIVE[colored]
                  : isActive
                    ? 'border-stone-500 text-stone-300 bg-stone-800/40'
                    : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-600/50 hover:bg-stone-800/20',
              )}
            >
              {tab.label}
            </button>
            {nextSeparator && (
              <span className="self-stretch my-2 w-px bg-stone-700/60 mx-1 shrink-0" />
            )}
          </span>
        )
      })}
    </div>
    {/* Right-edge scroll hint — mobile only */}
    <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-stone-950 to-transparent sm:hidden" />
    </div>
  )
}
