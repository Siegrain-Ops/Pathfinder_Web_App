import { Router } from 'express'
import { referenceRaceController } from './controller'

const router = Router()

router.get('/', referenceRaceController.search)
router.get('/:id', referenceRaceController.getById)

export { router as referenceRaceRoutes }
