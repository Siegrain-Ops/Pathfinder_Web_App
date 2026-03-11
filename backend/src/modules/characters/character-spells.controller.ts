import type { Request, Response, NextFunction } from 'express'
import { characterSpellsRepository } from './character-spells.repository'
import { characterRepository }       from './repository'
import { referenceSpellRepository }  from '../reference/spells/repository'
import { AppError }                  from '../../common/errors/AppError'

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data })
}

export const characterSpellsController = {
  /** GET /api/characters/:id/spells */
  list: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const exists = await characterRepository.exists(req.params.id)
      if (!exists) throw AppError.notFound('Character')
      const data = await characterSpellsRepository.findAllForCharacter(req.params.id)
      ok(res, data)
    } catch (err) { next(err) }
  },

  /** POST /api/characters/:id/spells  body: { referenceSpellId, isPrepared?, notes? } */
  attach: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { referenceSpellId, isPrepared, notes } = req.body as {
        referenceSpellId: string
        isPrepared?: boolean
        notes?: string
      }
      if (!referenceSpellId) throw AppError.badRequest('referenceSpellId is required')

      const charExists  = await characterRepository.exists(req.params.id)
      if (!charExists)  throw AppError.notFound('Character')

      const spellExists = await referenceSpellRepository.findById(referenceSpellId)
      if (!spellExists) throw AppError.notFound('ReferenceSpell')

      const duplicate = await characterSpellsRepository.isAlreadyAttached(req.params.id, referenceSpellId)
      if (duplicate)    throw AppError.badRequest('Spell already attached to this character')

      const data = await characterSpellsRepository.attach(req.params.id, referenceSpellId, isPrepared, notes)
      ok(res, data, 201)
    } catch (err) { next(err) }
  },

  /** DELETE /api/characters/:id/spells/:csId */
  detach: async (req: Request<{ id: string; csId: string }>, res: Response, next: NextFunction) => {
    try {
      const exists = await characterSpellsRepository.exists(req.params.csId)
      if (!exists) throw AppError.notFound('CharacterSpell')
      await characterSpellsRepository.detach(req.params.csId)
      ok(res, null)
    } catch (err) { next(err) }
  },
}
