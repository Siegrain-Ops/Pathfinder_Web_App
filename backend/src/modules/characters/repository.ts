// ---------------------------------------------------------------------------
// Character Repository — Prisma data access
// Prisma schema is defined in STEP 7. The repository depends on the
// generated PrismaClient and the `Character` model.
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'
import type { CharacterData } from './types'

const prisma = new PrismaClient()

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse the JSON `data` field from SQLite (stored as string). */
function parseData(raw: string): CharacterData {
  return JSON.parse(raw) as CharacterData
}

/** Map a raw Prisma row to a typed record. */
function toRecord(row: { id: string; data: string; createdAt: Date; updatedAt: Date }) {
  return {
    id:        row.id,
    data:      parseData(row.data),
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

  async create(id: string, data: CharacterData) {
    const row = await prisma.character.create({
      data: {
        id,
        data: JSON.stringify(data),
      },
    })
    return toRecord(row)
  },

  async update(id: string, data: CharacterData) {
    const row = await prisma.character.update({
      where: { id },
      data:  { data: JSON.stringify(data) },
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
