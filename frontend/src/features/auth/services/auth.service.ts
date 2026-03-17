// ---------------------------------------------------------------------------
// Auth API service
// ---------------------------------------------------------------------------

import { authApiClient as api } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api.types'

export interface AuthUser {
  id: string
  email: string
  displayName: string
}

const BASE = '/api/auth'

export const authService = {
  async register(email: string, password: string, displayName: string): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(`${BASE}/register`, { email, password, displayName })
    if (!res.data.success) throw new Error((res.data as { error?: string }).error ?? 'Registration failed')
    return res.data.data
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await api.post<ApiResponse<AuthUser>>(`${BASE}/login`, { email, password })
    if (!res.data.success) throw new Error((res.data as { error?: string }).error ?? 'Login failed')
    return res.data.data
  },

  async logout(): Promise<void> {
    await api.post(`${BASE}/logout`)
  },

  async me(): Promise<AuthUser | null> {
    try {
      const res = await api.get<ApiResponse<AuthUser>>(`${BASE}/me`)
      if (!res.data.success) return null
      return res.data.data
    } catch {
      return null
    }
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(`${BASE}/verify-email`, { token })
    if (!res.data.success) throw new Error((res.data as { error?: string }).error ?? 'Verification failed')
    return res.data.data
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(`${BASE}/resend-verification`, { email })
    if (!res.data.success) throw new Error((res.data as { error?: string }).error ?? 'Failed to resend email')
    return res.data.data
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(`${BASE}/forgot-password`, { email })
    if (!res.data.success) throw new Error((res.data as { error?: string }).error ?? 'Request failed')
    return res.data.data
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(`${BASE}/reset-password`, { token, password })
    if (!res.data.success) throw new Error((res.data as { error?: string }).error ?? 'Reset failed')
    return res.data.data
  },
}
