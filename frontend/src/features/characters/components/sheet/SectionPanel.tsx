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
    <section className={clsx('rounded-xl border border-stone-700/60 bg-stone-800/90 shadow-md shadow-black/30', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700/60 bg-stone-800/50 rounded-t-xl">
        <h3 className="font-display font-semibold text-xs uppercase tracking-[0.18em] text-amber-400/90">
          {title}
        </h3>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}
