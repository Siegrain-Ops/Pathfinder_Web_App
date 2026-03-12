// ---------------------------------------------------------------------------
// Character Service — business logic
// ---------------------------------------------------------------------------

import { randomUUID } from 'crypto'
import { characterRepository } from './repository'
import { AppError }            from '../../common/errors/AppError'
import type { CharacterData, CharacterSummary } from './types'
import type { CreateCharacterRequest, UpdateCharacterRequest } from './validators'

// ── Projection helpers ──────────────────────────────────────────────────────

function toSummary(record: {
  id: string
  data: CharacterData
  updatedAt: Date
}): CharacterSummary {
  return {
    id:        record.id,
    name:      record.data.name,
    race:      record.data.race,
    className: record.data.className,
    level:     record.data.level,
    alignment: record.data.alignment,
    updatedAt: record.updatedAt,
  }
}

// ── Service ─────────────────────────────────────────────────────────────────

export const characterService = {
  async getAll(): Promise<CharacterSummary[]> {
    const records = await characterRepository.findAll()
    return records.map(toSummary)
  },

  async getById(id: string) {
    const record = await characterRepository.findById(id)
    if (!record) throw AppError.notFound('Character')
    return record
  },

  async create(input: CreateCharacterRequest) {
    const id   = randomUUID()
    // Frontend validates the full CharacterData shape; backend trusts it here.
    const data = input.data as unknown as CharacterData
    return characterRepository.create(id, data, input.referenceRaceId)
  },

  async update(id: string, input: UpdateCharacterRequest) {
    const existing = await characterRepository.findById(id)
    if (!existing) throw AppError.notFound('Character')

    // Deep-merge: existing data + partial update from client
    const merged: CharacterData = {
      ...existing.data,
      ...(input.data as unknown as Partial<CharacterData>),
    }
    return characterRepository.update(id, merged, input.referenceRaceId)
  },

  async delete(id: string) {
    const exists = await characterRepository.exists(id)
    if (!exists) throw AppError.notFound('Character')
    await characterRepository.delete(id)
  },

  async duplicate(id: string) {
    const original = await characterRepository.findById(id)
    if (!original) throw AppError.notFound('Character')

    const copy: CharacterData = {
      ...original.data,
      name: `${original.data.name} (Copy)`,
    }

    const newId = randomUUID()
    return characterRepository.create(newId, copy, original.referenceRaceId)
  },
}
