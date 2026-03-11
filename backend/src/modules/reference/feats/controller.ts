import type { Request, Response, NextFunction } from 'express'
import { referenceFeatService } from './service'

function ok<T>(res: Response, data: T) {
  res.json({ success: true, data })
}

export const referenceFeatController = {
  /** GET /api/reference/feats?q=&type= */
  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, type, limit, offset } = req.query as Record<string, string>
      const data = await referenceFeatService.search({
        q,
        type,
        limit:  limit  !== undefined ? Number(limit)  : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
      })
      ok(res, data)
    } catch (err) { next(err) }
  },

  /** GET /api/reference/feats/:id */
  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const data = await referenceFeatService.getById(req.params.id)
      ok(res, data)
    } catch (err) { next(err) }
  },
}
