// ---------------------------------------------------------------------------
// Character Repository — Prisma data access
// With MySQL + Prisma's Json column type, serialisation is handled by Prisma.
// No manual JSON.parse / JSON.stringify needed.
// ---------------------------------------------------------------------------

import { type Prisma } from '@prisma/client'
import { prisma } from '../../common/db/prisma'
import type { CharacterData } from './types'

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Map a raw Prisma row to a typed record.
 *  Prisma returns `data` as `Prisma.JsonValue`; we cast to `CharacterData`. */
function toRecord(row: {
  id: string
  data: Prisma.JsonValue
  referenceRaceId: string | null
  userId: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id:        row.id,
    data:      row.data as unknown as CharacterData,
    referenceRaceId: row.referenceRaceId,
    userId:    row.userId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ── Repository ──────────────────────────────────────────────────────────────

export const characterRepository = {
  async findAll(userId: string) {
    const rows = await prisma.character.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map(toRecord)
  },

  async findById(id: string, userId: string) {
    const row = await prisma.character.findFirst({ where: { id, userId } })
    if (!row) return null
    return toRecord(row)
  },

  async create(id: string, data: CharacterData, referenceRaceId?: string | null, userId?: string) {
    const row = await prisma.character.create({
      data: {
        id,
        data: data as unknown as Prisma.InputJsonValue,
        referenceRaceId,
        userId,
      },
    })
    return toRecord(row)
  },

  async update(id: string, data: CharacterData, referenceRaceId?: string | null) {
    const row = await prisma.character.update({
      where: { id },
      data:  {
        data: data as unknown as Prisma.InputJsonValue,
        ...(referenceRaceId !== undefined ? { referenceRaceId } : {}),
      },
    })
    return toRecord(row)
  },

  async delete(id: string) {
    await prisma.character.delete({ where: { id } })
  },

  async exists(id: string): Promise<boolean> {
    const count = await prisma.character.count({ where: { id } })
    return count > 0
  },

  async existsForUser(id: string, userId: string): Promise<boolean> {
    const count = await prisma.character.count({ where: { id, userId } })
    return count > 0
  },
}
