import axios from 'axios'
import type { ApiResponse, ReferenceClass } from '@/types'

const api = axios.create({ baseURL: '' })
const BASE = '/api/reference/classes'

export const referenceClassService = {
  async search(params?: {
    q?: string
    category?: string
    limit?: number
    offset?: number
  }): Promise<ReferenceClass[]> {
    const res = await api.get<ApiResponse<ReferenceClass[]>>(BASE, {
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
