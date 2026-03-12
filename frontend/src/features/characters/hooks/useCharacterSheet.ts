// ---------------------------------------------------------------------------
// useCharacterSheet
// Provides the active character data and a typed update helper to all
// sheet section components — avoids prop-drilling.
// ---------------------------------------------------------------------------

import { useCharacterStore } from '@/app/store/characterStore'
import type { CharacterData } from '@/types'

export function useCharacterSheet() {
  const active             = useCharacterStore(s => s.active)
  const isDirty            = useCharacterStore(s => s.isDirty)
  const isSaving           = useCharacterStore(s => s.isSaving)
  const updateCharacterData = useCharacterStore(s => s.updateCharacterData)
  const setReferenceRaceId = useCharacterStore(s => s.setReferenceRaceId)
  const saveCharacter      = useCharacterStore(s => s.saveCharacter)

  /** Deeply merge a partial update and trigger full recompute. */
  function update(patch: Partial<CharacterData>) {
    updateCharacterData(patch)
  }

  return {
    data:      active?.data ?? null,
    isDirty,
    isSaving,
    update,
    setReferenceRaceId,
    save:      saveCharacter,
  }
}
