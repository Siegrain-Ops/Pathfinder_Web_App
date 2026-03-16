import { apiClient as api } from '@/lib/api/client'
import type { ApiResponse, ReferenceAbilityResult } from '@/types'
const BASE = '/api/reference/abilities'

export const referenceAbilityService = {
  async search(params?: {
    q?:             string
    kind?:          'ability' | 'talent'
    className?:     string
    category?:      string
    race?:          string
    bloodlineName?: string
    mysteryName?:   string
    domainName?:    string
    archetypeName?: string
    limit?:         number
    offset?:        number
  }): Promise<ReferenceAbilityResult[]> {
    const res = await api.get<ApiResponse<ReferenceAbilityResult[]>>(BASE, {
      params: {
        q:             params?.q,
        kind:          params?.kind,
        className:     params?.className,
        category:      params?.category,
        race:          params?.race,
        bloodlineName: params?.bloodlineName,
        mysteryName:   params?.mysteryName,
        domainName:    params?.domainName,
        archetypeName: params?.archetypeName,
        limit:         params?.limit  ?? 20,
        offset:        params?.offset ?? 0,
      },
    })

    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },
}
