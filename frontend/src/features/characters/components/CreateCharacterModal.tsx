import { useForm, useWatch } from 'react-hook-form'
import { zodResolver }        from '@hookform/resolvers/zod'
import { useNavigate }        from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Modal }              from '@/components/ui/Modal'
import { Button }             from '@/components/ui/Button'
import {
  characterIdentitySchema,
  type CharacterIdentityFormValues,
} from '@/lib/validators/character.validators'
import { ALIGNMENTS, COMMON_CLASSES, COMMON_RACES } from '@/lib/constants'
import { useCharacterStore }   from '@/app/store/characterStore'
import { recomputeCharacter }  from '@/lib/formulas/character.formulas'
import { createBlankCharacter } from '@/lib/utils/character.utils'
import type { Alignment, ClassOptions, ReferenceRace, SizeCategory } from '@/types'
import { useReferenceRaces }    from '../hooks/useReferenceRaces'
import { useReferenceClasses }  from '../hooks/useReferenceClasses'
import { useReferenceArchetypes } from '../hooks/useReferenceArchetypes'
import { useReferenceBloodlines } from '../hooks/useReferenceBloodlines'
import { useReferenceDomains }    from '../hooks/useReferenceDomains'
import { useReferenceMysteries }  from '../hooks/useReferenceMysteries'

// ── Class-option feature detection ──────────────────────────────────────────

const BLOODLINE_CLASSES  = ['sorcerer', 'bloodrager']
const DOMAIN_CLASSES     = ['cleric', 'druid', 'inquisitor']
const MYSTERY_CLASSES    = ['oracle']
const WIZARD_CLASSES     = ['wizard']
/** Clerics pick 2 domains; others pick 1 */
const TWO_DOMAIN_CLASSES = ['cleric']

const BONDED_ITEM_KINDS = ['Amulet', 'Ring', 'Staff', 'Wand', 'Sword', 'Dagger', 'Axe', 'Bow', 'Other'] as const
const FAMILIAR_KINDS    = ['Bat', 'Cat', 'Fox', 'Hawk', 'Lizard', 'Monkey', 'Owl', 'Rat', 'Raven', 'Snake', 'Toad', 'Weasel', 'Other'] as const

function classKey(name: string) { return name.toLowerCase() }
function hasBloodline(cls: string)    { return BLOODLINE_CLASSES.includes(classKey(cls)) }
function hasDomains(cls: string)      { return DOMAIN_CLASSES.includes(classKey(cls)) }
function hasMystery(cls: string)      { return MYSTERY_CLASSES.includes(classKey(cls)) }
function hasArcaneBond(cls: string)   { return WIZARD_CLASSES.includes(classKey(cls)) }
function domainCount(cls: string)     { return TWO_DOMAIN_CLASSES.includes(classKey(cls)) ? 2 : 1 }

// ── Component ────────────────────────────────────────────────────────────────

interface CreateCharacterModalProps {
  open:    boolean
  onClose: () => void
}

