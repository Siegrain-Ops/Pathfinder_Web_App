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
  async getAll(userId: string): Promise<CharacterSummary[]> {
    const records = await characterRepository.findAll(userId)
    return records.map(toSummary)
  },

  async getById(id: string, userId: string) {
    const record = await characterRepository.findById(id, userId)
    if (!record) throw AppError.notFound('Character')
    return record
  },

  async create(input: CreateCharacterRequest, userId: string) {
    const id   = randomUUID()
    // Frontend validates the full CharacterData shape; backend trusts it here.
    const data = input.data as unknown as CharacterData
    return characterRepository.create(id, data, input.referenceRaceId, userId)
  },

  async update(id: string, input: UpdateCharacterRequest, userId: string) {
    const existing = await characterRepository.findById(id, userId)
    if (!existing) throw AppError.notFound('Character')

    // Deep-merge: existing data + partial update from client
    const merged: CharacterData = {
      ...existing.data,
      ...(input.data as unknown as Partial<CharacterData>),
    }
    return characterRepository.update(id, merged, input.referenceRaceId)
  },

  async delete(id: string, userId: string) {
    const exists = await characterRepository.existsForUser(id, userId)
    if (!exists) throw AppError.notFound('Character')
    await characterRepository.delete(id)
  },

  async duplicate(id: string, userId: string) {
    const original = await characterRepository.findById(id, userId)
    if (!original) throw AppError.notFound('Character')

    const copy: CharacterData = {
      ...original.data,
      name: `${original.data.name} (Copy)`,
    }

    const newId = randomUUID()
    return characterRepository.create(newId, copy, original.referenceRaceId, userId)
  },
}
