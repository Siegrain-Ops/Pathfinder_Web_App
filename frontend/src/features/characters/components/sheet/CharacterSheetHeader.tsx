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

  return (
    <div className="bg-stone-900 border-b border-stone-700 px-6 py-3 flex flex-wrap items-center gap-4">
      {/* Back */}
      <Link to="/" className="text-stone-400 hover:text-stone-200 transition-colors text-sm">
        ← Characters
      </Link>

      {/* Divider */}
      <div className="hidden sm:block w-px h-6 bg-stone-700" />

      {/* Identity */}
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

      {/* HP Tracker */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => adjustHp(-1)}
          className="h-7 w-7 rounded border border-stone-600 bg-stone-800 text-stone-300
                     hover:bg-red-900/40 hover:border-red-700 transition-colors font-bold text-lg leading-none"
        >
          −
        </button>

        <div className="flex flex-col items-center gap-0.5 w-28">
          <div className="flex items-baseline gap-1 text-sm">
            <span className="font-bold text-stone-100">{hitPoints.current}</span>
            <span className="text-stone-500">/</span>
            <span className="text-stone-400">{hitPoints.max}</span>
            {hitPoints.temp > 0 && (
              <span className="text-blue-400 text-xs">+{hitPoints.temp}tmp</span>
            )}
          </div>
          {/* HP bar */}
          <div className="w-full h-1.5 rounded-full bg-stone-700">
            <div
              className={clsx('h-full rounded-full transition-all', hpColor)}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-stone-500 uppercase tracking-wider">Hit Points</span>
        </div>

        <button
          onClick={() => adjustHp(1)}
          className="h-7 w-7 rounded border border-stone-600 bg-stone-800 text-stone-300
                     hover:bg-green-900/40 hover:border-green-700 transition-colors font-bold text-lg leading-none"
        >
          +
        </button>
      </div>

      {/* Save button */}
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
  )
}
