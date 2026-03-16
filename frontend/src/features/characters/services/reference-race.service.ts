import { apiClient as api } from '@/lib/api/client'
import type { ApiResponse, ReferenceRace } from '@/types'
const BASE = '/api/reference/races'

export const referenceRaceService = {
  async search(params?: {
    q?: string
    category?: string
    limit?: number
    offset?: number
  }): Promise<ReferenceRace[]> {
    const res = await api.get<ApiResponse<ReferenceRace[]>>(BASE, {
      params: {
        q: params?.q,
        category: params?.category,
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
      },
    })
    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },
}
