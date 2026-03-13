import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'amber' | 'green' | 'red' | 'blue' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-stone-700/80 text-stone-300 border border-stone-600/50',
  amber:   'bg-amber-900/50 text-amber-300 border border-amber-700/50',
  green:   'bg-green-900/50 text-green-300 border border-green-700/50',
  red:     'bg-red-900/50   text-red-300   border border-red-700/50',
  blue:    'bg-blue-900/50  text-blue-300  border border-blue-700/50',
  purple:  'bg-purple-900/50 text-purple-300 border border-purple-700/50',
}

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
