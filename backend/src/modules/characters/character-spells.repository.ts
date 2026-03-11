import { prisma }  from '../../common/db/prisma'
import { toSpell } from '../reference/types'
import type { CharacterSpellRecord } from '../reference/types'

function toRecord(row: {
  id: string
  characterId: string
  referenceSpellId: string
  isPrepared: boolean
  notes: string | null
  createdAt: Date
  referenceSpell: Parameters<typeof toSpell>[0]
}): CharacterSpellRecord {
  return { ...row, referenceSpell: toSpell(row.referenceSpell) }
}

export const characterSpellsRepository = {
  async findAllForCharacter(characterId: string): Promise<CharacterSpellRecord[]> {
    const rows = await prisma.characterSpell.findMany({
      where:   { characterId },
      include: { referenceSpell: true },
      orderBy: { referenceSpell: { name: 'asc' } },
    })
    return rows.map(toRecord)
  },

  async attach(characterId: string, referenceSpellId: string, isPrepared = false, notes?: string) {
    const row = await prisma.characterSpell.create({
      data:    { characterId, referenceSpellId, isPrepared, notes },
      include: { referenceSpell: true },
    })
    return toRecord(row)
  },

  async detach(id: string): Promise<void> {
    await prisma.characterSpell.delete({ where: { id } })
  },

  async exists(id: string): Promise<boolean> {
    return (await prisma.characterSpell.count({ where: { id } })) > 0
  },

  async isAlreadyAttached(characterId: string, referenceSpellId: string): Promise<boolean> {
    return (await prisma.characterSpell.count({
      where: { characterId, referenceSpellId },
    })) > 0
  },
}
