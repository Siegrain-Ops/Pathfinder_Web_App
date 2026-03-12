import { SectionPanel }      from './SectionPanel'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'
import { useReferenceRaces } from '../../hooks/useReferenceRaces'
import { ALIGNMENTS, COMMON_CLASSES, COMMON_RACES, SIZE_CATEGORIES } from '@/lib/constants'

export function OverviewSection() {
  const { data, update, setReferenceRaceId } = useCharacterSheet()
  const { races, isLoading: racesLoading } = useReferenceRaces()
  if (!data) return null

  // Capture narrowed non-null reference so closures can access it safely
  const d = data
  const raceOptions = races.length > 0 ? races.map(race => race.name) : COMMON_RACES

  function field(key: keyof typeof d) {
    return {
      value:    String(d[key] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        update({ [key]: e.target.value }),
    }
  }

  return (
    <SectionPanel title="Overview">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField label="Character Name">
          <input className="field" {...field('name')} />
        </FormField>
        <FormField label="Player Name">
          <input className="field" {...field('playerName')} />
        </FormField>

        <FormField label="Race">
          <select
            className="field"
            value={data.race}
            onChange={e => {
              const nextRace = races.find(race => race.name === e.target.value) ?? null
              update({ race: e.target.value })
              setReferenceRaceId(nextRace?.id ?? null)
            }}
            disabled={racesLoading}
          >
            {!raceOptions.includes(data.race) && (
              <option value={data.race}>{data.race}</option>
            )}
            {raceOptions.map(raceName => <option key={raceName} value={raceName}>{raceName}</option>)}
          </select>
        </FormField>
        <FormField label="Class">
          <input className="field" list="class-list" {...field('className')} />
          <datalist id="class-list">
            {COMMON_CLASSES.map(c => <option key={c} value={c} />)}
          </datalist>
        </FormField>
        <FormField label="Level">
          <input
            className="field"
            type="number" min={1} max={20}
            value={data.level}
            onChange={e => update({ level: Number(e.target.value) })}
          />
        </FormField>

        <FormField label="Alignment">
          <select
            className="field"
            value={data.alignment}
            onChange={e => update({ alignment: e.target.value as typeof d.alignment })}
          >
            {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </FormField>
        <FormField label="Background">
          <input className="field" {...field('background')} />
        </FormField>
        <FormField label="Deity">
          <input className="field" {...field('deity')} />
        </FormField>
        <FormField label="Size">
          <select className="field" value={data.size} onChange={e => update({ size: e.target.value as typeof d.size })}>
            {SIZE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>

        <FormField label="Homeland">
          <input className="field" {...field('homeland')} />
        </FormField>
        <FormField label="Age">
          <input
            className="field" type="number" min={0}
            value={data.age}
            onChange={e => update({ age: Number(e.target.value) })}
          />
        </FormField>
        <FormField label="Gender">
          <input className="field" {...field('gender')} />
        </FormField>
        <FormField label="Height">
          <input className="field" placeholder="e.g. 5'10&quot;" {...field('height')} />
        </FormField>
        <FormField label="Weight">
          <input className="field" placeholder="e.g. 180 lbs" {...field('weight')} />
        </FormField>

        <FormField label="Experience">
          <input
            className="field" type="number" min={0}
            value={data.experience}
            onChange={e => update({ experience: Number(e.target.value) })}
          />
        </FormField>
        <FormField label="Languages">
          <input
            className="field"
            value={data.languages.join(', ')}
            onChange={e => update({ languages: e.target.value.split(',').map(l => l.trim()).filter(Boolean) })}
            placeholder="Common, Elvish, …"
          />
        </FormField>
      </div>
    </SectionPanel>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-stone-400">{label}</span>
      {children}
    </label>
  )
}
