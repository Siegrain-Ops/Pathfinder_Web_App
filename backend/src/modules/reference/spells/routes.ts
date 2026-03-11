import { Router } from 'express'
import { referenceSpellController } from './controller'

const router = Router()

router.get('/',    referenceSpellController.search)
router.get('/:id', referenceSpellController.getById)

export { router as referenceSpellRoutes }
