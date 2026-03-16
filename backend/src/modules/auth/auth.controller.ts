// ---------------------------------------------------------------------------
// Auth Controller — HTTP request handlers for auth endpoints
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { authRepository } from './auth.repository'
import { AppError } from '../../common/errors/AppError'

const BCRYPT_ROUNDS = 12
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

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

      const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
      const session = await authRepository.createSession(user.id, expiresAt)

      res.cookie(COOKIE_NAME, session.id, cookieOptions())

      ok(res, { id: user.id, email: user.email, displayName: user.displayName }, 201)
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

      // Clean up stale sessions in background
      void authRepository.deleteExpiredSessions(user.id)

      const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
      const session = await authRepository.createSession(user.id, expiresAt)

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
}
