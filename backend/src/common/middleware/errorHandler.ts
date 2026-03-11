// ---------------------------------------------------------------------------
// Global Express error handler
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import { AppError } from '../errors/AppError'

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error:   err.message,
      details: err.details ?? undefined,
    })
    return
  }

  // Unknown / unexpected error
  console.error('[unhandled error]', err)
  res.status(500).json({
    success: false,
    error:   'Internal server error',
  })
}
