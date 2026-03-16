import { apiClient as api } from '@/lib/api/client'
import type { ApiResponse, ReferenceFeat } from '@/types'
const BASE = '/api/reference/feats'

export const referenceFeatService = {
  async search(params?: {
    q?: string
    type?: string
    limit?: number
    offset?: number
  }): Promise<ReferenceFeat[]> {
    const res = await api.get<ApiResponse<ReferenceFeat[]>>(BASE, {
      params: {
        q: params?.q,
        type: params?.type,
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
      },
    })

    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },
}
