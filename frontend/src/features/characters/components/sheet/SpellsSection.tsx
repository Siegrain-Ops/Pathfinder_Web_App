import { useEffect, useState } from 'react'
import { SectionPanel }      from './SectionPanel'
import { StatInput }         from './StatInput'
import { Button }            from '@/components/ui/Button'
import { Badge }             from '@/components/ui/Badge'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'
import { calcSpellDC }       from '@/lib/formulas/spells.formulas'
import { referenceSpellService } from '../../services/reference-spell.service'
import type { ReferenceSpell, Spell, SpellSection } from '@/types'
import type { AbilityScoreName } from '@/types'
import { ABILITY_ABBR } from '@/lib/constants'

const CASTING_STATS: AbilityScoreName[] = ['intelligence', 'wisdom', 'charisma']

const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export function SpellsSection() {
  const { data, update } = useCharacterSheet()
  const [activeLevel, setActiveLevel] = useState<number>(0)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [searchTerm, setSearchTerm]   = useState('')
  const [searchResults, setSearchResults] = useState<ReferenceSpell[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  if (!data) return null

  const { spells, stats } = data
  const castingMod = stats[spells.castingStat].modifier
  const classKey = inferClassKey(data.className)

  function updateSpells(patch: Partial<SpellSection>) {
    update({ spells: { ...data!.spells, ...patch } })
  }

  function addSpell() {
    const spell: Spell = {
      id:              crypto.randomUUID(),
      name:            '',
      level:           activeLevel as Spell['level'],
      school:          'evocation',
      castingTime:     '1 standard action',
      range:           '',
      duration:        '',
      savingThrow:     '',
      spellResistance: false,
      components:      ['V', 'S'],
      description:     '',
      prepared:        0,
      cast:            0,
    }
    updateSpells({ knownSpells: [...spells.knownSpells, spell] })
    setExpandedId(spell.id)
  }

  function removeSpell(id: string) {
    updateSpells({ knownSpells: spells.knownSpells.filter(s => s.id !== id) })
  }

  function updateSpell(id: string, patch: Partial<Spell>) {
    updateSpells({
      knownSpells: spells.knownSpells.map(s => s.id === id ? { ...s, ...patch } : s),
    })
  }

  function addSpellFromReference(referenceSpell: ReferenceSpell) {
    const spell = mapReferenceSpellToSpell(referenceSpell, activeLevel)
    updateSpells({ knownSpells: [...spells.knownSpells, spell] })
    setExpandedId(spell.id)
    setSearchTerm('')
    setSearchResults([])
    setSearchError(null)
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
        const results = await referenceSpellService.search({
          q: query,
          className: classKey,
          level: activeLevel,
          limit: 12,
        })
        setSearchResults(results)
      } catch (error) {
        setSearchResults([])
        setSearchError(error instanceof Error ? error.message : 'Spell search failed')
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [activeLevel, classKey, searchTerm])

  const spellsForLevel = spells.knownSpells.filter(s => s.level === activeLevel)

  return (
    <div className="flex flex-col gap-4">
      {/* ── Caster Info ─────────────────────────────────────── */}
      <SectionPanel title="Caster Info">
        <div className="flex flex-wrap gap-6 items-end">
          <StatInput
            label="Caster Level"
            value={spells.casterLevel}
            onChange={v => updateSpells({ casterLevel: v })}
            min={0} max={20}
          />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">
              Casting Stat
            </span>
            <select
              className="field w-32 text-sm py-1"
              value={spells.castingStat}
              onChange={e => updateSpells({ castingStat: e.target.value as AbilityScoreName })}
            >
              {CASTING_STATS.map(s => (
                <option key={s} value={s}>{ABILITY_ABBR[s]} — {s}</option>
              ))}
            </select>
          </div>

          {/* Derived */}
          <InfoStat label="Stat Modifier" value={castingMod >= 0 ? `+${castingMod}` : `${castingMod}`} />
          <InfoStat label="Base Spell DC" value={String(spells.spellDC)} />
          <InfoStat label="Concentration"  value={spells.concentrationBonus >= 0
            ? `+${spells.concentrationBonus}` : `${spells.concentrationBonus}`} />
        </div>
      </SectionPanel>

      {/* ── Spells per Day ──────────────────────────────────── */}
      <SectionPanel title="Spells per Day">
        <div className="flex flex-wrap gap-3">
          {SPELL_LEVELS.map(lvl => (
            <StatInput
              key={lvl}
              label={`Lvl ${lvl}`}
              value={spells.spellsPerDay[lvl]}
              onChange={v => {
                const next = [...spells.spellsPerDay] as SpellSection['spellsPerDay']
                next[lvl] = v
                updateSpells({ spellsPerDay: next })
              }}
              min={0}
            />
          ))}
        </div>
      </SectionPanel>

      {/* ── Spell List ──────────────────────────────────────── */}
      <SectionPanel
        title="Known Spells"
        action={<Button size="sm" onClick={addSpell}>+ Add Spell</Button>}
      >
        <div className="mb-4 flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">
              Search spells in DB{classKey ? ` for ${classKey}` : ''} at level {activeLevel}
            </span>
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
            <div className="max-h-72 overflow-y-auto rounded border border-stone-700 bg-stone-950">
              {searchResults.map(result => {
                const alreadyAdded = spells.knownSpells.some(spell => spell.name === result.name && spell.level === activeLevel)
                return (
                  <button
                    key={result.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-3 border-b border-stone-800 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => addSpellFromReference(result)}
                    disabled={alreadyAdded}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium text-stone-200">{result.name}</span>
                      <span className="text-xs text-stone-500">
                        {formatReferenceLevels(result.spellLevelJson)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant="purple">{result.school ?? 'unknown'}</Badge>
                      {alreadyAdded && <span className="text-xs text-stone-500">Added</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Level filter tabs */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {SPELL_LEVELS.map(lvl => {
            const count = spells.knownSpells.filter(s => s.level === lvl).length
            return (
              <button
                key={lvl}
                onClick={() => setActiveLevel(lvl)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeLevel === lvl
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                }`}
              >
                {lvl === 0 ? 'Cantrips' : `Level ${lvl}`}
                {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            )
          })}
        </div>

        {/* DC for current level */}
        {activeLevel > 0 && (
          <p className="text-xs text-stone-500 mb-3">
            DC for level {activeLevel} spells:{' '}
            <span className="text-amber-300 font-bold">
              {calcSpellDC(activeLevel, castingMod)}
            </span>
          </p>
        )}

        {spellsForLevel.length === 0 && (
          <p className="text-sm text-stone-500 text-center py-4">
            No {activeLevel === 0 ? 'cantrips' : `level ${activeLevel} spells`} added.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {spellsForLevel.map(spell => (
            <div key={spell.id} className="rounded border border-stone-700 bg-stone-900">
              {/* Header */}
              <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                onClick={() => setExpandedId(expandedId === spell.id ? null : spell.id)}
              >
                <span className="flex-1 font-medium text-stone-200">
                  {spell.name || <span className="text-stone-500 italic">Unnamed Spell</span>}
                </span>
                <Badge variant="purple">{spell.school}</Badge>
                <Button
                  variant="ghost" size="sm"
                  className="text-stone-500 hover:text-red-400 p-1"
                  onClick={e => { e.stopPropagation(); removeSpell(spell.id) }}
                >
                  ✕
                </Button>
                <span className="text-stone-500 text-xs">{expandedId === spell.id ? '▲' : '▼'}</span>
              </div>

              {/* Editor */}
              {expandedId === spell.id && (
                <div className="border-t border-stone-700 px-3 py-3 flex flex-col gap-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <SpellField label="Name">
                      <input className="field" value={spell.name}
                        onChange={e => updateSpell(spell.id, { name: e.target.value })} />
                    </SpellField>
                    <SpellField label="School">
                      <select className="field" value={spell.school}
                        onChange={e => updateSpell(spell.id, { school: e.target.value as Spell['school'] })}>
                        {(['abjuration','conjuration','divination','enchantment','evocation',
                          'illusion','necromancy','transmutation','universal'] as const)
                          .map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </SpellField>
                    <SpellField label="Casting Time">
                      <input className="field" value={spell.castingTime}
                        onChange={e => updateSpell(spell.id, { castingTime: e.target.value })} />
                    </SpellField>
                    <SpellField label="Range">
                      <input className="field" value={spell.range}
                        onChange={e => updateSpell(spell.id, { range: e.target.value })} />
                    </SpellField>
                    <SpellField label="Duration">
                      <input className="field" value={spell.duration}
                        onChange={e => updateSpell(spell.id, { duration: e.target.value })} />
                    </SpellField>
                    <SpellField label="Saving Throw">
                      <input className="field" value={spell.savingThrow}
                        onChange={e => updateSpell(spell.id, { savingThrow: e.target.value })} />
                    </SpellField>
                  </div>
                  <SpellField label="Description">
                    <textarea className="field min-h-[70px] resize-y" value={spell.description}
                      onChange={e => updateSpell(spell.id, { description: e.target.value })} />
                  </SpellField>
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionPanel>
    </div>
  )
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-bold font-mono text-amber-300">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-stone-500">{label}</span>
    </div>
  )
}

function SpellField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-stone-500">{label}</span>
      {children}
    </label>
  )
}

function inferClassKey(className: string): string | undefined {
  const normalized = className.trim().toLowerCase()
  if (!normalized) return undefined

  const aliases: Record<string, string> = {
    sorcerer: 'sorcerer',
    wizard: 'wizard',
    cleric: 'cleric',
    druid: 'druid',
    bard: 'bard',
    paladin: 'paladin',
    ranger: 'ranger',
    inquisitor: 'inquisitor',
    summoner: 'summoner',
    witch: 'witch',
    magus: 'magus',
    alchemist: 'alchemist',
    oracle: 'oracle',
    antipaladin: 'antipaladin',
  }

  return aliases[normalized] ?? normalized.split(/\s+/)[0]
}

function mapReferenceSpellToSpell(referenceSpell: ReferenceSpell, fallbackLevel: number): Spell {
  const school = normalizeSchool(referenceSpell.school)
  const components = parseComponents(referenceSpell.components)
  const preferredLevel = getPreferredLevel(referenceSpell, fallbackLevel)

  return {
    id: crypto.randomUUID(),
    name: referenceSpell.name,
    level: preferredLevel,
    school,
    castingTime: referenceSpell.castingTime ?? '',
    range: referenceSpell.rangeText ?? referenceSpell.targetText ?? referenceSpell.areaText ?? referenceSpell.effectText ?? '',
    duration: referenceSpell.durationText ?? '',
    savingThrow: referenceSpell.savingThrow ?? '',
    spellResistance: isSpellResistanceEnabled(referenceSpell.spellResistance),
    components,
    description: referenceSpell.description,
    prepared: 0,
    cast: 0,
  }
}

function normalizeSchool(value: string | null): Spell['school'] {
  const fallback: Spell['school'] = 'evocation'
  if (!value) return fallback

  const normalized = value.trim().toLowerCase() as Spell['school']
  const validSchools: Spell['school'][] = [
    'abjuration', 'conjuration', 'divination', 'enchantment', 'evocation',
    'illusion', 'necromancy', 'transmutation', 'universal',
  ]

  return validSchools.includes(normalized) ? normalized : fallback
}

function parseComponents(value: string | null): Spell['components'] {
  if (!value) return ['V', 'S']

  const allowed = new Set<Spell['components'][number]>(['V', 'S', 'M', 'F', 'DF', 'XP'])
  const components = value
    .split(/[,\s/]+/)
    .map(token => token.replace(/[()]/g, '').toUpperCase())
    .filter((token): token is Spell['components'][number] => allowed.has(token as Spell['components'][number]))

  return components.length > 0 ? components : ['V', 'S']
}

function isSpellResistanceEnabled(value: string | null): boolean {
  if (!value) return false
  return !/^no\b/i.test(value.trim())
}

function getPreferredLevel(referenceSpell: ReferenceSpell, fallbackLevel: number): Spell['level'] {
  const levels = Object.values(referenceSpell.spellLevelJson)
    .filter((value): value is number => Number.isInteger(value) && value >= 0 && value <= 9)

  if (levels.includes(fallbackLevel)) return fallbackLevel as Spell['level']
  return (levels[0] ?? fallbackLevel) as Spell['level']
}

function formatReferenceLevels(levels: Record<string, number>): string {
  const entries = Object.entries(levels)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([className, level]) => `${className} ${level}`)

  return entries.join(' • ')
}
