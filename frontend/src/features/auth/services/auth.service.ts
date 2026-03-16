// ---------------------------------------------------------------------------
// Auth API service
// ---------------------------------------------------------------------------

import axios from 'axios'
import type { ApiResponse } from '@/types/api.types'

export interface AuthUser {
  id: string
  email: string
  displayName: string
}

const api = axios.create({ baseURL: '', withCredentials: true })

const BASE = '/api/auth'

export const authService = {
  async register(email: string, password: string, displayName: string): Promise<AuthUser> {
    const res = await api.post<ApiResponse<AuthUser>>(`${BASE}/register`, { email, password, displayName })
    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await api.post<ApiResponse<AuthUser>>(`${BASE}/login`, { email, password })
    if (!res.data.success) throw new Error(res.data.error)
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
}
