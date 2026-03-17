import { Link }              from 'react-router-dom'
import { Button }            from '@/components/ui/Button'
import { Badge }             from '@/components/ui/Badge'
import { clsx }              from 'clsx'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'

export function CharacterSheetHeader() {
  const { data, isDirty, isSaving, save, update } = useCharacterSheet()
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
    update({
      combat: {
        ...d.combat,
        hitPoints: { ...hitPoints, current: next },
      },
    })
  }

  const hpTracker = (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => adjustHp(-1)}
        className="h-7 w-7 rounded-md border border-stone-700 bg-stone-800/80 text-stone-300
                   hover:bg-red-900/50 hover:border-red-700/70 hover:text-red-300
                   transition-all duration-150 font-bold text-lg leading-none"
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
        className="h-7 w-7 rounded-md border border-stone-700 bg-stone-800/80 text-stone-300
                   hover:bg-green-900/50 hover:border-green-700/70 hover:text-green-300
                   transition-all duration-150 font-bold text-lg leading-none"
      >
        +
      </button>
    </div>
  )

  return (
    <>
      {/* ── Mobile layout (< sm) ──────────────────────────────────────────── */}
      <div className="sm:hidden bg-stone-950 border-b border-stone-800 px-3 py-2 flex flex-col gap-2">
        {/* Row 1: back + name + save */}
        <div className="flex items-center gap-2">
          <Link to="/" className="text-stone-500 hover:text-amber-400 transition-colors duration-150 text-sm font-medium shrink-0">
            ←
          </Link>
          <h1 className="font-display font-bold text-base text-stone-100 truncate flex-1 min-w-0">
            {data.name}
          </h1>
          <span className="text-stone-500 text-xs shrink-0">
            {data.race} · Lv {data.level}
          </span>
          <Button
            variant={isDirty ? 'primary' : 'secondary'}
            size="sm"
            loading={isSaving}
            onClick={() => void save()}
            className="shrink-0"
          >
            {isDirty ? 'Save' : 'Saved'}
          </Button>
        </div>
        {/* Row 2: HP tracker centred */}
        <div className="flex justify-center">
          {hpTracker}
        </div>
      </div>

      {/* ── Desktop layout (≥ sm) ─────────────────────────────────────────── */}
      <div className="hidden sm:flex bg-stone-950 border-b border-stone-800 px-6 py-3 items-center gap-4">
        <Link to="/" className="text-stone-500 hover:text-amber-400 transition-colors duration-150 text-sm font-medium">
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
        </div>

        {hpTracker}

        <Button
          variant={isDirty ? 'primary' : 'secondary'}
          size="sm"
          loading={isSaving}
          onClick={() => void save()}
          className="shrink-0"
        >
          {isDirty ? 'Save Changes' : 'Saved'}
        </Button>
      </div>
    </>
  )
}
