// ---------------------------------------------------------------------------
// Axios client instances
// ---------------------------------------------------------------------------

import axios from 'axios'
import type { AxiosError } from 'axios'
import { useAuthStore } from '@/app/store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

// Shape of the error body our backend returns on failure
interface ApiErrorBody {
  success: false
  error?: string
}

/**
 * Response interceptor applied to every client instance.
 * When the backend returns a 4xx/5xx with { error: "..." } in the body,
 * we surface that message directly — otherwise callers would only see
 * Axios's generic "Request failed with status code 403" string.
 */
function withErrorInterceptor(client: ReturnType<typeof axios.create>) {
  client.interceptors.response.use(
    (res) => res,
    (err: AxiosError<ApiErrorBody>) => {
      const status = err.response?.status
      const backendMessage = err.response?.data?.error

      if (status === 401) {
        const message = (backendMessage ?? '').toLowerCase()
        if (message.includes('session expired') || message.includes('not authenticated') || message.includes('session not found')) {
          useAuthStore.getState().handleSessionExpired()
        }
      }

      if (backendMessage) {
        return Promise.reject(new Error(backendMessage))
      }
      return Promise.reject(err)
    },
  )
  return client
}

// Used for public / unauthenticated endpoints (reference data, etc.)
export const apiClient = withErrorInterceptor(
  axios.create({ baseURL: API_BASE_URL }),
)

// Used for all endpoints that require a session cookie
export const authApiClient = withErrorInterceptor(
  axios.create({ baseURL: API_BASE_URL, withCredentials: true }),
)
