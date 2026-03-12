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
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id:        row.id,
    data:      row.data as unknown as CharacterData,
    referenceRaceId: row.referenceRaceId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ── Repository ──────────────────────────────────────────────────────────────

export const characterRepository = {
  async findAll() {
    const rows = await prisma.character.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map(toRecord)
  },

  async findById(id: string) {
    const row = await prisma.character.findUnique({ where: { id } })
    if (!row) return null
    return toRecord(row)
  },

  async create(id: string, data: CharacterData, referenceRaceId?: string | null) {
    const row = await prisma.character.create({
      data: {
        id,
        data: data as unknown as Prisma.InputJsonValue,
        referenceRaceId,
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
}
