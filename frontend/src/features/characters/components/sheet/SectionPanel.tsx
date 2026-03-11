import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface SectionPanelProps {
  title:    string
  action?:  ReactNode
  children: ReactNode
  className?: string
}

export function SectionPanel({ title, action, children, className }: SectionPanelProps) {
  return (
    <section className={clsx('rounded-lg border border-stone-700 bg-stone-800', className)}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-700">
        <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-amber-400">
          {title}
        </h3>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}
