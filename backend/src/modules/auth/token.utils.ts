// ---------------------------------------------------------------------------
// Token utilities — generation, hashing, and expiry helpers
// ---------------------------------------------------------------------------

import crypto from 'node:crypto'

/**
 * Generates a cryptographically secure random token.
 * Returns a 64-character lowercase hex string (32 random bytes).
 * This is the plaintext value sent in emails — never stored.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * SHA-256 hash of a plaintext token.
 * This is what gets stored in the database for lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Returns a Date `hours` from now — used for token expiry fields.
 */
export function tokenExpiry(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}
