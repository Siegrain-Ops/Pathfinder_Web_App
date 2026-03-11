import { useState }            from 'react'
import { SectionPanel }        from './SectionPanel'
import { Button }              from '@/components/ui/Button'
import { Badge }               from '@/components/ui/Badge'
import { useCharacterSheet }   from '../../hooks/useCharacterSheet'
import { defaultAbility }      from '@/types/feat.types'
import type { SpecialAbility } from '@/types'

const TYPE_BADGE: Record<SpecialAbility['type'], 'amber' | 'blue' | 'purple' | 'default'> = {
  'extraordinary':  'green' as never,
  'spell-like':     'blue',
  'supernatural':   'purple',
  'class feature':  'amber',
  'racial trait':   'default',
  'other':          'default',
}

const TYPE_ABBR: Record<SpecialAbility['type'], string> = {
  'extraordinary':  'Ex',
  'spell-like':     'Sp',
  'supernatural':   'Su',
  'class feature':  'Feat',
  'racial trait':   'Race',
  'other':          '—',
}

export function AbilitiesSection() {
  const { data, update } = useCharacterSheet()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!data) return null

  function addAbility() {
    const ability = defaultAbility(crypto.randomUUID())
    update({ abilities: [...data!.abilities, ability] })
    setExpandedId(ability.id)
  }

  function removeAbility(id: string) {
    update({ abilities: data!.abilities.filter(a => a.id !== id) })
  }

  function updateAbility(id: string, patch: Partial<SpecialAbility>) {
    update({ abilities: data!.abilities.map(a => a.id === id ? { ...a, ...patch } : a) })
  }

  function useCharge(id: string) {
    const ability = data!.abilities.find(a => a.id === id)
    if (!ability || ability.usesRemaining === null) return
    const next = Math.max(0, ability.usesRemaining - 1)
    updateAbility(id, { usesRemaining: next })
  }

  function resetAbility(id: string) {
    const ability = data!.abilities.find(a => a.id === id)
    if (!ability) return
    updateAbility(id, { usesRemaining: ability.usesPerDay })
  }

  return (
    <SectionPanel
      title={`Special Abilities (${data.abilities.length})`}
      action={<Button size="sm" onClick={addAbility}>+ Add Ability</Button>}
    >
      {data.abilities.length === 0 && (
        <p className="text-sm text-stone-500 text-center py-6">No special abilities added yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {data.abilities.map(ability => (
          <div key={ability.id} className="rounded border border-stone-700 bg-stone-900">
            {/* Header */}
            <div
              className="flex items-center gap-3 px-3 py-2 cursor-pointer"
              onClick={() => setExpandedId(expandedId === ability.id ? null : ability.id)}
            >
              <span className="flex-1 font-medium text-stone-200">
                {ability.name || <span className="text-stone-500 italic">Unnamed</span>}
              </span>
              <Badge variant={TYPE_BADGE[ability.type]}>
                {TYPE_ABBR[ability.type]}
              </Badge>

              {/* Uses tracker */}
              {ability.usesPerDay !== null && (
                <div
                  className="flex items-center gap-1 text-xs"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    className="px-1.5 py-0.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-300"
                    onClick={() => useCharge(ability.id)}
                    disabled={(ability.usesRemaining ?? 0) <= 0}
                  >
                    Use
                  </button>
                  <span className="text-stone-400">
                    {ability.usesRemaining ?? ability.usesPerDay}/{ability.usesPerDay}
                  </span>
                  <button
                    className="px-1.5 py-0.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-300"
                    onClick={() => resetAbility(ability.id)}
                  >
                    ↺
                  </button>
                </div>
              )}

              <Button
                variant="ghost" size="sm"
                className="text-stone-500 hover:text-red-400 p-1"
                onClick={e => { e.stopPropagation(); removeAbility(ability.id) }}
              >
                ✕
              </Button>
              <span className="text-stone-500 text-xs">{expandedId === ability.id ? '▲' : '▼'}</span>
            </div>

            {/* Editor */}
            {expandedId === ability.id && (
              <div className="border-t border-stone-700 px-3 py-3 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-stone-500">Name</span>
                    <input className="field" value={ability.name}
                      onChange={e => updateAbility(ability.id, { name: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-stone-500">Type</span>
                    <select className="field" value={ability.type}
                      onChange={e => updateAbility(ability.id, { type: e.target.value as SpecialAbility['type'] })}>
                      {(['extraordinary','spell-like','supernatural','class feature','racial trait','other'] as const)
                        .map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-stone-500">Uses / Day (blank = unlimited)</span>
                    <input className="field" type="number" min={0}
                      value={ability.usesPerDay ?? ''}
                      onChange={e => {
                        const v = e.target.value === '' ? null : Number(e.target.value)
                        updateAbility(ability.id, { usesPerDay: v, usesRemaining: v })
                      }} />
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-stone-500">Description</span>
                  <textarea className="field min-h-[70px] resize-y" value={ability.description}
                    onChange={e => updateAbility(ability.id, { description: e.target.value })} />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionPanel>
  )
}
