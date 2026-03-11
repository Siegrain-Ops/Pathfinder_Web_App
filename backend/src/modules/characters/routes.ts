// ---------------------------------------------------------------------------
// Character Routes
// ---------------------------------------------------------------------------

import { Router } from 'express'
import { characterController } from './controller'
import { validate }            from '../../common/middleware/validateRequest'
import { createCharacterSchema, updateCharacterSchema } from './validators'

const router = Router()

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

export { router as characterRoutes }
