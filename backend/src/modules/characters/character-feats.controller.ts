import type { Request, Response, NextFunction } from 'express'
import { characterFeatsRepository }  from './character-feats.repository'
import { characterRepository }       from './repository'
import { referenceFeatRepository }   from '../reference/feats/repository'
import { AppError }                  from '../../common/errors/AppError'

function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data })
}

export const characterFeatsController = {
  /** GET /api/characters/:id/feats */
  list: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const exists = await characterRepository.existsForUser(req.params.id, req.user!.id)
      if (!exists) throw AppError.notFound('Character')
      const data = await characterFeatsRepository.findAllForCharacter(req.params.id)
      ok(res, data)
    } catch (err) { next(err) }
  },

  /** POST /api/characters/:id/feats  body: { referenceFeatId, notes? } */
  attach: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { referenceFeatId, notes } = req.body as { referenceFeatId: string; notes?: string }
      if (!referenceFeatId) throw AppError.badRequest('referenceFeatId is required')

      const charExists = await characterRepository.existsForUser(req.params.id, req.user!.id)
      if (!charExists)  throw AppError.notFound('Character')

      const featExists = await referenceFeatRepository.findById(referenceFeatId)
      if (!featExists)  throw AppError.notFound('ReferenceFeat')

      const duplicate = await characterFeatsRepository.isAlreadyAttached(req.params.id, referenceFeatId)
      if (duplicate)    throw AppError.badRequest('Feat already attached to this character')

      const data = await characterFeatsRepository.attach(req.params.id, referenceFeatId, notes)
      ok(res, data, 201)
    } catch (err) { next(err) }
  },

  /** DELETE /api/characters/:id/feats/:cfId */
  detach: async (req: Request<{ id: string; cfId: string }>, res: Response, next: NextFunction) => {
    try {
      const exists = await characterFeatsRepository.exists(req.params.cfId)
      if (!exists) throw AppError.notFound('CharacterFeat')
      await characterFeatsRepository.detach(req.params.cfId)
      ok(res, null)
    } catch (err) { next(err) }
  },
}
