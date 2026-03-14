import type { NextFunction, Request, Response } from 'express'
import { referenceArchetypeService } from './service'

function ok<T>(res: Response, data: T) {
  res.json({ success: true, data })
}

export const referenceArchetypeController = {
  /** GET /api/reference/archetypes?q=&className=&limit=&offset= */
  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, className, limit, offset } = req.query as Record<string, string>
      const data = await referenceArchetypeService.search({
        q,
        className,
        limit:  limit  !== undefined ? Number(limit)  : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
      })
      ok(res, data)
    } catch (err) {
      next(err)
    }
  },
}
