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

// POST /api/auth/verify-email
router.post('/verify-email', authController.verifyEmail)

// POST /api/auth/resend-verification
router.post('/resend-verification', authController.resendVerification)

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword)

// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword)

export { router as authRoutes }
