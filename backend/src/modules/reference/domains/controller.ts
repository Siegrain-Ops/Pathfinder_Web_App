import type { NextFunction, Request, Response } from 'express'
import { referenceDomainService } from './service'

function ok<T>(res: Response, data: T) {
  res.json({ success: true, data })
}

export const referenceDomainController = {
  /** GET /api/reference/domains?q=&className=&limit=&offset= */
  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, className, limit, offset } = req.query as Record<string, string>
      const data = await referenceDomainService.search({
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
