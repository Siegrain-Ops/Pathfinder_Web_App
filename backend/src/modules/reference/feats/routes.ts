import { Router } from 'express'
import { referenceFeatController } from './controller'

const router = Router()

router.get('/',    referenceFeatController.search)
router.get('/:id', referenceFeatController.getById)

export { router as referenceFeatRoutes }
