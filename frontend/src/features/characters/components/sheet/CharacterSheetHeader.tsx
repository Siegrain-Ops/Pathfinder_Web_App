import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal }                              from 'react-dom'
import { Link, useLocation, useNavigate }            from 'react-router-dom'
import { clsx }                                      from 'clsx'
import { Button }                                    from '@/components/ui/Button'
import { Badge }                                     from '@/components/ui/Badge'
import { useAuthStore }                              from '@/app/store/authStore'
import { useCharacterSheet }                         from '../../hooks/useCharacterSheet'

const PAYPAL_URL =
  'https://www.paypal.com/donate?business=angelo.martinopw%40gmail.com&currency_code=EUR'

export function CharacterSheetHeader() {
  const { data, isDirty, isSaving, isLevelUpInProgress, save, update } = useCharacterSheet()
  const { user, logout }  = useAuthStore()
  const { pathname }      = useLocation()
  const navigate          = useNavigate()

  // ── Overflow menu (⋯) ──────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos]   = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  // Close on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const openMenu = useCallback(() => {
    if (menuBtnRef.current) {
      const r = menuBtnRef.current.getBoundingClientRect()
      setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setMenuOpen(v => !v)
  }, [])

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const handleLogout = async () => {
    closeMenu()
    await logout()
    navigate('/login', { replace: true })
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (!data) return null

  const d = data
  const { hitPoints } = d.combat
  const hpPercent = hitPoints.max > 0
    ? Math.max(0, Math.round((hitPoints.current / hitPoints.max) * 100))
    : 0

  const hpColor =
    hpPercent > 50 ? 'bg-green-500' :
    hpPercent > 25 ? 'bg-amber-500' : 'bg-red-500'

  function adjustHp(delta: number) {
    const next = Math.min(
      hitPoints.max + hitPoints.temp,
      Math.max(0, hitPoints.current + delta),
    )
    update({ combat: { ...d.combat, hitPoints: { ...hitPoints, current: next } } })
  }

  return (
    <>
      {/* ── Mobile layout (< sm) ─────────────────────────────────────────────
          Row: [←]  [Name / Race · Lv]  [HP column + ⋯]  [Save?]
          The right column stacks the HP pill tracker and the ⋯ overflow button
          vertically so they form a single intentional control group.
          createPortal is used for the dropdown so it is never intercepted by
          the overflow-y:auto scroll container below.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="sm:hidden bg-stone-950 border-b border-stone-800 px-3 py-2 flex items-center gap-2">
        {/* Back */}
        <Link
          to="/"
          aria-label="Back to characters"
          className="flex items-center justify-center w-10 h-10 -ml-1 shrink-0 text-stone-500 active:text-amber-400 transition-colors text-lg leading-none"
        >
          ←
        </Link>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-sm text-stone-100 truncate leading-tight">
            {data.name}
          </h1>
          <p className="text-[11px] text-stone-500 truncate leading-tight">
            {data.race} · Lv {data.level}
          </p>
        </div>

        {/* HP tracker + ⋯ — vertical pair */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          {/* Compact HP pill */}
          <div className="flex items-center">
            <button
              onClick={() => adjustHp(-1)}
              aria-label="Decrease HP"
              className="flex items-center justify-center h-10 w-10 rounded-l-lg border border-stone-700 bg-stone-800/80 text-stone-300 active:bg-red-900/60 active:border-red-700/70 active:text-red-300 transition-colors font-bold text-lg leading-none"
            >
              −
            </button>
            <div className="flex flex-col items-center justify-center border-y border-stone-700 bg-stone-800/50 h-10 px-2 min-w-[52px]">
              <span className="text-xs font-bold text-stone-100 tabular-nums leading-none">
                {hitPoints.current}
              </span>
              <span className="text-[10px] text-stone-600 tabular-nums leading-none">
                /{hitPoints.max}
                {hitPoints.temp > 0 && (
                  <span className="text-blue-400"> +{hitPoints.temp}</span>
                )}
              </span>
            </div>
            <button
              onClick={() => adjustHp(1)}
              aria-label="Increase HP"
              className="flex items-center justify-center h-10 w-10 rounded-r-lg border border-stone-700 bg-stone-800/80 text-stone-300 active:bg-green-900/60 active:border-green-700/70 active:text-green-300 transition-colors font-bold text-lg leading-none"
            >
              +
            </button>
          </div>

          {/* ⋯ overflow button — sits directly below HP, same width as pill */}
          <button
            ref={menuBtnRef}
            onClick={openMenu}
            aria-label="More options"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center justify-center w-full h-7 rounded-md text-stone-500 active:text-stone-300 active:bg-stone-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="4"  cy="10" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="16" cy="10" r="1.5" />
            </svg>
          </button>
        </div>

        {/* Save — only when dirty to keep row uncluttered */}
        {isDirty && (
          <Button
            variant="primary"
            size="sm"
            loading={isSaving}
            disabled={isLevelUpInProgress}
            onClick={() => void save()}
            className="shrink-0"
            title={isLevelUpInProgress ? 'Complete the current level-up workflow before saving changes.' : undefined}
          >
            Save
          </Button>
        )}
      </div>

      {/* ── Desktop layout (≥ sm) — unchanged ────────────────────────────── */}
      <div className="hidden sm:flex bg-stone-950 border-b border-stone-800 px-6 py-3 items-center gap-4">
        <Link to="/" className="text-stone-500 hover:text-amber-400 transition-colors text-sm font-medium">
          ← Characters
        </Link>

        <div className="w-px h-6 bg-stone-800" />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="font-display font-bold text-xl text-stone-100 truncate">
              {data.name}
            </h1>
            <span className="text-stone-400 text-sm shrink-0">
              {data.race} {data.className}
            </span>
            <Badge variant="amber">Level {data.level}</Badge>
            <Badge variant="default">{data.alignment}</Badge>
          </div>
          {isLevelUpInProgress && (
            <p className="mt-1 text-xs text-amber-400/80">
              Finish the current level-up workflow before saving changes.
            </p>
          )}
        </div>

        {/* Desktop HP tracker */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => adjustHp(-1)}
            className="h-7 w-7 rounded-md border border-stone-700 bg-stone-800/80 text-stone-300 hover:bg-red-900/50 hover:border-red-700/70 hover:text-red-300 transition-all font-bold text-lg leading-none"
          >
            −
          </button>

          <div className="flex flex-col items-center gap-0.5 w-28">
            <div className="flex items-baseline gap-1 text-sm">
              <span className="font-bold text-stone-100">{hitPoints.current}</span>
              <span className="text-stone-600">/</span>
              <span className="text-stone-400">{hitPoints.max}</span>
              {hitPoints.temp > 0 && (
                <span className="text-blue-400 text-xs font-medium">+{hitPoints.temp}</span>
              )}
            </div>
            <div className="w-full h-2 rounded-full bg-stone-800">
              <div
                className={clsx('h-full rounded-full transition-all duration-300', hpColor)}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">Hit Points</span>
          </div>

          <button
            onClick={() => adjustHp(1)}
            className="h-7 w-7 rounded-md border border-stone-700 bg-stone-800/80 text-stone-300 hover:bg-green-900/50 hover:border-green-700/70 hover:text-green-300 transition-all font-bold text-lg leading-none"
          >
            +
          </button>
        </div>

        <Button
          variant={isDirty ? 'primary' : 'secondary'}
          size="sm"
          loading={isSaving}
          disabled={isLevelUpInProgress}
          onClick={() => void save()}
          className="shrink-0"
          title={isLevelUpInProgress ? 'Complete the current level-up workflow before saving changes.' : undefined}
        >
          {isDirty ? 'Save Changes' : 'Saved'}
        </Button>
      </div>

      {/* ── Mobile overflow dropdown — rendered via createPortal to document.body
          so it is never captured by the overflow-y:auto scroll container.       */}
      {menuOpen && createPortal(
        <>
          {/* Transparent full-screen backdrop */}
          <div
            className="fixed inset-0 z-[90]"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Dropdown panel — fixed, anchored to ⋯ button position */}
          <div
            role="menu"
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-[100] w-52 bg-stone-900 border border-stone-700/80 rounded-xl shadow-2xl shadow-black/60 overflow-hidden py-1"
          >
            <OverflowLink
              to="/"
              icon="⚔"
              label="Characters"
              active={pathname === '/'}
              onClick={closeMenu}
            />
            <OverflowLink
              to="/settings"
              icon="⚙"
              label="Settings"
              active={pathname === '/settings'}
              onClick={closeMenu}
            />
            <a
              href={PAYPAL_URL}
              target="_blank"
              rel="noreferrer noopener"
              onClick={closeMenu}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-3.5 text-sm text-stone-300 active:bg-stone-800 active:text-stone-100 transition-colors"
            >
              <span className="text-base w-5 text-center leading-none select-none">☕</span>
              Buy me a coffee
            </a>

            <div className="h-px bg-stone-700/50 mx-3 my-1" />

            {user && (
              <p className="px-4 pt-1.5 pb-0 text-[11px] text-stone-500 truncate">
                {user.displayName}
              </p>
            )}
            <button
              role="menuitem"
              onClick={() => { void handleLogout() }}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-stone-400 active:bg-stone-800 active:text-red-300 transition-colors"
            >
              <span className="text-base w-5 text-center leading-none select-none">→</span>
              Sign out
            </button>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

interface OverflowLinkProps {
  to: string
  icon: string
  label: string
  active?: boolean
  onClick: () => void
}

function OverflowLink({ to, icon, label, active = false, onClick }: OverflowLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      role="menuitem"
      className={clsx(
        'flex items-center gap-3 px-4 py-3.5 text-sm transition-colors',
        active
          ? 'bg-stone-800/90 text-stone-100'
          : 'text-stone-300 active:bg-stone-800 active:text-stone-100',
      )}
    >
      <span className="text-base w-5 text-center leading-none select-none">{icon}</span>
      {label}
    </Link>
  )
}
