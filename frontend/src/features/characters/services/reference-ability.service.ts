import axios from 'axios'
import type { ApiResponse, ReferenceAbilityResult } from '@/types'

const api = axios.create({ baseURL: '' })
const BASE = '/api/reference/abilities'

export const referenceAbilityService = {
  async search(params?: {
    q?: string
    kind?: 'ability' | 'talent'
    className?: string
    category?: string
    limit?: number
    offset?: number
  }): Promise<ReferenceAbilityResult[]> {
    const res = await api.get<ApiResponse<ReferenceAbilityResult[]>>(BASE, {
      params: {
        q: params?.q,
        kind: params?.kind,
        className: params?.className,
        category: params?.category,
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
      },
    })

    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },
}
