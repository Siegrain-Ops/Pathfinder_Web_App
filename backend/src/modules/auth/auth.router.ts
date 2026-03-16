// ---------------------------------------------------------------------------
// Auth Routes
// ---------------------------------------------------------------------------

import { Router } from 'express'
import { authController } from './auth.controller'
import { requireAuth }    from '../../middleware/requireAuth'

const router = Router()

// POST /api/auth/register
router.post('/register', authController.register)

// POST /api/auth/login
router.post('/login', authController.login)

// POST /api/auth/logout
router.post('/logout', authController.logout)

// GET  /api/auth/me
router.get('/me', requireAuth, authController.me)

export { router as authRoutes }
