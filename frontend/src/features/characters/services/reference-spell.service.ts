import { apiClient as api } from '@/lib/api/client'
import type { ApiResponse, ReferenceSpell } from '@/types'
const BASE = '/api/reference/spells'

export const referenceSpellService = {
  async search(params: {
    q?: string
    school?: string
    className?: string
    level?: number
    limit?: number
    offset?: number
  }): Promise<ReferenceSpell[]> {
    const res = await api.get<ApiResponse<ReferenceSpell[]>>(BASE, {
      params: {
        q: params.q,
        school: params.school,
        class: params.className,
        level: params.level,
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
      },
    })
    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },
}
