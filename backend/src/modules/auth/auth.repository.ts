// ---------------------------------------------------------------------------
// Auth Repository — Prisma data access for users and sessions
// ---------------------------------------------------------------------------

import { prisma } from '../../common/db/prisma'

// ── User ────────────────────────────────────────────────────────────────────

export const authRepository = {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  },

  async findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  },

  async createUser(email: string, passwordHash: string, displayName: string) {
    return prisma.user.create({
      data: { email, passwordHash, displayName },
    })
  },

  // ── Session ───────────────────────────────────────────────────────────────

  async createSession(userId: string, expiresAt: Date) {
    return prisma.session.create({
      data: { userId, expiresAt },
    })
  },

  async findSessionById(id: string) {
    return prisma.session.findUnique({
      where: { id },
      include: { user: true },
    })
  },

  async deleteSession(id: string) {
    await prisma.session.delete({ where: { id } })
  },

  async deleteExpiredSessions(userId: string) {
    await prisma.session.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    })
  },
}
