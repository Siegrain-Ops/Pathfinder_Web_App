// ---------------------------------------------------------------------------
// Character Routes
// ---------------------------------------------------------------------------

import { Router } from 'express'
import { characterController }       from './controller'
import { characterSpellsController } from './character-spells.controller'
import { characterFeatsController }  from './character-feats.controller'
import { validate }                  from '../../common/middleware/validateRequest'
import { createCharacterSchema, updateCharacterSchema } from './validators'
import { requireAuth }               from '../../middleware/requireAuth'

const router = Router()

// All character routes require authentication
router.use(requireAuth)

// ── Core CRUD ────────────────────────────────────────────────────────────────

// GET    /api/characters
router.get('/',    characterController.getAll)

// GET    /api/characters/:id
router.get('/:id', characterController.getById)

// POST   /api/characters
router.post('/',
  validate(createCharacterSchema),
  characterController.create,
)

// PUT    /api/characters/:id
router.put('/:id',
  validate(updateCharacterSchema),
  characterController.update,
)

// DELETE /api/characters/:id
router.delete('/:id', characterController.remove)

// POST   /api/characters/:id/duplicate
router.post('/:id/duplicate', characterController.duplicate)

// ── Spell attachments ─────────────────────────────────────────────────────────

// GET    /api/characters/:id/spells
router.get('/:id/spells', characterSpellsController.list)

// POST   /api/characters/:id/spells
router.post('/:id/spells', characterSpellsController.attach)

// DELETE /api/characters/:id/spells/:csId
router.delete('/:id/spells/:csId', characterSpellsController.detach)

// ── Feat attachments ──────────────────────────────────────────────────────────

// GET    /api/characters/:id/feats
router.get('/:id/feats', characterFeatsController.list)

// POST   /api/characters/:id/feats
router.post('/:id/feats', characterFeatsController.attach)

// DELETE /api/characters/:id/feats/:cfId
router.delete('/:id/feats/:cfId', characterFeatsController.detach)

export { router as characterRoutes }
