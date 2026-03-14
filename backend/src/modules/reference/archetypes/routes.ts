import { Router } from 'express'
import { referenceArchetypeController } from './controller'

export const referenceArchetypeRoutes = Router()

referenceArchetypeRoutes.get('/', referenceArchetypeController.search)
