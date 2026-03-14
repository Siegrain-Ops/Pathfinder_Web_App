import { Router } from 'express'
import { referenceMysteryController } from './controller'

export const referenceMysteryRoutes = Router()

referenceMysteryRoutes.get('/', referenceMysteryController.search)
