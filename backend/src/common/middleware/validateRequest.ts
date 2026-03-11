// ---------------------------------------------------------------------------
// Zod request validation middleware factory
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from '../errors/AppError'

type Target = 'body' | 'params' | 'query'

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target])
    if (!result.success) {
      throw AppError.badRequest(
        'Validation failed',
        result.error.flatten(),
      )
    }
    // Attach parsed + coerced data back to request
    req[target] = result.data as never
    next()
  }
}
