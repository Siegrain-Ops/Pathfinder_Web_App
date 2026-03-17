// ---------------------------------------------------------------------------
// requireAuth middleware — validates session cookie and attaches req.user
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express'
import { authRepository } from '../modules/auth/auth.repository'

function logAuth401(req: Request, reason: string) {
  const forwardedFor = req.headers['x-forwarded-for']
  const userAgent = req.get('user-agent') ?? 'unknown'
  const sid = req.cookies?.sid as string | undefined

  console.warn('[auth] 401', {
    path: req.originalUrl,
    method: req.method,
    reason,
    ip: req.ip,
    forwardedFor,
    remoteAddress: req.socket.remoteAddress,
    hasSidCookie: Boolean(sid),
    userAgent,
  })
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sid = req.cookies?.sid as string | undefined

    if (!sid) {
      logAuth401(req, 'missing sid cookie')
      res.status(401).json({ success: false, error: 'Not authenticated' })
      return
    }

    const session = await authRepository.findSessionById(sid)

    if (!session) {
      logAuth401(req, 'session not found')
      res.clearCookie('sid', { path: '/' })
      res.status(401).json({ success: false, error: 'Session not found' })
      return
    }

    if (session.expiresAt < new Date()) {
      // Delete expired session
      try { await authRepository.deleteSession(sid) } catch { /* ignore */ }
      logAuth401(req, 'session expired')
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
