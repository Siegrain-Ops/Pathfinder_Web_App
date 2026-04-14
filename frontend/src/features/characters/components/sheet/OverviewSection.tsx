import { useEffect, useMemo, useState } from 'react'
import { clsx }              from 'clsx'
import { SectionPanel }      from './SectionPanel'
import { Button }            from '@/components/ui/Button'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'
import { useReferenceClasses } from '../../hooks/useReferenceClasses'
import type { AlternativeRacialTrait, ClassOptions, FavoredClassBonus, ReferenceRace } from '@/types'
import { useReferenceRaces }      from '../../hooks/useReferenceRaces'
import { useReferenceArchetypes } from '../../hooks/useReferenceArchetypes'
import { useReferenceBloodlines } from '../../hooks/useReferenceBloodlines'
import { useReferenceDomains }    from '../../hooks/useReferenceDomains'
import { useReferenceMysteries }  from '../../hooks/useReferenceMysteries'
import { ALIGNMENTS, COMMON_CLASSES, COMMON_RACES, SIZE_CATEGORIES } from '@/lib/constants'

const BLOODLINE_CLASSES  = ['sorcerer', 'bloodrager']
const DOMAIN_CLASSES     = ['cleric', 'druid', 'inquisitor']
const MYSTERY_CLASSES    = ['oracle']
const WIZARD_CLASSES     = ['wizard']
const TWO_DOMAIN_CLASSES = ['cleric']
const BONDED_ITEM_KINDS  = ['Amulet', 'Ring', 'Staff', 'Wand', 'Sword', 'Dagger', 'Axe', 'Bow', 'Other'] as const
const FAMILIAR_KINDS     = ['Bat', 'Cat', 'Fox', 'Hawk', 'Lizard', 'Monkey', 'Owl', 'Rat', 'Raven', 'Snake', 'Toad', 'Weasel', 'Other'] as const
const SKILL_NAME_ALIASES: Record<string, string[]> = {
  perception: ['perception'],
  stealth: ['stealth'],
  survival: ['survival'],
  bluff: ['bluff'],
  diplomacy: ['diplomacy'],
  intimidate: ['intimidate'],
  sense_motive: ['sense motive'],
  acrobatics: ['acrobatics'],
  climb: ['climb'],
  swim: ['swim'],
  knowledge_arcana: ['knowledge arcana'],
  knowledge_dungeoneering: ['knowledge dungeoneering'],
  knowledge_engineering: ['knowledge engineering'],
  knowledge_geography: ['knowledge geography'],
  knowledge_history: ['knowledge history'],
  knowledge_local: ['knowledge local'],
  knowledge_nature: ['knowledge nature'],
  knowledge_nobility: ['knowledge nobility'],
  knowledge_planes: ['knowledge planes'],
  knowledge_religion: ['knowledge religion'],
  spellcraft: ['spellcraft'],
  appraise: ['appraise'],
  disable_device: ['disable device'],
  ride: ['ride'],
  handle_animal: ['handle animal'],
  heal: ['heal'],
  linguistics: ['linguistics'],
  profession: ['profession'],
  craft: ['craft'],
  perform: ['perform'],
  use_magic_device: ['use magic device'],
}
function classKey(n: string) { return n.toLowerCase() }
function domainCount(cls: string) { return TWO_DOMAIN_CLASSES.includes(classKey(cls)) ? 2 : 1 }
function normalizeText(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() }
function extractRaceSkillBonuses(race: ReferenceRace | null): Record<string, number> {
  if (!race?.traits) return {}

  const bonuses: Record<string, number> = {}

  for (const trait of race.traits) {
    const text = [trait.name, trait.description].filter(Boolean).join(' ')
    const normalized = normalizeText(text)
    const match = normalized.match(/\+([0-9]+)\s+racial bonus(?:es)?\s+on\s+([^.]*)\s+checks?/i)
    if (!match) continue

    const bonus = Number.parseInt(match[1], 10)
    const skillsPart = match[2]
    if (!Number.isFinite(bonus)) continue

    for (const [skillId, aliases] of Object.entries(SKILL_NAME_ALIASES)) {
      if (aliases.some(alias => skillsPart.includes(alias))) {
        bonuses[skillId] = Math.max(bonuses[skillId] ?? 0, bonus)
      }
    }
  }

  return bonuses
}

