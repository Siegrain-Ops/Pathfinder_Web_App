import { useState }          from 'react'
import { SectionPanel }      from './SectionPanel'
import { Button }            from '@/components/ui/Button'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'
import { defaultFeat }       from '@/types/feat.types'
import type { Feat }         from '@/types'

export function FeatsSection() {
  const { data, update } = useCharacterSheet()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!data) return null

  function addFeat() {
    const feat = defaultFeat(crypto.randomUUID())
    update({ feats: [...data!.feats, feat] })
    setExpandedId(feat.id)
  }

  function removeFeat(id: string) {
    update({ feats: data!.feats.filter(f => f.id !== id) })
  }

  function updateFeat(id: string, patch: Partial<Feat>) {
    update({ feats: data!.feats.map(f => f.id === id ? { ...f, ...patch } : f) })
  }

  return (
    <SectionPanel
      title={`Feats (${data.feats.length})`}
      action={<Button size="sm" onClick={addFeat}>+ Add Feat</Button>}
    >
      {data.feats.length === 0 && (
        <p className="text-sm text-stone-500 text-center py-6">No feats added yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {data.feats.map(feat => (
          <div key={feat.id} className="rounded border border-stone-700 bg-stone-900">
            {/* Header row */}
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
                className="text-stone-500 hover:text-red-400 p-1"
                onClick={e => { e.stopPropagation(); removeFeat(feat.id) }}
              >
                ✕
              </Button>
              <span className="text-stone-500 text-xs">{expandedId === feat.id ? '▲' : '▼'}</span>
            </div>

            {/* Expanded editor */}
            {expandedId === feat.id && (
              <div className="border-t border-stone-700 px-3 py-3 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <FeatField label="Name">
                    <input
                      className="field"
                      value={feat.name}
                      onChange={e => updateFeat(feat.id, { name: e.target.value })}
                    />
                  </FeatField>
                  <FeatField label="Type">
                    <select
                      className="field"
                      value={feat.type}
                      onChange={e => updateFeat(feat.id, { type: e.target.value as Feat['type'] })}
                    >
                      {(['combat','general','metamagic','item creation','teamwork','racial','other'] as const)
                        .map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FeatField>
                </div>
                <FeatField label="Prerequisites">
                  <input className="field" value={feat.prerequisites}
                    onChange={e => updateFeat(feat.id, { prerequisites: e.target.value })} />
                </FeatField>
                <FeatField label="Benefit">
                  <textarea className="field min-h-[60px] resize-y" value={feat.benefit}
                    onChange={e => updateFeat(feat.id, { benefit: e.target.value })} />
                </FeatField>
                <FeatField label="Notes">
                  <textarea className="field min-h-[40px] resize-y" value={feat.notes}
                    onChange={e => updateFeat(feat.id, { notes: e.target.value })} />
                </FeatField>
              </div>
            )}
          </div>
        ))}
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
