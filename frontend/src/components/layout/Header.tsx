import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/app/store/authStore'
import { SupportButton } from '@/components/ui/SupportButton'

export function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-14 shrink-0 border-b border-stone-700/80 bg-stone-900 flex items-center px-3 sm:px-6 gap-2 sm:gap-6">
      {/* Logo / Brand */}
      <Link to="/" className="flex items-center gap-2 mr-1 sm:mr-4 shrink-0 group">
        <span className="text-amber-400 text-lg leading-none transition-transform duration-200 group-hover:scale-110">
          ⚔
        </span>
        <span className="font-display font-bold text-base tracking-wide">
          <span className="text-stone-100">Path</span><span className="text-amber-400">Legends</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-0.5 sm:gap-1">
        <NavLink to="/"         label="Characters" active={pathname === '/'}         />
        <NavLink to="/settings" label="Settings"   active={pathname === '/settings'} />
        <SupportButton />
      </nav>

      {/* User / Logout */}
      <div className="ml-auto flex items-center gap-1 sm:gap-3">
        {user && (
          <span className="text-stone-400 text-sm hidden sm:block truncate max-w-[140px]">
            {user.displayName}
          </span>
        )}
        <button
          onClick={() => { void handleLogout() }}
          className="flex items-center px-2 sm:px-3 py-1.5 rounded text-sm font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          title="Sign out"
        >
          {/* Mobile: compact × icon */}
          <span className="sm:hidden text-base leading-none">✕</span>
          {/* Desktop: text label */}
          <span className="hidden sm:inline">Sign out</span>
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
        'px-2 sm:px-3 py-1.5 rounded text-sm font-medium transition-colors',
        active
          ? 'bg-stone-700 text-stone-100'
          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800',
      )}
    >
      {label}
    </Link>
  )
}
