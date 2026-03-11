import { type HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Highlight the card border in amber */
  highlighted?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ highlighted, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'rounded-lg border bg-stone-800 text-stone-100',
        highlighted ? 'border-amber-500/60' : 'border-stone-700',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
)
Card.displayName = 'Card'

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('flex items-center justify-between px-4 py-3 border-b border-stone-700', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx('font-display font-semibold text-stone-100', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-4 py-3', className)} {...props}>
      {children}
    </div>
  )
}
