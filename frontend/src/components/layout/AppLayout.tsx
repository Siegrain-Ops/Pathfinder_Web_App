import { Outlet } from 'react-router-dom'
import { Header } from './Header'

const REPO_BASE_URL = import.meta.env.VITE_REPO_BASE_URL
  ?? 'https://github.com/Siegrain-Ops/Pathfinder_Web_App'

const LEGAL_DOC_URL = `${REPO_BASE_URL}/blob/main/LEGAL.md`
const OGL_DOC_URL = `${REPO_BASE_URL}/blob/main/OGL-1.0a.txt`

export function AppLayout() {
  return (
    <div className="flex flex-col h-screen bg-stone-900 overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <footer className="shrink-0 border-t border-stone-800 bg-stone-950/90 px-4 py-2">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 text-[11px] text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            PathLegends is an unofficial Pathfinder 1e fan project, not affiliated with Paizo. Reference data sourced from d20pfsrd.com and other OGC sources.
          </p>
          <div className="flex items-center gap-3">
            <FooterLink href={LEGAL_DOC_URL} label="Legal" />
            <FooterLink href={OGL_DOC_URL} label="OGL 1.0a" />
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-stone-400 hover:text-stone-200 transition-colors"
    >
      {label}
    </a>
  )
}