export function CreateCharacterModal({ open, onClose }: CreateCharacterModalProps) {
  const navigate = useNavigate()
  const { races,   isLoading: racesLoading   } = useReferenceRaces()
  const { classes, isLoading: classesLoading } = useReferenceClasses()
  const raceOptions  = races.length   > 0 ? races.map(r => r.name)   : COMMON_RACES
  const classOptions = classes.length > 0 ? classes.map(c => c.name) : COMMON_CLASSES

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CharacterIdentityFormValues>({
    resolver: zodResolver(characterIdentitySchema),
    defaultValues: {
      name:              '',
      playerName:        '',
      race:              'Human',
      className:         'Fighter',
      level:             1,
      alignment:         'True Neutral',
      background:        '',
      deity:             '',
      size:              'Medium',
      age:               20,
      gender:            '',
      height:            '',
      weight:            '',
      homeland:          '',
      favoredClassBonus: 'hp',
    },
  })

  const favoredClassBonus = useWatch({ control, name: 'favoredClassBonus' })
  const selectedClassName = useWatch({ control, name: 'className' })

  // Class-option hooks — each guards against empty className internally
  const { archetypes, isLoading: archetypesLoading } = useReferenceArchetypes(selectedClassName)
  const { bloodlines, isLoading: bloodlinesLoading } = useReferenceBloodlines(
    hasBloodline(selectedClassName) ? selectedClassName : '',
  )
  const { domains, isLoading: domainsLoading } = useReferenceDomains(
    hasDomains(selectedClassName) ? selectedClassName : '',
  )
  const { mysteries, isLoading: mysteriesLoading } = useReferenceMysteries(
    hasMystery(selectedClassName) ? selectedClassName : '',
  )

  // Selected class options — managed outside react-hook-form to keep schema clean
  const [selClassOptions, setSelClassOptions] = useState<ClassOptions>({})

  // Reset class options whenever the class changes
  useEffect(() => {
    setSelClassOptions({})
  }, [selectedClassName])

  const showBloodline   = hasBloodline(selectedClassName)  && bloodlines.length  > 0
  const showDomains     = hasDomains(selectedClassName)    && domains.length     > 0
  const showMystery     = hasMystery(selectedClassName)    && mysteries.length   > 0
  const showArchetypes  = archetypes.length > 0
  const showArcaneBond  = hasArcaneBond(selectedClassName)
  const showSection     = showBloodline || showDomains || showMystery || showArchetypes || showArcaneBond

  const nDomains = domainCount(selectedClassName)

  function setDomain(slot: 0 | 1, id: string, name: string) {
    setSelClassOptions(prev => {
      const ids   = [...(prev.domainIds   ?? [])]
      const names = [...(prev.domainNames ?? [])]
      ids[slot]   = id
      names[slot] = name
      return { ...prev, domainIds: ids.filter(Boolean), domainNames: names.filter(Boolean) }
    })
  }

  const onSubmit = async (values: CharacterIdentityFormValues) => {
    const blank = createBlankCharacter()
    const selectedRace = races.find(r => r.name === values.race) ?? null
    const data  = applyReferenceRaceDefaults(recomputeCharacter({
      ...blank,
      ...values,
      alignment:    values.alignment as Alignment,
      size:         values.size as SizeCategory,
      classOptions: selClassOptions,
    }), selectedRace)
    const referenceRaceId = selectedRace?.id ?? null
    const character = await useCharacterStore.getState().createCharacterWithData(data, referenceRaceId)
    reset()
    setSelClassOptions({})
    onClose()
    navigate(`/characters/${character.id}/setup`)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Character" className="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Row: Name + Player */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Character Name *" error={errors.name?.message}>
            <input {...register('name')} placeholder="Valeron" />
          </Field>
          <Field label="Player Name" error={errors.playerName?.message}>
            <input {...register('playerName')} placeholder="Optional" />
          </Field>
        </div>

        {/* Row: Race + Class + Level */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Race *" error={errors.race?.message}>
            <select className="field" {...register('race')} disabled={racesLoading}>
              {raceOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Class *" error={errors.className?.message}>
            <select className="field" {...register('className')} disabled={classesLoading}>
              {classOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Level" error={errors.level?.message}>
            <input {...register('level', { valueAsNumber: true })} type="number" min={1} max={20} />
          </Field>
        </div>

        {/* Alignment */}
        <Field label="Alignment" error={errors.alignment?.message}>
          <select {...register('alignment')}>
            {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>

        {/* ── Class Options (conditional) ──────────────────────────────── */}
        {showSection && (
          <div className="flex flex-col gap-3 rounded-lg border border-stone-700/60 bg-stone-900/40 px-3 py-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              Class Options
            </span>

            {/* Archetype */}
            {showArchetypes && (
              <Field label="Archetype (optional)">
                <select
                  className="field"
                  disabled={archetypesLoading}
                  value={selClassOptions.archetypeId ?? ''}
                  onChange={e => {
                    const arch = archetypes.find(a => a.id === e.target.value) ?? null
                    setSelClassOptions(prev => ({
                      ...prev,
                      archetypeId:   arch?.id   ?? null,
                      archetypeName: arch?.name ?? null,
                    }))
                  }}
                >
                  <option value="">— None / Base Class —</option>
                  {archetypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
            )}

            {/* Bloodline */}
            {showBloodline && (
              <Field label="Bloodline *">
                <select
                  className="field"
                  disabled={bloodlinesLoading}
                  value={selClassOptions.bloodlineId ?? ''}
                  onChange={e => {
                    const bl = bloodlines.find(b => b.id === e.target.value) ?? null
                    setSelClassOptions(prev => ({
                      ...prev,
                      bloodlineId:   bl?.id   ?? null,
                      bloodlineName: bl?.name ?? null,
                    }))
                  }}
                >
                  <option value="">— Select a bloodline —</option>
                  {bloodlines.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
            )}

            {/* Mystery */}
            {showMystery && (
              <Field label="Mystery *">
                <select
                  className="field"
                  disabled={mysteriesLoading}
                  value={selClassOptions.mysteryId ?? ''}
                  onChange={e => {
                    const m = mysteries.find(x => x.id === e.target.value) ?? null
                    setSelClassOptions(prev => ({
                      ...prev,
                      mysteryId:   m?.id   ?? null,
                      mysteryName: m?.name ?? null,
                    }))
                  }}
                >
                  <option value="">— Select a mystery —</option>
                  {mysteries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
            )}

            {/* Domains */}
            {showDomains && Array.from({ length: nDomains }).map((_, slot) => (
              <Field key={slot} label={nDomains > 1 ? `Domain ${slot + 1}` : 'Domain'}>
                <select
                  className="field"
                  disabled={domainsLoading}
                  value={selClassOptions.domainIds?.[slot] ?? ''}
                  onChange={e => {
                    const dom = domains.find(d => d.id === e.target.value)
                    if (dom) setDomain(slot as 0 | 1, dom.id, dom.name)
                    else setDomain(slot as 0 | 1, '', '')
                  }}
                >
                  <option value="">— Select a domain —</option>
                  {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            ))}

            {/* Arcane Bond — Wizard only */}
            {showArcaneBond && (
              <>
                <div className="col-span-full mt-1 mb-1 border-t border-stone-700/60 pt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-600">
                    Arcane Bond
                  </span>
                </div>

                <Field label="Bond Type">
                  <select
                    className="field"
                    value={selClassOptions.arcaneBondType ?? ''}
                    onChange={e => {
                      const val = e.target.value
                      setSelClassOptions(prev => ({
                        ...prev,
                        arcaneBondType: val === 'bonded_item' || val === 'familiar' ? val : null,
                        // Clear bond-specific fields when switching type
                        bondedItemKind: val === 'bonded_item' ? prev.bondedItemKind : null,
                        bondedItemName: val === 'bonded_item' ? prev.bondedItemName : null,
                        familiarKind:   val === 'familiar'    ? prev.familiarKind   : null,
                        familiarName:   val === 'familiar'    ? prev.familiarName   : null,
                        familiarNotes:  val === 'familiar'    ? prev.familiarNotes  : null,
                      }))
                    }}
                  >
                    <option value="">— Choose bond type —</option>
                    <option value="bonded_item">Bonded Item</option>
                    <option value="familiar">Familiar</option>
                  </select>
                </Field>

                {selClassOptions.arcaneBondType === 'bonded_item' && (
                  <>
                    <Field label="Item Type">
                      <select
                        className="field"
                        value={selClassOptions.bondedItemKind ?? ''}
                        onChange={e => setSelClassOptions(prev => ({
                          ...prev,
                          bondedItemKind: e.target.value || null,
                        }))}
                      >
                        <option value="">— Choose item type —</option>
                        {BONDED_ITEM_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </Field>
                    <Field label="Item Name (optional)">
                      <input
                        className="field"
                        placeholder="e.g. Valeron's Ring"
                        value={selClassOptions.bondedItemName ?? ''}
                        onChange={e => setSelClassOptions(prev => ({
                          ...prev,
                          bondedItemName: e.target.value || null,
                        }))}
                      />
                    </Field>
                  </>
                )}

                {selClassOptions.arcaneBondType === 'familiar' && (
                  <>
                    <Field label="Familiar Species">
                      <select
                        className="field"
                        value={selClassOptions.familiarKind ?? ''}
                        onChange={e => setSelClassOptions(prev => ({
                          ...prev,
                          familiarKind: e.target.value || null,
                        }))}
                      >
                        <option value="">— Choose species —</option>
                        {FAMILIAR_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </Field>
                    <Field label="Familiar Name (optional)">
                      <input
                        className="field"
                        placeholder="e.g. Mister Whiskers"
                        value={selClassOptions.familiarName ?? ''}
                        onChange={e => setSelClassOptions(prev => ({
                          ...prev,
                          familiarName: e.target.value || null,
                        }))}
                      />
                    </Field>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Favored Class Bonus */}
        <div className="flex flex-col gap-2">
          <div>
            <span className="text-xs font-medium text-stone-400">Favored Class Bonus</span>
            <p className="text-[10px] text-stone-500 mt-0.5">
              Choose a bonus you gain each time you level up in your favored class.
              You can change this later in the Overview tab.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['hp', 'skill_rank'] as const).map(choice => (
              <label
                key={choice}
                className={`flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors duration-150 ${
                  favoredClassBonus === choice
                    ? 'border-amber-600/60 bg-amber-950/20'
                    : 'border-stone-700/50 hover:border-stone-600/60 hover:bg-stone-800/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    value={choice}
                    {...register('favoredClassBonus')}
                    className="accent-amber-500"
                  />
                  <span className={`text-sm font-semibold ${favoredClassBonus === choice ? 'text-amber-300' : 'text-stone-300'}`}>
                    {choice === 'hp' ? '+1 HP per level' : '+1 Skill Rank per level'}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 leading-relaxed pl-5">
                  {choice === 'hp'
                    ? 'Gain 1 extra hit point each time you gain a level in your favored class.'
                    : 'Gain 1 extra skill rank each time you gain a level in your favored class.'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Row: Background + Deity */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Background" error={errors.background?.message}>
            <input {...register('background')} placeholder="e.g. Soldier" />
          </Field>
          <Field label="Deity" error={errors.deity?.message}>
            <input {...register('deity')} placeholder="e.g. Iomedae" />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); setSelClassOptions({}); onClose() }}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create Character
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function applyReferenceRaceDefaults(data: ReturnType<typeof recomputeCharacter>, race: ReferenceRace | null) {
  if (!race?.baseSpeed) return data
  return {
    ...data,
    combat: {
      ...data.combat,
      speed: race.baseSpeed,
    },
  }
}

// ── Reusable form field wrapper ─────────────────────────────────────────────

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-stone-400">{label}</span>
      <div className="[&>input]:field [&>select]:field [&>textarea]:field">
        {children}
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}
