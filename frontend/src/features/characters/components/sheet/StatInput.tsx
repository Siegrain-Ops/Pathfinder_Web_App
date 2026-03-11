// ---------------------------------------------------------------------------
// StatInput — compact number field used throughout the sheet
// ---------------------------------------------------------------------------

import { clsx } from 'clsx'

interface StatInputProps {
  label:     string
  value:     number
  onChange:  (value: number) => void
  min?:      number
  max?:      number
  readOnly?: boolean
  highlight?: boolean
  className?: string
}

export function StatInput({
  label, value, onChange, min, max,
  readOnly = false, highlight = false, className,
}: StatInputProps) {
  return (
    <label className={clsx('flex flex-col items-center gap-0.5', className)}>
      <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <input
        type="number"
        value={value}
        readOnly={readOnly}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        className={clsx(
          'w-14 rounded border text-center text-sm font-mono font-semibold py-1',
          'bg-stone-900 text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500/50',
          readOnly
            ? 'border-stone-700 text-stone-400 cursor-default'
            : 'border-stone-600 hover:border-stone-500',
          highlight && 'border-amber-600/60 text-amber-300',
        )}
      />
    </label>
  )
}

/** Large modifier bubble (e.g. +3) displayed above each ability score */
export function ModifierBubble({ value }: { value: number }) {
  const label = value >= 0 ? `+${value}` : `${value}`
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-600/50 bg-stone-900 font-display font-bold text-amber-300 text-sm">
      {label}
    </div>
  )
}
