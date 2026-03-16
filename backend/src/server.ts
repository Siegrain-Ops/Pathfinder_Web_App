import express from 'express'
import cors    from 'cors'
import dotenv  from 'dotenv'
import cookieParser from 'cookie-parser'

import { characterRoutes }    from './modules/characters/routes'
import { authRoutes }         from './modules/auth/auth.router'
import { referenceSpellRoutes } from './modules/reference/spells/routes'
import { referenceFeatRoutes }  from './modules/reference/feats/routes'
import { referenceRaceRoutes }  from './modules/reference/races/routes'
import { referenceClassRoutes } from './modules/reference/classes/routes'
import { referenceAbilityRoutes }    from './modules/reference/abilities/routes'
import { referenceArchetypeRoutes }  from './modules/reference/archetypes/routes'
import { referenceBloodlineRoutes }  from './modules/reference/bloodlines/routes'
import { referenceDomainRoutes }     from './modules/reference/domains/routes'
import { referenceMysteryRoutes }    from './modules/reference/mysteries/routes'
import { errorHandler }              from './common/middleware/errorHandler'

dotenv.config()

const app  = express()
const PORT = process.env.PORT ?? 3000

// ── Global middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } })
})

// ── API routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',            authRoutes)
app.use('/api/characters',      characterRoutes)
app.use('/api/reference/spells', referenceSpellRoutes)
app.use('/api/reference/feats',  referenceFeatRoutes)
app.use('/api/reference/races',  referenceRaceRoutes)
app.use('/api/reference/classes', referenceClassRoutes)
app.use('/api/reference/abilities',  referenceAbilityRoutes)
app.use('/api/reference/archetypes', referenceArchetypeRoutes)
app.use('/api/reference/bloodlines', referenceBloodlineRoutes)
app.use('/api/reference/domains',    referenceDomainRoutes)
app.use('/api/reference/mysteries',  referenceMysteryRoutes)

// ── 404 for unknown routes ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// ── Global error handler (must be last) ───────────────────────────────────
app.use(errorHandler)

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`)
  console.log(`[server] env: ${process.env.NODE_ENV ?? 'development'}`)
})

export default app
