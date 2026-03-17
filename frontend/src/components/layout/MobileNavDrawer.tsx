import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import type { AuthUser } from '@/features/auth/services/auth.service'

const PAYPAL_URL =
  'https://www.paypal.com/donate?business=angelo.martinopw%40gmail.com&currency_code=EUR'

interface Props {
  isOpen:    boolean
  onClose:   () => void
  user:      AuthUser | null
  onLogout:  () => void
}

interface NavItemProps {
  to:      string
  icon:    string
  label:   string
  active:  boolean
  onClick: () => void
}

function NavItem({ to, icon, label, active, onClick }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-4 px-5 py-4 text-base font-medium transition-colors duration-150',
        'border-l-2',
        active
          ? 'border-amber-500 text-amber-300 bg-stone-800/60'
          : 'border-transparent text-stone-300 hover:text-stone-100 hover:bg-stone-800/40',
      )}
    >
      <span className="text-xl leading-none w-6 text-center">{icon}</span>
      {label}
    </Link>
  )
}

export function MobileNavDrawer({ isOpen, onClose, user, onLogout }: Props) {
  const { pathname } = useLocation()
  const closeRef = useRef<HTMLButtonElement>(null)

  // Close on route change
  useEffect(() => {
    onClose()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Focus close button when drawer opens
  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus()
    }
  }, [isOpen])

  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={clsx(
          'fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 sm:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={clsx(
          'fixed top-0 right-0 h-full w-72 z-50 flex flex-col',
          'bg-stone-900 border-l border-stone-700/80',
          'transition-transform duration-300 ease-in-out',
          'sm:hidden',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-stone-700/80 shrink-0">
          <span className="font-display font-bold text-base tracking-wide">
            <span className="text-stone-100">Path</span>
            <span className="text-amber-400">Legends</span>
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close menu"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <NavItem
            to="/"
            icon="⚔"
            label="Characters"
            active={pathname === '/'}
            onClick={onClose}
          />
          <NavItem
            to="/settings"
            icon="⚙"
            label="Settings"
            active={pathname === '/settings'}
            onClick={onClose}
          />

          {/* External: Support */}
          <a
            href={PAYPAL_URL}
            target="_blank"
            rel="noreferrer noopener"
            onClick={onClose}
            className="flex items-center gap-4 px-5 py-4 text-base font-medium border-l-2 border-transparent text-stone-300 hover:text-stone-100 hover:bg-stone-800/40 transition-colors duration-150"
          >
            <span className="text-xl leading-none w-6 text-center">☕</span>
            Buy me a coffee
          </a>
        </nav>

        {/* User + Sign out — pinned to bottom */}
        <div className="border-t border-stone-700/80 px-5 py-4 shrink-0">
          {user && (
            <p className="text-xs text-stone-500 mb-3 truncate">
              Signed in as <span className="text-stone-400 font-medium">{user.displayName}</span>
            </p>
          )}
          <button
            onClick={onLogout}
            className="flex items-center gap-4 w-full px-0 py-2 text-base font-medium text-stone-400 hover:text-red-300 transition-colors duration-150"
          >
            <span className="text-xl leading-none w-6 text-center">→</span>
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}
