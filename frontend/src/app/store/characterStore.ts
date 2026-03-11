// ---------------------------------------------------------------------------
// Character Store (Zustand)
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import type { Character, CharacterData, CharacterSummary } from '@/types'
import { characterService }    from '@/features/characters/services/character.service'
import { createBlankCharacter } from '@/lib/utils/character.utils'
import { updateAndRecompute }  from '@/lib/formulas/character.formulas'

interface CharacterState {
  // ── List ────────────────────────────────────────────────
  summaries:  CharacterSummary[]
  isLoading:  boolean
  error:      string | null

  // ── Active character (sheet page) ────────────────────────
  active:     Character | null
  isDirty:    boolean
  isSaving:   boolean

  // ── List actions ─────────────────────────────────────────
  fetchAll:             () => Promise<void>
  createCharacter:      () => Promise<Character>
  createCharacterWithData: (data: CharacterData) => Promise<Character>
  deleteCharacter:      (id: string) => Promise<void>
  duplicateCharacter:   (id: string) => Promise<void>

  // ── Sheet actions ─────────────────────────────────────────
  loadCharacter:        (id: string) => Promise<void>
  saveCharacter:        () => Promise<void>
  updateCharacterData:  (patch: Partial<CharacterData>) => void
  clearActive:          () => void
}

function toSummary(c: Character): CharacterSummary {
  return {
    id:        c.id,
    name:      c.data.name,
    race:      c.data.race,
    className: c.data.className,
    level:     c.data.level,
    alignment: c.data.alignment,
    updatedAt: c.updatedAt,
  }
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  summaries: [],
  isLoading: false,
  error:     null,
  active:    null,
  isDirty:   false,
  isSaving:  false,

  // ── Fetch list ─────────────────────────────────────────────────────────
  fetchAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const summaries = await characterService.getAll()
      set({ summaries, isLoading: false })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  // ── Create (blank) ─────────────────────────────────────────────────────
  createCharacter: async () => {
    const data = createBlankCharacter()
    const character = await characterService.create({ data })
    set(state => ({ summaries: [...state.summaries, toSummary(character)] }))
    return character
  },

  // ── Create with pre-filled data ────────────────────────────────────────
  createCharacterWithData: async (data: CharacterData) => {
    const character = await characterService.create({ data })
    set(state => ({ summaries: [...state.summaries, toSummary(character)] }))
    return character
  },

  // ── Delete ─────────────────────────────────────────────────────────────
  deleteCharacter: async (id) => {
    await characterService.remove(id)
    set(state => ({
      summaries: state.summaries.filter(s => s.id !== id),
      active: state.active?.id === id ? null : state.active,
    }))
  },

  // ── Duplicate ──────────────────────────────────────────────────────────
  duplicateCharacter: async (id) => {
    const copy = await characterService.duplicate(id)
    set(state => ({ summaries: [...state.summaries, toSummary(copy)] }))
  },

  // ── Load active character ──────────────────────────────────────────────
  loadCharacter: async (id) => {
    set({ isLoading: true, error: null, active: null, isDirty: false })
    try {
      const character = await characterService.getById(id)
      set({ active: character, isLoading: false })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  // ── Save active character ──────────────────────────────────────────────
  saveCharacter: async () => {
    const { active } = get()
    if (!active) return
    set({ isSaving: true })
    try {
      const saved = await characterService.update(active.id, { data: active.data })
      set(state => ({
        active:   saved,
        isDirty:  false,
        isSaving: false,
        summaries: state.summaries.map(s => s.id === saved.id ? toSummary(saved) : s),
      }))
    } catch (err) {
      set({ error: String(err), isSaving: false })
    }
  },

  // ── Update data in memory → triggers recompute ─────────────────────────
  updateCharacterData: (patch) => {
    const { active } = get()
    if (!active) return
    const data = updateAndRecompute(active.data, patch)
    set({ active: { ...active, data }, isDirty: true })
  },

  // ── Clear active ───────────────────────────────────────────────────────
  clearActive: () => set({ active: null, isDirty: false }),
}))
