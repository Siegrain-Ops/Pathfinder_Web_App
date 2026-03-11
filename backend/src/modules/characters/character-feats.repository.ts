import { prisma } from '../../common/db/prisma'
import type { CharacterFeatRecord } from '../reference/types'

export const characterFeatsRepository = {
  async findAllForCharacter(characterId: string): Promise<CharacterFeatRecord[]> {
    return prisma.characterFeat.findMany({
      where:   { characterId },
      include: { referenceFeat: true },
      orderBy: { referenceFeat: { name: 'asc' } },
    })
  },

  async attach(characterId: string, referenceFeatId: string, notes?: string) {
    return prisma.characterFeat.create({
      data:    { characterId, referenceFeatId, notes },
      include: { referenceFeat: true },
    })
  },

  async detach(id: string): Promise<void> {
    await prisma.characterFeat.delete({ where: { id } })
  },

  async exists(id: string): Promise<boolean> {
    return (await prisma.characterFeat.count({ where: { id } })) > 0
  },

  async isAlreadyAttached(characterId: string, referenceFeatId: string): Promise<boolean> {
    return (await prisma.characterFeat.count({
      where: { characterId, referenceFeatId },
    })) > 0
  },
}
