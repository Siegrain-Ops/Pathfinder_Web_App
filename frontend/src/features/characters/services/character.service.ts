// ---------------------------------------------------------------------------
// Character API service
// ---------------------------------------------------------------------------

import { authApiClient as api } from '@/lib/api/client'
import type { Character, CharacterSummary, CreateCharacterInput } from '@/types'
import type { ApiResponse } from '@/types/api.types'

const BASE = '/api/characters'

export const characterService = {
  async getAll(): Promise<CharacterSummary[]> {
    const res = await api.get<ApiResponse<CharacterSummary[]>>(BASE)
    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },

  async getById(id: string): Promise<Character> {
    const res = await api.get<ApiResponse<Character>>(`${BASE}/${id}`)
    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },

  async create(input: CreateCharacterInput): Promise<Character> {
    const res = await api.post<ApiResponse<Character>>(BASE, input)
    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },

  async update(id: string, input: Partial<CreateCharacterInput>): Promise<Character> {
    const res = await api.put<ApiResponse<Character>>(`${BASE}/${id}`, input)
    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },

  async remove(id: string): Promise<void> {
    const res = await api.delete<ApiResponse<null>>(`${BASE}/${id}`)
    if (!res.data.success) throw new Error(res.data.error)
  },

  async duplicate(id: string): Promise<Character> {
    const res = await api.post<ApiResponse<Character>>(`${BASE}/${id}/duplicate`)
    if (!res.data.success) throw new Error(res.data.error)
    return res.data.data
  },
}
