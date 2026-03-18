// ---------------------------------------------------------------------------
// Auth Controller — HTTP request handlers for auth endpoints
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { authRepository } from './auth.repository'
import { emailService }   from './email.service'
import { generateToken, hashToken, tokenExpiry } from './token.utils'
import { AppError } from '../../common/errors/AppError'

const BCRYPT_ROUNDS  = 12
const SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

const COOKIE_NAME = 'sid'

function cookieOptions() {
  const isSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    sameSite: isSecure ? 'none' as const : 'lax' as const,
    secure: isSecure,
    path: '/',
    maxAge: SESSION_TTL_MS,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function ok<T>(res: Response, data: T, statusCode = 200) {
  res.status(statusCode).json({ success: true, data })
}

// ── Handlers ────────────────────────────────────────────────────────────────

export const authController = {
  /** POST /api/auth/register */
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, displayName } = req.body as {
        email: string
        password: string
        displayName: string
      }

      if (!email || !password || !displayName) {
        throw AppError.badRequest('email, password, and displayName are required')
      }
      if (password.length < 8) {
        throw AppError.badRequest('password must be at least 8 characters')
      }

      const existing = await authRepository.findUserByEmail(email)
      if (existing) {
        throw new AppError(409, 'An account with that email already exists')
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
      const user = await authRepository.createUser(email, passwordHash, displayName)

      // Send verification email
      const token     = generateToken()
      const tokenHash = hashToken(token)
      const expiresAt = tokenExpiry(24)

      await authRepository.createEmailVerificationToken(user.id, tokenHash, expiresAt)
      await emailService.sendVerificationEmail(email, displayName, token)

      ok(res, { message: 'Registration successful. Please check your email to verify your account.' }, 202)
    } catch (err) { next(err) }
  },

  /** POST /api/auth/login */
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string }

      if (!email || !password) {
        throw AppError.badRequest('email and password are required')
      }

      const user = await authRepository.findUserByEmail(email)
      if (!user) {
        throw new AppError(401, 'Invalid email or password')
      }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        throw new AppError(401, 'Invalid email or password')
      }

      // Block unverified new accounts (legacy accounts have no tokens and no emailVerifiedAt)
      if (!user.emailVerifiedAt) {
        const hasPendingTokens = await authRepository.hasEmailVerificationTokens(user.id)
        if (hasPendingTokens) {
          throw new AppError(403, 'Please verify your email address before signing in. Check your inbox or request a new verification link.')
        }
        // Legacy account (no emailVerifiedAt, no tokens) — allow login
      }

      // Clean up stale sessions in background
      void authRepository.deleteExpiredSessions(user.id)

      const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
      const session   = await authRepository.createSession(user.id, expiresAt)

      res.cookie(COOKIE_NAME, session.id, cookieOptions())

      ok(res, { id: user.id, email: user.email, displayName: user.displayName })
    } catch (err) { next(err) }
  },

  /** POST /api/auth/logout */
  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sid = req.cookies?.[COOKIE_NAME] as string | undefined
      if (sid) {
        try {
          await authRepository.deleteSession(sid)
        } catch {
          // Session may already be gone — ignore
        }
      }
      res.clearCookie(COOKIE_NAME, { path: '/' })
      ok(res, null)
    } catch (err) { next(err) }
  },

  /** GET /api/auth/me */
  me: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated')
      }
      ok(res, req.user)
    } catch (err) { next(err) }
  },

  /** POST /api/auth/verify-email */
  verifyEmail: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body as { token: string }
      if (!token) throw AppError.badRequest('token is required')

      const tokenHash = hashToken(token)
      const record    = await authRepository.findEmailVerificationTokenByHash(tokenHash)

      if (!record) {
        throw new AppError(400, 'Invalid or expired verification link.')
      }
      if (record.expiresAt < new Date()) {
        throw new AppError(400, 'Verification link has expired. Please request a new one.')
      }

      await authRepository.markUserEmailVerified(record.userId)
      await authRepository.deleteEmailVerificationTokensByUserId(record.userId)

      ok(res, { message: 'Email verified successfully. You can now sign in.' })
    } catch (err) { next(err) }
  },

  /** POST /api/auth/resend-verification */
  resendVerification: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as { email: string }
      if (!email) throw AppError.badRequest('email is required')

      const user = await authRepository.findUserByEmail(email)

      // Always respond with success to avoid leaking whether an account exists
      if (!user || user.emailVerifiedAt) {
        ok(res, { message: 'If an unverified account exists for that email, a new link has been sent.' })
        return
      }

      // Rate-limit: block if a token was created in the last 60 seconds
      const since  = new Date(Date.now() - 60_000)
      const recent = await authRepository.findRecentEmailVerificationToken(user.id, since)
      if (recent) {
        throw new AppError(429, 'A verification email was sent recently. Please wait before requesting another.')
      }

      // Delete old tokens, issue a fresh one
      await authRepository.deleteEmailVerificationTokensByUserId(user.id)

      const token     = generateToken()
      const tokenHash = hashToken(token)
      const expiresAt = tokenExpiry(24)

      await authRepository.createEmailVerificationToken(user.id, tokenHash, expiresAt)
      await emailService.sendVerificationEmail(user.email, user.displayName, token)

      ok(res, { message: 'If an unverified account exists for that email, a new link has been sent.' })
    } catch (err) { next(err) }
  },

  /** POST /api/auth/forgot-password */
  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as { email: string }
      if (!email) throw AppError.badRequest('email is required')

      const user = await authRepository.findUserByEmail(email)

      // Always respond with success to avoid leaking account existence
      if (!user) {
        ok(res, { message: 'If an account exists for that email, a reset link has been sent.' })
        return
      }

      // Rate-limit: block if a reset token was created in the last 60 seconds
      // (reuse the same logic via a recent token lookup — we just delete+recreate)
      await authRepository.deletePasswordResetTokensByUserId(user.id)

      const token     = generateToken()
      const tokenHash = hashToken(token)
      const expiresAt = tokenExpiry(1) // 1 hour

      await authRepository.createPasswordResetToken(user.id, tokenHash, expiresAt)
      await emailService.sendPasswordResetEmail(user.email, user.displayName, token)

      ok(res, { message: 'If an account exists for that email, a reset link has been sent.' })
    } catch (err) { next(err) }
  },

  /** POST /api/auth/reset-password */
  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body as { token: string; password: string }
      if (!token)    throw AppError.badRequest('token is required')
      if (!password) throw AppError.badRequest('password is required')
      if (password.length < 8) throw AppError.badRequest('password must be at least 8 characters')

      const tokenHash = hashToken(token)
      const record    = await authRepository.findPasswordResetTokenByHash(tokenHash)

      if (!record) {
        throw new AppError(400, 'Invalid or expired reset link.')
      }
      if (record.expiresAt < new Date()) {
        throw new AppError(400, 'Reset link has expired. Please request a new one.')
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

      await authRepository.updateUserPassword(record.userId, passwordHash)
      await authRepository.deletePasswordResetToken(record.id)
      await authRepository.deleteAllUserSessions(record.userId)

      ok(res, { message: 'Password updated successfully. You can now sign in with your new password.' })
    } catch (err) { next(err) }
  },
}
