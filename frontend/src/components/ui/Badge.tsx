import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'amber' | 'green' | 'red' | 'blue' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-stone-700 text-stone-300',
  amber:   'bg-amber-900/60 text-amber-300 border border-amber-700/40',
  green:   'bg-green-900/60 text-green-300 border border-green-700/40',
  red:     'bg-red-900/60  text-red-300   border border-red-700/40',
  blue:    'bg-blue-900/60 text-blue-300  border border-blue-700/40',
  purple:  'bg-purple-900/60 text-purple-300 border border-purple-700/40',
}

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
