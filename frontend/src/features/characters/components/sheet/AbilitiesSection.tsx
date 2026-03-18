import { useEffect, useState, useMemo } from 'react'
import { SectionPanel }        from './SectionPanel'
import { Button }              from '@/components/ui/Button'
import { Badge }               from '@/components/ui/Badge'
import { useCharacterSheet }   from '../../hooks/useCharacterSheet'
import { useReferenceClasses } from '../../hooks/useReferenceClasses'
import { defaultAbility }      from '@/types/feat.types'
import { referenceAbilityService } from '../../services/reference-ability.service'
import { clsx }                from 'clsx'
import type { ReferenceAbilityResult, SpecialAbility } from '@/types'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ReferenceAbilityResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  if (!data) return null
  const characterData = data

  function addAbilityFromClassFeature(name: string, description: string) {
    const ability: SpecialAbility = {
      id:            crypto.randomUUID(),
      name,
      type:          'class feature',
      usesPerDay:    null,
      usesRemaining: null,
      description,
      locked:        true,
    }
    update({ abilities: [...characterData.abilities, ability] })
    setExpandedId(ability.id)
  }

  useEffect(() => {
    const query = searchTerm.trim()
    if (query.length < 2) {
      setSearchResults([])
      setSearchError(null)
      setIsSearching(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true)
        setSearchError(null)
        const co = characterData.classOptions ?? {}
        const results = await referenceAbilityService.search({
          q:             query,
          className:     characterData.className,
          race:          characterData.race,
          bloodlineName: co.bloodlineName   ?? undefined,
          mysteryName:   co.mysteryName     ?? undefined,
          domainName:    co.domainNames?.[0] ?? undefined,
          archetypeName: co.archetypeName   ?? undefined,
          limit: 20,
        })
        setSearchResults(results)
      } catch (error) {
        setSearchResults([])
        setSearchError(error instanceof Error ? error.message : 'Ability search failed')
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [
    characterData.className,
    characterData.race,
    characterData.classOptions?.bloodlineName,
    characterData.classOptions?.mysteryName,
    characterData.classOptions?.domainNames,
    characterData.classOptions?.archetypeName,
    searchTerm,
  ])

  function addAbility() {
    const ability = defaultAbility(crypto.randomUUID())
    update({ abilities: [...characterData.abilities, ability] })
    setExpandedId(ability.id)
  }

  function addAbilityFromReference(reference: ReferenceAbilityResult) {
    const ability = mapReferenceAbilityToAbility(reference)
    update({ abilities: [...characterData.abilities, ability] })
    setExpandedId(ability.id)
    setSearchTerm('')
    setSearchResults([])
    setSearchError(null)
  }

  function removeAbility(id: string) {
    update({ abilities: data!.abilities.filter(a => a.id !== id) })
  }

  function updateAbility(id: string, patch: Partial<SpecialAbility>) {
    update({ abilities: characterData.abilities.map(a => a.id === id ? { ...a, ...patch } : a) })
  }

  function useCharge(id: string) {
    const ability = characterData.abilities.find(a => a.id === id)
    if (!ability || ability.usesRemaining === null) return
    const next = Math.max(0, ability.usesRemaining - 1)
    updateAbility(id, { usesRemaining: next })
  }

  function resetAbility(id: string) {
    const ability = characterData.abilities.find(a => a.id === id)
    if (!ability) return
    updateAbility(id, { usesRemaining: ability.usesPerDay })
  }

  return (
    <SectionPanel
      title={`Special Abilities (${characterData.abilities.length})`}
      action={<Button size="sm" onClick={addAbility}>+ Add Ability</Button>}
    >
      {/* ── Class Features reference panel ──────────────────────────────── */}
      <ClassFeaturesPanel
        className={characterData.className}
        characterLevel={characterData.level}
        existingAbilityNames={characterData.abilities.map(a => a.name)}
        onAdd={addAbilityFromClassFeature}
      />

      <div className="mb-4 flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Search abilities in DB</span>
          <input
            className="field"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Type at least 2 characters..."
          />
        </label>

        {isSearching && (
          <p className="text-xs text-stone-500">Searching reference archive...</p>
        )}

        {searchError && (
          <p className="text-xs text-red-400">{searchError}</p>
        )}

        {searchResults.length > 0 && (
          <div className="max-h-80 overflow-y-auto rounded border border-stone-700 bg-stone-950">
            {searchResults.map(result => {
              const alreadyAdded = characterData.abilities.some(ability => ability.name === result.name)
              const sourceLabel   = getSourceLabel(result)
              const badgeVariant  = getSourceBadgeVariant(result)
              return (
                <button
                  key={`${result.kind}-${result.id}`}
                  type="button"
                  className="flex w-full items-start justify-between gap-3 border-b border-stone-800 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => addAbilityFromReference(result)}
                  disabled={alreadyAdded}
                >
                  <span className="flex flex-col min-w-0">
                    <span className="font-medium text-stone-200">{result.name}</span>
                    {result.sourceOptionName && (
                      <span className="text-[10px] text-stone-600 italic">{result.sourceOptionName}</span>
                    )}
                    <span className="text-xs text-stone-500 line-clamp-2">
                      {result.description ?? result.frequencyText ?? 'No summary available'}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={badgeVariant}>{sourceLabel}</Badge>
                    {result.levelRequirement !== null && (
                      <span className="text-[10px] text-stone-600">lv {result.levelRequirement}+</span>
                    )}
                    {alreadyAdded && <span className="text-xs text-stone-500">Added</span>}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {characterData.abilities.length === 0 && (
        <p className="text-sm text-stone-500 text-center py-6">No special abilities added yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {characterData.abilities.map(ability => {
          const isLocked = ability.locked !== false
          return (
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

                {/* Uses tracker — always active regardless of lock */}
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
                  className={`p-1 ${isLocked ? 'text-amber-400 hover:text-amber-300' : 'text-stone-400 hover:text-stone-200'}`}
                  title={isLocked ? 'Unlock ability fields' : 'Lock ability fields'}
                  onClick={e => { e.stopPropagation(); updateAbility(ability.id, { locked: !isLocked }) }}
                >
                  {isLocked ? '🔒' : '🔓'}
                </Button>
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
                  {isLocked && (
                    <p className="text-xs text-amber-400/70 italic">
                      Fields are locked. Click 🔒 to enable editing.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-stone-500">Name</span>
                      <input className="field" value={ability.name} disabled={isLocked}
                        onChange={e => updateAbility(ability.id, { name: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-stone-500">Type</span>
                      <select className="field" value={ability.type} disabled={isLocked}
                        onChange={e => updateAbility(ability.id, { type: e.target.value as SpecialAbility['type'] })}>
                        {(['extraordinary','spell-like','supernatural','class feature','racial trait','other'] as const)
                          .map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-stone-500">Uses / Day (blank = unlimited)</span>
                      <input className="field" type="number" min={0} disabled={isLocked}
                        value={ability.usesPerDay ?? ''}
                        onChange={e => {
                          const v = e.target.value === '' ? null : Number(e.target.value)
                          updateAbility(ability.id, { usesPerDay: v, usesRemaining: v })
                        }} />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-stone-500">Description</span>
                    <textarea className="field min-h-[120px] resize-y" value={ability.description} disabled={isLocked}
                      onChange={e => updateAbility(ability.id, { description: e.target.value })} />
                  </label>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SectionPanel>
  )
}

// ---------------------------------------------------------------------------
// Class Features reference panel
// ---------------------------------------------------------------------------

interface ClassFeaturesPanelProps {
  className:            string
  characterLevel:       number
  existingAbilityNames: string[]
  onAdd:                (name: string, description: string) => void
}

function ClassFeaturesPanel({
  className, characterLevel, existingAbilityNames, onAdd,
}: ClassFeaturesPanelProps) {
  const { classes, isLoading } = useReferenceClasses()
  const [open, setOpen]         = useState(false)
  const [expandedName, setExpandedName] = useState<string | null>(null)

  const refClass = useMemo(
    () => classes.find(c => c.name.toLowerCase() === className.toLowerCase()) ?? null,
    [classes, className],
  )

  // Features available at or below the character's current level
  const features = useMemo(() => {
    if (!refClass?.classFeatures) return []
    return refClass.classFeatures
      .filter(f => f.level === undefined || f.level === null || f.level <= characterLevel)
      .slice()
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
  }, [refClass, characterLevel])

  if (!className) return null

  return (
    <div className="mb-4 rounded-lg border border-stone-700/50 bg-stone-900/40">
      {/* Panel header */}
      <button
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Class Features
          </span>
          {isLoading ? (
            <span className="text-[10px] text-stone-600 italic">loading…</span>
          ) : !refClass ? (
            <span className="text-[10px] text-amber-600/70 italic">
              "{className}" not in reference archive
            </span>
          ) : (
            <span className="rounded-full bg-stone-800 border border-stone-700/60 px-2 py-0.5 text-[10px] text-stone-400">
              {features.length} up to lv {characterLevel}
            </span>
          )}
        </span>
        <span className="text-stone-600 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* Feature list */}
      {open && features.length > 0 && (
        <div className="border-t border-stone-800/60 flex flex-col divide-y divide-stone-800/40">
          {features.map(f => {
            const alreadyAdded = existingAbilityNames.some(
              n => n.toLowerCase() === f.name.toLowerCase(),
            )
            const isExpanded = expandedName === f.name

            return (
              <div key={f.name} className="px-3 py-2">
                {/* Feature header row */}
                <div className="flex items-start gap-2">
                  {/* Level badge */}
                  {f.level != null && (
                    <span className="mt-0.5 shrink-0 rounded bg-stone-800 border border-stone-700/50 px-1.5 py-0.5 text-[10px] font-mono text-stone-500">
                      lv {f.level}
                    </span>
                  )}

                  {/* Name — clickable to expand description */}
                  <button
                    className="flex-1 text-left text-sm font-medium text-stone-200 hover:text-stone-100"
                    onClick={() => setExpandedName(isExpanded ? null : f.name)}
                  >
                    {f.name}
                  </button>

                  {/* Add / Added */}
                  {alreadyAdded ? (
                    <span className="shrink-0 text-[10px] text-emerald-600/70 italic self-center">
                      ✓ Added
                    </span>
                  ) : (
                    <button
                      className={clsx(
                        'shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors',
                        'border-stone-600/60 bg-stone-800/40 text-stone-400',
                        'hover:border-amber-600/60 hover:bg-amber-950/20 hover:text-amber-300',
                      )}
                      onClick={() => onAdd(f.name, f.description)}
                    >
                      + Add
                    </button>
                  )}

                  <button
                    className="text-stone-600 text-[10px] shrink-0 self-center ml-1"
                    onClick={() => setExpandedName(isExpanded ? null : f.name)}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>

                {/* Description */}
                {isExpanded && f.description && (
                  <p className="mt-2 text-xs text-stone-400 leading-relaxed whitespace-pre-wrap pl-1">
                    {f.description}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {open && features.length === 0 && !isLoading && refClass && (
        <p className="border-t border-stone-800/60 px-3 py-3 text-xs text-stone-500 italic">
          No class features found for {className} up to level {characterLevel}.
        </p>
      )}
    </div>
  )
}

function mapReferenceAbilityToAbility(reference: ReferenceAbilityResult): SpecialAbility {
  const type = normalizeAbilityType(reference.abilityType, reference.kind, reference.category)
  const description = [
    reference.description,
    reference.frequencyText ? `Frequency: ${reference.frequencyText}` : null,
    reference.levelRequirement !== null ? `Level requirement: ${reference.levelRequirement}+` : null,
    reference.sourceOptionName ? `Source option: ${reference.sourceOptionName}` : null,
  ].filter(Boolean).join('\n')

  return {
    id: crypto.randomUUID(),
    name: reference.name,
    type,
    usesPerDay: reference.usesPerDay,
    usesRemaining: reference.usesPerDay,
    description,
    locked: true,
  }
}

function normalizeAbilityType(
  value: string | null,
  kind: ReferenceAbilityResult['kind'],
  category: string | null,
): SpecialAbility['type'] {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'extraordinary') return 'extraordinary'
  if (normalized === 'spell-like') return 'spell-like'
  if (normalized === 'supernatural') return 'supernatural'
  if (category === 'race' || category?.includes('racial')) return 'racial trait'
  if (
    kind === 'talent' ||
    category === 'revelation' ||
    category === 'discovery' ||
    category === 'domain power' ||
    category === 'bloodline power' ||
    category?.includes('order') ||
    category?.includes('inquisition')
  ) return 'class feature'
  return 'other'
}

// ---------------------------------------------------------------------------
// Search result display helpers
// ---------------------------------------------------------------------------

const SOURCE_LABEL: Record<string, string> = {
  talent:           'talent',
  ability:          'ability',
  revelation:       'revelation',
  discovery:        'discovery',
  'domain power':   'domain power',
  'bloodline power':'bloodline power',
  race:             'racial trait',
  class:            'class ability',
  archetype:        'archetype ability',
}

function getSourceLabel(result: ReferenceAbilityResult): string {
  if (result.kind === 'talent') {
    return result.category ?? 'talent'
  }
  return SOURCE_LABEL[result.category ?? ''] ?? result.category ?? 'ability'
}

function getSourceBadgeVariant(result: ReferenceAbilityResult): 'amber' | 'blue' | 'purple' | 'default' {
  if (result.kind === 'talent') return 'amber'
  switch (result.category) {
    case 'revelation':      return 'purple'
    case 'bloodline power': return 'purple'
    case 'discovery':       return 'blue'
    case 'domain power':    return 'blue'
    case 'class':           return 'blue'
    case 'archetype':       return 'blue'
    case 'race':            return 'default'
    default:                return 'blue'
  }
}
