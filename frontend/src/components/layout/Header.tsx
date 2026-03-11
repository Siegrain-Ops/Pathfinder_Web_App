import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'

export function Header() {
  const { pathname } = useLocation()

  return (
    <header className="h-14 shrink-0 border-b border-stone-700 bg-stone-900 flex items-center px-6 gap-6">
      {/* Logo / Brand */}
      <Link to="/" className="flex items-center gap-2 mr-4">
        <span className="text-amber-400 text-xl">⚔</span>
        <span className="font-display font-bold text-stone-100 tracking-wide">
          Pathfinder
        </span>
        <span className="text-stone-400 text-sm hidden sm:block">Character Manager</span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-1">
        <NavLink to="/"           label="Characters" active={pathname === '/'} />
        <NavLink to="/settings"   label="Settings"   active={pathname === '/settings'} />
      </nav>
    </header>
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
