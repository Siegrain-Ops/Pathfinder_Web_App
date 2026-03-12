import { Router } from 'express'
import { referenceAbilityController } from './controller'

export const referenceAbilityRoutes = Router()

referenceAbilityRoutes.get('/', referenceAbilityController.search)
