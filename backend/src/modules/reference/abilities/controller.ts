import type { NextFunction, Request, Response } from 'express'
import { referenceAbilityService } from './service'

function ok<T>(res: Response, data: T) {
  res.json({ success: true, data })
}

export const referenceAbilityController = {
  /** GET /api/reference/abilities?q=&kind=&className=&category=&race=&bloodlineName=&mysteryName=&domainName=&archetypeName= */
  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        q, kind, className, category,
        race, bloodlineName, mysteryName, domainName, archetypeName,
        limit, offset,
      } = req.query as Record<string, string>
      const data = await referenceAbilityService.search({
        q,
        kind: kind === 'ability' || kind === 'talent' ? kind : undefined,
        className,
        category,
        race,
        bloodlineName,
        mysteryName,
        domainName,
        archetypeName,
        limit:  limit  !== undefined ? Number(limit)  : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
      })
      ok(res, data)
    } catch (err) {
      next(err)
    }
  },
}