function extractAlternativeRacialTraits(race: ReferenceRace | null): AlternativeRacialTrait[] {
  if (!race?.traits) return []

  return race.traits.flatMap(trait => {
    const name = trait.name?.trim()
    const description = trait.description?.trim()
    const normalized = normalizeText([name, description].filter(Boolean).join(' '))

    if (!name || !description) return []
    if (!normalized.includes('replaces')) return []

    const replaceMatch = description.match(/replaces?\s+([^.;]+)/i)
    const replaces = replaceMatch
      ? replaceMatch[1]
          .split(/,| and /i)
          .map(part => part.replace(/[.]/g, '').trim())
          .filter(Boolean)
      : []

    return [{ name, description, replaces }]
  })
}

export function OverviewSection() {
  const { data, update, setReferenceRaceId } = useCharacterSheet()
  const { classes, isLoading: classesLoading } = useReferenceClasses()
  const { races,   isLoading: racesLoading   } = useReferenceRaces()
  const [isLocked, setIsLocked] = useState(true)
  const [langInput, setLangInput] = useState<string | null>(null)

  // Class-option hooks — each guards against empty className
  const currentClassName = data?.className ?? ''
  const { archetypes, isLoading: archetypesLoading } = useReferenceArchetypes(currentClassName)
  const { bloodlines, isLoading: bloodlinesLoading } = useReferenceBloodlines(
    BLOODLINE_CLASSES.includes(classKey(currentClassName)) ? currentClassName : '',
  )
  const { domains, isLoading: domainsLoading } = useReferenceDomains(
    DOMAIN_CLASSES.includes(classKey(currentClassName)) ? currentClassName : '',
  )
  const { mysteries, isLoading: mysteriesLoading } = useReferenceMysteries(
    MYSTERY_CLASSES.includes(classKey(currentClassName)) ? currentClassName : '',
  )

  if (!data) return null

  // Capture narrowed non-null reference so closures can access it safely
  const d = data
  const raceOptions = races.length > 0 ? races.map(race => race.name) : COMMON_RACES
  const classOptions = classes.length > 0 ? classes.map(classRecord => classRecord.name) : COMMON_CLASSES
  const selectedRace = useMemo(
    () => races.find(race => race.id === d.referenceRaceId) ?? races.find(race => race.name === d.race) ?? null,
    [races, d.referenceRaceId, d.race],
  )

  const raceSkillBonuses = useMemo(() => extractRaceSkillBonuses(selectedRace), [selectedRace])
  const alternativeRacialTraits = useMemo(() => extractAlternativeRacialTraits(selectedRace), [selectedRace])

  useEffect(() => {
    const nextSkills = d.skills.map(skill => ({
      ...skill,
      racialBonus: raceSkillBonuses[skill.id] ?? 0,
    }))

    const skillsChanged = nextSkills.some((skill, idx) => skill.racialBonus !== d.skills[idx]?.racialBonus)
    const traitsChanged = JSON.stringify(d.alternativeRacialTraits ?? []) !== JSON.stringify(alternativeRacialTraits)

    if (skillsChanged || traitsChanged) {
      update({
        skills: nextSkills,
        alternativeRacialTraits,
      })
    }
  }, [d.skills, d.alternativeRacialTraits, raceSkillBonuses, alternativeRacialTraits, update])

  function field(key: keyof typeof d) {
    return {
      value:    String(d[key] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        update({ [key]: e.target.value }),
    }
  }

  return (
    <SectionPanel
      title="Overview"
      action={
        <Button
          variant="ghost" size="sm"
          className={`p-1 ${isLocked ? 'text-amber-400 hover:text-amber-300' : 'text-stone-400 hover:text-stone-200'}`}
          title={isLocked ? 'Unlock overview fields' : 'Lock overview fields'}
          onClick={() => setIsLocked(l => !l)}
        >
          {isLocked ? '🔒' : '🔓'}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">

        {isLocked && (
          <p className="text-xs text-amber-400/70 italic">
            Fields are locked. Click 🔒 to enable editing.
          </p>
        )}

        {/* ── Identity ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Character Name">
            <input
              className="field text-base font-semibold text-stone-100 placeholder:font-normal"
              placeholder="Unnamed Hero"
              disabled={isLocked}
              {...field('name')}
            />
          </FormField>
          <FormField label="Player Name">
            <input className="field" disabled={isLocked} {...field('playerName')} />
          </FormField>
        </div>

        {/* ── Class & Race ──────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <SubHeader>Class &amp; Race</SubHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <FormField label="Race">
              <select
                className="field"
                value={data.race}
                onChange={e => {
                  const nextRace = races.find(race => race.name === e.target.value) ?? null
                  update({
                    race: e.target.value,
                    combat: nextRace?.baseSpeed != null
                      ? { ...data.combat, speed: nextRace.baseSpeed }
                      : data.combat,
                  })
                  setReferenceRaceId(nextRace?.id ?? null)
                }}
                disabled={isLocked || racesLoading}
              >
                {!raceOptions.includes(data.race) && (
                  <option value={data.race}>{data.race}</option>
                )}
                {raceOptions.map(raceName => <option key={raceName} value={raceName}>{raceName}</option>)}
              </select>
            </FormField>
            <FormField label="Class">
              <select
                className="field"
                value={data.className}
                onChange={e => update({ className: e.target.value })}
                disabled={isLocked || classesLoading}
              >
                {!classOptions.includes(data.className) && (
                  <option value={data.className}>{data.className}</option>
                )}
                {classOptions.map(className => <option key={className} value={className}>{className}</option>)}
              </select>
            </FormField>
            <FormField label="Level">
              <input
                className="field"
                type="number" min={1} max={20}
                value={data.level}
                disabled={isLocked}
                onChange={e => update({ level: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Alignment">
              <select
                className="field"
                value={data.alignment}
                disabled={isLocked}
                onChange={e => update({ alignment: e.target.value as typeof d.alignment })}
              >
                {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </FormField>
            <FormField label="Size">
              <select className="field" value={data.size} disabled={isLocked} onChange={e => update({ size: e.target.value as typeof d.size })}>
                {SIZE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
        </div>

        {selectedRace && alternativeRacialTraits.length > 0 && (
          <div className="flex flex-col gap-3">
            <SubHeader>Alternative Racial Traits</SubHeader>
            <div className="rounded-xl border border-stone-700/50 bg-stone-900/40 px-4 py-4 flex flex-col gap-3">
              <p className="text-xs text-stone-500">
                Parsed from the reference race entry for <strong className="text-stone-300">{selectedRace.name}</strong>.
                These are surfaced so they are not lost in the archive sludge.
              </p>
              <div className="flex flex-col gap-2">
                {alternativeRacialTraits.map(trait => (
                  <div key={trait.name} className="rounded-lg border border-stone-700/60 bg-stone-950/40 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-stone-200">{trait.name}</span>
                      {trait.replaces && trait.replaces.length > 0 && (
                        <span className="text-[10px] rounded-full border border-amber-700/40 bg-amber-950/20 px-2 py-0.5 text-amber-300">
                          Replaces: {trait.replaces.join(', ')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">{trait.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Background & Lore ─────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <SubHeader>Background &amp; Lore</SubHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Background">
              <input className="field" disabled={isLocked} {...field('background')} />
            </FormField>
            <FormField label="Deity">
              <input className="field" disabled={isLocked} {...field('deity')} />
            </FormField>
            <FormField label="Homeland">
              <input className="field" disabled={isLocked} {...field('homeland')} />
            </FormField>
          </div>
        </div>

        {/* ── Class Options ─────────────────────────────────── */}
        {(() => {
          const co = d.classOptions ?? {}
          const showArchetypes = archetypes.length > 0
          const showBloodline  = BLOODLINE_CLASSES.includes(classKey(d.className)) && bloodlines.length > 0
          const showMystery    = MYSTERY_CLASSES.includes(classKey(d.className))   && mysteries.length > 0
          const showDomains    = DOMAIN_CLASSES.includes(classKey(d.className))    && domains.length   > 0
          const showArcaneBond = WIZARD_CLASSES.includes(classKey(d.className))
          if (!showArchetypes && !showBloodline && !showMystery && !showDomains && !showArcaneBond) return null
          const nDomains = domainCount(d.className)

          function patchOptions(patch: Partial<ClassOptions>) {
            update({ classOptions: { ...co, ...patch } })
          }
          function setDomainSlot(slot: 0 | 1, id: string, name: string) {
            const ids   = [...(co.domainIds   ?? [])]
            const names = [...(co.domainNames ?? [])]
            ids[slot]   = id
            names[slot] = name
            patchOptions({ domainIds: ids.filter(Boolean), domainNames: names.filter(Boolean) })
          }

          return (
            <div className="flex flex-col gap-3">
              <SubHeader>Class Options</SubHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {showArchetypes && (
                  <FormField label="Archetype">
                    <select
                      className="field"
                      disabled={isLocked || archetypesLoading}
                      value={co.archetypeId ?? ''}
                      onChange={e => {
                        const arch = archetypes.find(a => a.id === e.target.value) ?? null
                        patchOptions({ archetypeId: arch?.id ?? null, archetypeName: arch?.name ?? null })
                      }}
                    >
                      <option value="">— None / Base Class —</option>
                      {archetypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </FormField>
                )}

                {showBloodline && (
                  <FormField label="Bloodline">
                    <select
                      className="field"
                      disabled={isLocked || bloodlinesLoading}
                      value={co.bloodlineId ?? ''}
                      onChange={e => {
                        const bl = bloodlines.find(b => b.id === e.target.value) ?? null
                        patchOptions({ bloodlineId: bl?.id ?? null, bloodlineName: bl?.name ?? null })
                      }}
                    >
                      <option value="">— Select a bloodline —</option>
                      {bloodlines.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </FormField>
                )}

                {showMystery && (
                  <FormField label="Mystery">
                    <select
                      className="field"
                      disabled={isLocked || mysteriesLoading}
                      value={co.mysteryId ?? ''}
                      onChange={e => {
                        const m = mysteries.find(x => x.id === e.target.value) ?? null
                        patchOptions({ mysteryId: m?.id ?? null, mysteryName: m?.name ?? null })
                      }}
                    >
                      <option value="">— Select a mystery —</option>
                      {mysteries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </FormField>
                )}

                {showDomains && Array.from({ length: nDomains }).map((_, slot) => (
                  <FormField key={slot} label={nDomains > 1 ? `Domain ${slot + 1}` : 'Domain'}>
                    <select
                      className="field"
                      disabled={isLocked || domainsLoading}
                      value={co.domainIds?.[slot] ?? ''}
                      onChange={e => {
                        const dom = domains.find(dom => dom.id === e.target.value)
                        if (dom) setDomainSlot(slot as 0 | 1, dom.id, dom.name)
                        else     setDomainSlot(slot as 0 | 1, '', '')
                      }}
                    >
                      <option value="">— Select a domain —</option>
                      {domains.map(dom => <option key={dom.id} value={dom.id}>{dom.name}</option>)}
                    </select>
                  </FormField>
                ))}

              </div>

              {/* ── Arcane Bond (Wizard only) ────────────────────── */}
              {showArcaneBond && (
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 whitespace-nowrap">
                      Arcane Bond
                    </span>
                    <div className="flex-1 h-px bg-stone-700/50" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField label="Bond Type">
                      <select
                        className="field"
                        disabled={isLocked}
                        value={co.arcaneBondType ?? ''}
                        onChange={e => {
                          const val = e.target.value
                          patchOptions({
                            arcaneBondType: val === 'bonded_item' || val === 'familiar' ? val : null,
                            // Clear bond-specific fields when switching type
                            bondedItemKind: val === 'bonded_item' ? co.bondedItemKind : null,
                            bondedItemName: val === 'bonded_item' ? co.bondedItemName : null,
                            familiarKind:   val === 'familiar'    ? co.familiarKind   : null,
                            familiarName:   val === 'familiar'    ? co.familiarName   : null,
                            familiarNotes:  val === 'familiar'    ? co.familiarNotes  : null,
                          })
                        }}
                      >
                        <option value="">— Not set —</option>
                        <option value="bonded_item">Bonded Item</option>
                        <option value="familiar">Familiar</option>
                      </select>
                    </FormField>

                    {co.arcaneBondType === 'bonded_item' && (<>
                      <FormField label="Item Type">
                        <select
                          className="field"
                          disabled={isLocked}
                          value={co.bondedItemKind ?? ''}
                          onChange={e => patchOptions({ bondedItemKind: e.target.value || null })}
                        >
                          <option value="">— Choose type —</option>
                          {BONDED_ITEM_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </FormField>

                      <FormField label="Item Name (optional)">
                        <input
                          className="field"
                          placeholder="e.g. Valeron's Ring"
                          disabled={isLocked}
                          value={co.bondedItemName ?? ''}
                          onChange={e => patchOptions({ bondedItemName: e.target.value || null })}
                        />
                      </FormField>
                    </>)}

                    {co.arcaneBondType === 'familiar' && (<>
                      <FormField label="Familiar Species">
                        <select
                          className="field"
                          disabled={isLocked}
                          value={co.familiarKind ?? ''}
                          onChange={e => patchOptions({ familiarKind: e.target.value || null })}
                        >
                          <option value="">— Choose species —</option>
                          {FAMILIAR_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </FormField>

                      <FormField label="Familiar Name (optional)">
                        <input
                          className="field"
                          placeholder="e.g. Mister Whiskers"
                          disabled={isLocked}
                          value={co.familiarName ?? ''}
                          onChange={e => patchOptions({ familiarName: e.target.value || null })}
                        />
                      </FormField>
                    </>)}
                  </div>
                </div>
              )}

            </div>
          )
        })()}

        {/* ── Physical Description ──────────────────────────── */}
        <div className="flex flex-col gap-3">
          <SubHeader>Physical Description</SubHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField label="Age">
              <input
                className="field" type="number" min={0}
                value={data.age}
                disabled={isLocked}
                onChange={e => update({ age: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Gender">
              <input className="field" disabled={isLocked} {...field('gender')} />
            </FormField>
            <FormField label="Height">
              <input className="field" placeholder="e.g. 5'10&quot;" disabled={isLocked} {...field('height')} />
            </FormField>
            <FormField label="Weight">
              <input className="field" placeholder="e.g. 180 lbs" disabled={isLocked} {...field('weight')} />
            </FormField>
          </div>
        </div>

        {/* ── Progression ───────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <SubHeader>Progression</SubHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Experience Points">
              <input
                className="field" type="number" min={0}
                value={data.experience}
                disabled={isLocked}
                onChange={e => update({ experience: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Languages">
              <input
                className="field"
                value={langInput ?? data.languages.join(', ')}
                disabled={isLocked}
                placeholder="Common, Elvish, …"
                onFocus={() => setLangInput(data.languages.join(', '))}
                onChange={e => setLangInput(e.target.value)}
                onBlur={() => {
                  if (langInput !== null) {
                    update({ languages: langInput.split(',').map(l => l.trim()).filter(Boolean) })
                    setLangInput(null)
                  }
                }}
              />
            </FormField>
          </div>

          {/* Favored Class Bonus */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500 whitespace-nowrap">
                Favored Class Bonus
              </span>
              <div className="flex-1 h-px bg-stone-700/50" />
            </div>
            <p className="text-[10px] text-stone-600">
              Bonus applied at each level-up. Used by the <strong className="text-stone-500">LvL UP</strong> workflow.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['hp', 'skill_rank'] as const).map((choice: FavoredClassBonus) => {
                const isActive = (data.favoredClassBonus ?? 'hp') === choice
                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={isLocked}
                    onClick={() => update({ favoredClassBonus: choice })}
                    className={clsx(
                      'flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                      isActive
                        ? 'border-amber-600/60 bg-amber-950/20'
                        : 'border-stone-700/50 hover:border-stone-600/60 hover:bg-stone-800/30',
                    )}
                  >
                    <span className={clsx(
                      'text-xs font-semibold',
                      isActive ? 'text-amber-300' : 'text-stone-400',
                    )}>
                      {choice === 'hp' ? '+1 HP / level' : '+1 Skill Rank / level'}
                    </span>
                    <span className="text-[10px] text-stone-500 leading-snug">
                      {choice === 'hp'
                        ? 'Extra hit point each favored-class level'
                        : 'Extra skill rank each favored-class level'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </SectionPanel>
  )
}

function SubHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-stone-700/50" />
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">{label}</span>
      {children}
    </label>
  )
}
