import { Router } from 'express'
import { referenceClassController } from './controller'

const router = Router()

router.get('/', referenceClassController.search)
router.get('/:id', referenceClassController.getById)

export { router as referenceClassRoutes }
