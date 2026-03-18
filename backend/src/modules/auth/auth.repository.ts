// ---------------------------------------------------------------------------
// Auth Repository — Prisma data access for users and sessions
// ---------------------------------------------------------------------------

import { prisma } from '../../common/db/prisma'

function getEmailVerificationTokenDelegate() {
  return (prisma as typeof prisma & {
    emailVerificationToken?: {
      create: typeof prisma.emailVerificationToken.create
      findUnique: typeof prisma.emailVerificationToken.findUnique
      findFirst: typeof prisma.emailVerificationToken.findFirst
      deleteMany: typeof prisma.emailVerificationToken.deleteMany
      count: typeof prisma.emailVerificationToken.count
    }
  }).emailVerificationToken
}

function getPasswordResetTokenDelegate() {
  return (prisma as typeof prisma & {
    passwordResetToken?: {
      create: typeof prisma.passwordResetToken.create
      findUnique: typeof prisma.passwordResetToken.findUnique
      delete: typeof prisma.passwordResetToken.delete
      deleteMany: typeof prisma.passwordResetToken.deleteMany
    }
  }).passwordResetToken
}

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
    const delegate = getEmailVerificationTokenDelegate()
    if (!delegate) throw new Error('EmailVerificationToken model is not available in Prisma Client')
    return delegate.create({
      data: { userId, tokenHash, expiresAt },
    })
  },

  async findEmailVerificationTokenByHash(tokenHash: string) {
    const delegate = getEmailVerificationTokenDelegate()
    if (!delegate) return null
    return delegate.findUnique({
      where: { tokenHash },
      include: { user: true },
    })
  },

  async findRecentEmailVerificationToken(userId: string, since: Date) {
    const delegate = getEmailVerificationTokenDelegate()
    if (!delegate) return null
    return delegate.findFirst({
      where: { userId, createdAt: { gte: since } },
    })
  },

  async deleteEmailVerificationTokensByUserId(userId: string) {
    const delegate = getEmailVerificationTokenDelegate()
    if (!delegate) return
    await delegate.deleteMany({ where: { userId } })
  },

  async hasEmailVerificationTokens(userId: string): Promise<boolean> {
    const delegate = getEmailVerificationTokenDelegate()
    if (!delegate) return false
    const count = await delegate.count({ where: { userId } })
    return count > 0
  },

  // ── Password Reset Tokens ─────────────────────────────────────────────────

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    const delegate = getPasswordResetTokenDelegate()
    if (!delegate) throw new Error('PasswordResetToken model is not available in Prisma Client')
    return delegate.create({
      data: { userId, tokenHash, expiresAt },
    })
  },

  async findPasswordResetTokenByHash(tokenHash: string) {
    const delegate = getPasswordResetTokenDelegate()
    if (!delegate) return null
    return delegate.findUnique({
      where: { tokenHash },
      include: { user: true },
    })
  },

  async deletePasswordResetToken(id: string) {
    const delegate = getPasswordResetTokenDelegate()
    if (!delegate) return
    await delegate.delete({ where: { id } })
  },

  async deletePasswordResetTokensByUserId(userId: string) {
    const delegate = getPasswordResetTokenDelegate()
    if (!delegate) return
    await delegate.deleteMany({ where: { userId } })
  },
}
