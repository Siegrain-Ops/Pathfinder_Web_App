import type { Request, Response, NextFunction } from 'express'
import { referenceSpellService } from './service'

function ok<T>(res: Response, data: T) {
  res.json({ success: true, data })
}

export const referenceSpellController = {
  /** GET /api/reference/spells?q=&school=&class=&level= */
  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, school, class: className, level, limit, offset } = req.query as Record<string, string>
      const data = await referenceSpellService.search({
        q,
        school,
        class:  className,
        level:  level  !== undefined ? Number(level)  : undefined,
        limit:  limit  !== undefined ? Number(limit)  : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
      })
      ok(res, data)
    } catch (err) { next(err) }
  },

  /** GET /api/reference/spells/:id */
  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const data = await referenceSpellService.getById(req.params.id)
      ok(res, data)
    } catch (err) { next(err) }
  },
}
