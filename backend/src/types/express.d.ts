// ---------------------------------------------------------------------------
// Express Request augmentation — adds `user` and `sessionId` after auth
// ---------------------------------------------------------------------------

declare namespace Express {
  interface Request {
    user?: {
      id: string
      email: string
      displayName: string
    }
    sessionId?: string
  }
}
