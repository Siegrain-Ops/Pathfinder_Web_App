// ---------------------------------------------------------------------------
// Character Controller — HTTP request handlers
// All handlers are async; errors propagate to the global error handler.
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express'
import { characterService } from './service'
import type {
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from './validators'

// ── Helpers ─────────────────────────────────────────────────────────────────

function ok<T>(res: Response, data: T, statusCode = 200) {
  res.status(statusCode).json({ success: true, data })
}

// ── Handlers ────────────────────────────────────────────────────────────────

export const characterController = {
  /** GET /api/characters */
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await characterService.getAll(req.user!.id)
      ok(res, data)
    } catch (err) { next(err) }
  },

  /** GET /api/characters/:id */
  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const data = await characterService.getById(req.params.id, req.user!.id)
      ok(res, data)
    } catch (err) { next(err) }
  },

  /** POST /api/characters */
  create: async (
    req: Request<Record<string, never>, unknown, CreateCharacterRequest>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const data = await characterService.create(req.body, req.user!.id)
      ok(res, data, 201)
    } catch (err) { next(err) }
  },

  /** PUT /api/characters/:id */
  update: async (
    req: Request<{ id: string }, unknown, UpdateCharacterRequest>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const data = await characterService.update(req.params.id, req.body, req.user!.id)
      ok(res, data)
    } catch (err) { next(err) }
  },

  /** DELETE /api/characters/:id */
  remove: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await characterService.delete(req.params.id, req.user!.id)
      ok(res, null)
    } catch (err) { next(err) }
  },

  /** POST /api/characters/:id/duplicate */
  duplicate: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const data = await characterService.duplicate(req.params.id, req.user!.id)
      ok(res, data, 201)
    } catch (err) { next(err) }
  },
}
