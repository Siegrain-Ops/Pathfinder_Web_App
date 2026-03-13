import { useEffect, useState } from 'react'
import { SectionPanel } from './SectionPanel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'
import { defaultFeat } from '@/types/feat.types'
import { referenceFeatService } from '../../services/reference-feat.service'
import type { Feat, ReferenceFeat } from '@/types'

export function FeatsSection() {
  const { data, update } = useCharacterSheet()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ReferenceFeat[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  if (!data) return null
  const characterData = data

  function addFeat() {
    const feat = defaultFeat(crypto.randomUUID())
    update({ feats: [...characterData.feats, feat] })
    setExpandedId(feat.id)
  }

  function addFeatFromReference(referenceFeat: ReferenceFeat) {
    const feat = mapReferenceFeatToFeat(referenceFeat)
    update({ feats: [...characterData.feats, feat] })
    setExpandedId(feat.id)
    setSearchTerm('')
    setSearchResults([])
    setSearchError(null)
  }

  function removeFeat(id: string) {
    update({ feats: characterData.feats.filter(f => f.id !== id) })
  }

  function updateFeat(id: string, patch: Partial<Feat>) {
    update({ feats: characterData.feats.map(f => f.id === id ? { ...f, ...patch } : f) })
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
        const results = await referenceFeatService.search({ q: query, limit: 12 })
        setSearchResults(results)
      } catch (error) {
        setSearchResults([])
        setSearchError(error instanceof Error ? error.message : 'Feat search failed')
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [searchTerm])

  return (
    <SectionPanel
      title={`Feats (${data.feats.length})`}
      action={<Button size="sm" onClick={addFeat}>+ Add Feat</Button>}
    >
      <div className="mb-4 flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Search feats in DB</span>
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
              const alreadyAdded = data.feats.some(feat => feat.name === result.name)
              return (
                <button
                  key={result.id}
                  type="button"
                  className="flex w-full items-start justify-between gap-3 border-b border-stone-800 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => addFeatFromReference(result)}
                  disabled={alreadyAdded}
                >
                  <span className="flex flex-col">
                    <span className="font-medium text-stone-200">{result.name}</span>
                    <span className="text-xs text-stone-500 line-clamp-2">
                      {result.prerequisites ?? result.description ?? 'No summary available'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="amber">{normalizeFeatType(result.featType)}</Badge>
                    {alreadyAdded && <span className="text-xs text-stone-500">Added</span>}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {characterData.feats.length === 0 && (
        <p className="text-sm text-stone-500 text-center py-6">No feats added yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {characterData.feats.map(feat => {
          const isLocked = feat.locked !== false
          return (
            <div key={feat.id} className="rounded border border-stone-700 bg-stone-900">
              <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                onClick={() => setExpandedId(expandedId === feat.id ? null : feat.id)}
              >
                <span className="flex-1 font-medium text-stone-200">
                  {feat.name || <span className="text-stone-500 italic">Unnamed Feat</span>}
                </span>
                <span className="text-xs text-stone-500 capitalize">{feat.type}</span>
                <Button
                  variant="ghost" size="sm"
                  className={`p-1 ${isLocked ? 'text-amber-400 hover:text-amber-300' : 'text-stone-400 hover:text-stone-200'}`}
                  title={isLocked ? 'Unlock feat fields' : 'Lock feat fields'}
                  onClick={e => { e.stopPropagation(); updateFeat(feat.id, { locked: !isLocked }) }}
                >
                  {isLocked ? '🔒' : '🔓'}
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="text-stone-500 hover:text-red-400 p-1"
                  onClick={e => { e.stopPropagation(); removeFeat(feat.id) }}
                >
                  ×
                </Button>
                <span className="text-stone-500 text-xs">{expandedId === feat.id ? '▲' : '▼'}</span>
              </div>

              {expandedId === feat.id && (
                <div className="border-t border-stone-700 px-3 py-3 flex flex-col gap-3">
                  {isLocked && (
                    <p className="text-xs text-amber-400/70 italic">
                      Fields are locked. Click 🔒 to enable editing.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <FeatField label="Name">
                      <input
                        className="field"
                        value={feat.name}
                        disabled={isLocked}
                        onChange={e => updateFeat(feat.id, { name: e.target.value })}
                      />
                    </FeatField>
                    <FeatField label="Type">
                      <select
                        className="field"
                        value={feat.type}
                        disabled={isLocked}
                        onChange={e => updateFeat(feat.id, { type: e.target.value as Feat['type'] })}
                      >
                        {(['combat', 'general', 'metamagic', 'item creation', 'teamwork', 'racial', 'monster', 'mythic', 'other'] as const)
                          .map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </FeatField>
                  </div>
                  <FeatField label="Prerequisites">
                    <input
                      className="field"
                      value={feat.prerequisites}
                      disabled={isLocked}
                      onChange={e => updateFeat(feat.id, { prerequisites: e.target.value })}
                    />
                  </FeatField>
                  <FeatField label="Benefit">
                    <textarea
                      className="field min-h-[120px] resize-y"
                      value={feat.benefit}
                      disabled={isLocked}
                      onChange={e => updateFeat(feat.id, { benefit: e.target.value })}
                    />
                  </FeatField>
                  <FeatField label="Normal">
                    <textarea
                      className="field min-h-[80px] resize-y"
                      value={feat.normal}
                      disabled={isLocked}
                      onChange={e => updateFeat(feat.id, { normal: e.target.value })}
                    />
                  </FeatField>
                  <FeatField label="Special">
                    <textarea
                      className="field min-h-[80px] resize-y"
                      value={feat.special}
                      disabled={isLocked}
                      onChange={e => updateFeat(feat.id, { special: e.target.value })}
                    />
                  </FeatField>
                  <FeatField label="Notes">
                    <textarea
                      className="field min-h-[80px] resize-y"
                      value={feat.notes}
                      disabled={isLocked}
                      onChange={e => updateFeat(feat.id, { notes: e.target.value })}
                    />
                  </FeatField>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SectionPanel>
  )
}

function FeatField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-stone-500">{label}</span>
      {children}
    </label>
  )
}

function mapReferenceFeatToFeat(referenceFeat: ReferenceFeat): Feat {
  return {
    id: crypto.randomUUID(),
    name: referenceFeat.name,
    type: normalizeFeatType(referenceFeat.featType),
    prerequisites: referenceFeat.prerequisites ?? '',
    benefit: referenceFeat.benefit ?? referenceFeat.description ?? '',
    normal: referenceFeat.normalText ?? '',
    special: referenceFeat.specialText ?? '',
    notes: '',
    locked: true,
  }
}

function normalizeFeatType(value: string | null): Feat['type'] {
  const normalized = value?.trim().toLowerCase()
  const validTypes: Feat['type'][] = [
    'combat',
    'general',
    'metamagic',
    'item creation',
    'teamwork',
    'racial',
    'monster',
    'mythic',
    'other',
  ]

  if (!normalized) return 'other'
  return validTypes.includes(normalized as Feat['type']) ? normalized as Feat['type'] : 'other'
}
