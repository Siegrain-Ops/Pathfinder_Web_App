import { apiClient as api } from '@/lib/api/client'
import type { ApiResponse, ReferenceBloodline } from '@/types'
const BASE = '/api/reference/bloodlines'

export const referenceBloodlineService = {
  async search(params?: {
    q?:        string
    className?: string
    limit?:    number
    offset?:   number
  }): Promise<ReferenceBloodline[]> {
    const res = await api.get<ApiResponse<ReferenceBloodline[]>>(BASE, {
      params: {
        q:         params?.q,
        className: params?.className,
        limit:     params?.limit  ?? 100,
        offset:    params?.offset ?? 0,
      },
    })
    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },
}
