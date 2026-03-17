// ---------------------------------------------------------------------------
// Auth Store (Zustand)
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { authService, type AuthUser } from '@/features/auth/services/auth.service'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isInitialized: boolean

  login(email: string, password: string): Promise<void>
  register(email: string, password: string, displayName: string): Promise<void>
  logout(): Promise<void>
  initialize(): Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  // ── Initialize (call /me on boot) ──────────────────────────────────────
  initialize: async () => {
    set({ isLoading: true })
    try {
      const user = await authService.me()
      set({ user, isLoading: false, isInitialized: true })
    } catch {
      set({ user: null, isLoading: false, isInitialized: true })
    }
  },

  // ── Login ──────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const user = await authService.login(email, password)
      set({ user, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  // ── Register — does NOT log the user in; email verification is required ─
  register: async (email, password, displayName) => {
    set({ isLoading: true })
    try {
      await authService.register(email, password, displayName)
      set({ isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  // ── Logout ─────────────────────────────────────────────────────────────
  logout: async () => {
    set({ isLoading: true })
    try {
      await authService.logout()
    } finally {
      set({ user: null, isLoading: false })
    }
  },
}))
