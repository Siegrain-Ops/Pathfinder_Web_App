import { Router } from 'express'
import { referenceBloodlineController } from './controller'

export const referenceBloodlineRoutes = Router()

referenceBloodlineRoutes.get('/', referenceBloodlineController.search)
