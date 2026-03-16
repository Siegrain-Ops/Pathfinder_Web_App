// ---------------------------------------------------------------------------
// requireAuth middleware — validates session cookie and attaches req.user
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express'
import { authRepository } from '../modules/auth/auth.repository'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sid = req.cookies?.sid as string | undefined

    if (!sid) {
      res.status(401).json({ success: false, error: 'Not authenticated' })
      return
    }

    const session = await authRepository.findSessionById(sid)

    if (!session) {
      res.clearCookie('sid', { path: '/' })
      res.status(401).json({ success: false, error: 'Session not found' })
      return
    }

    if (session.expiresAt < new Date()) {
      // Delete expired session
      try { await authRepository.deleteSession(sid) } catch { /* ignore */ }
      res.clearCookie('sid', { path: '/' })
      res.status(401).json({ success: false, error: 'Session expired' })
      return
    }

    req.user = {
      id:          session.user.id,
      email:       session.user.email,
      displayName: session.user.displayName,
    }
    req.sessionId = session.id

    next()
  } catch (err) {
    next(err)
  }
}
