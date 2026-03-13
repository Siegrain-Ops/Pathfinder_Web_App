import { useEffect, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Button } from './Button'

interface ModalProps {
  open:      boolean
  onClose:   () => void
  title:     string
  children:  ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-md rounded-xl border border-stone-700/60',
          'bg-stone-800 shadow-2xl shadow-black/60',
          className,
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700/60 bg-stone-800/50 rounded-t-xl">
          <h2 className="font-display font-semibold text-stone-100 tracking-wide">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
