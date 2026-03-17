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

  async markUserEmailVerified(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    })
  },

  async updateUserPassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
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

  async deleteAllUserSessions(userId: string) {
    await prisma.session.deleteMany({ where: { userId } })
  },

  // ── Email Verification Tokens ─────────────────────────────────────────────

  async createEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    })
  },

  async findEmailVerificationTokenByHash(tokenHash: string) {
    return prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })
  },

  async findRecentEmailVerificationToken(userId: string, since: Date) {
    return prisma.emailVerificationToken.findFirst({
      where: { userId, createdAt: { gte: since } },
    })
  },

  async deleteEmailVerificationTokensByUserId(userId: string) {
    await prisma.emailVerificationToken.deleteMany({ where: { userId } })
  },

  async hasEmailVerificationTokens(userId: string): Promise<boolean> {
    const count = await prisma.emailVerificationToken.count({ where: { userId } })
    return count > 0
  },

  // ── Password Reset Tokens ─────────────────────────────────────────────────

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    })
  },

  async findPasswordResetTokenByHash(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })
  },

  async deletePasswordResetToken(id: string) {
    await prisma.passwordResetToken.delete({ where: { id } })
  },

  async deletePasswordResetTokensByUserId(userId: string) {
    await prisma.passwordResetToken.deleteMany({ where: { userId } })
  },
}
