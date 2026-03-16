import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/app/store/authStore'

export function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

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

      {/* User / Logout */}
      <div className="ml-auto flex items-center gap-3">
        {user && (
          <span className="text-stone-400 text-sm hidden sm:block">{user.displayName}</span>
        )}
        <button
          onClick={() => { void handleLogout() }}
          className="px-3 py-1.5 rounded text-sm font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
        >
          Sign out
        </button>
      </div>
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
