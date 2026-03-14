import { Router } from 'express'
import { referenceDomainController } from './controller'

export const referenceDomainRoutes = Router()

referenceDomainRoutes.get('/', referenceDomainController.search)
