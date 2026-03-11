// ---------------------------------------------------------------------------
// Shared PrismaClient singleton
//
// Import this instance in every repository instead of calling `new PrismaClient()`.
// A single instance manages the MySQL connection pool; multiple instances would
// each open their own pool and exhaust the server's connection limit.
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
})
