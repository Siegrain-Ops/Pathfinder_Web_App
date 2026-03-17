import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/app/store/authStore'
import { SupportButton } from '@/components/ui/SupportButton'
import { MobileNavDrawer } from './MobileNavDrawer'

export function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = async () => {
    setDrawerOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* ── Mobile header bar (< sm) ─────────────────────────────────────── */}
      <header className="sm:hidden h-14 shrink-0 border-b border-stone-700/80 bg-stone-900 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-amber-400 text-lg leading-none transition-transform duration-200 group-hover:scale-110">
            ⚔
          </span>
          <span className="font-display font-bold text-base tracking-wide">
            <span className="text-stone-100">Path</span><span className="text-amber-400">Legends</span>
          </span>
        </Link>

        <button
          onClick={() => setDrawerOpen(v => !v)}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {drawerOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* ── Desktop header bar (≥ sm) ────────────────────────────────────── */}
      <header className="hidden sm:flex h-14 shrink-0 border-b border-stone-700/80 bg-stone-900 items-center px-6 gap-6">
        {/* Logo / Brand */}
        <Link to="/" className="flex items-center gap-2 mr-4 shrink-0 group">
          <span className="text-amber-400 text-lg leading-none transition-transform duration-200 group-hover:scale-110">
            ⚔
          </span>
          <span className="font-display font-bold text-base tracking-wide">
            <span className="text-stone-100">Path</span><span className="text-amber-400">Legends</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <NavLink to="/"         label="Characters" active={pathname === '/'}         />
          <NavLink to="/settings" label="Settings"   active={pathname === '/settings'} />
          <SupportButton />
        </nav>

        {/* User / Logout */}
        <div className="ml-auto flex items-center gap-3">
          {user && (
            <span className="text-stone-400 text-sm truncate max-w-[140px]">
              {user.displayName}
            </span>
          )}
          <button
            onClick={() => { void handleLogout() }}
            className="px-3 py-1.5 rounded text-sm font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      <MobileNavDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        onLogout={() => { void handleLogout() }}
      />
    </>
  )
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={clsx(
        'px-3 py-1.5 rounded text-sm font-medium transition-colors',
        active
          ? 'bg-stone-700 text-stone-100'
          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800',
      )}
    >
      {label}
    </Link>
  )
}
