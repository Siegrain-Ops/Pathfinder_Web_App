import type { NextFunction, Request, Response } from 'express'
import { referenceClassService } from './service'

function ok<T>(res: Response, data: T) {
  res.json({ success: true, data })
}

export const referenceClassController = {
  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, category, limit, offset } = req.query as Record<string, string>
      const data = await referenceClassService.search({
        q,
        category,
        limit: limit !== undefined ? Number(limit) : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
      })
      ok(res, data)
    } catch (err) { next(err) }
  },

  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const data = await referenceClassService.getById(req.params.id)
      ok(res, data)
    } catch (err) { next(err) }
  },
}
