import axios from 'axios'
import type { ApiResponse, ReferenceArchetype } from '@/types'

const api  = axios.create({ baseURL: '' })
const BASE = '/api/reference/archetypes'

export const referenceArchetypeService = {
  async search(params?: {
    q?:        string
    className?: string
    limit?:    number
    offset?:   number
  }): Promise<ReferenceArchetype[]> {
    const res = await api.get<ApiResponse<ReferenceArchetype[]>>(BASE, {
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
