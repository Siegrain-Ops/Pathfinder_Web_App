import { SectionPanel }      from './SectionPanel'
import { useCharacterSheet } from '../../hooks/useCharacterSheet'

export function NotesSection() {
  const { data, update } = useCharacterSheet()
  if (!data) return null

  return (
    <SectionPanel title="Notes">
      <textarea
        className="field min-h-[300px] resize-y font-mono text-sm leading-relaxed"
        placeholder="Character background, session notes, reminders…"
        value={data.notes}
        onChange={e => update({ notes: e.target.value })}
      />
    </SectionPanel>
  )
}
