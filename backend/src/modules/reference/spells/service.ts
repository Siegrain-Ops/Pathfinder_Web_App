import { referenceSpellRepository } from './repository'
import { AppError }                 from '../../../common/errors/AppError'
import type { SpellSearchParams, ReferenceSpell } from '../types'

export const referenceSpellService = {
  async search(params: SpellSearchParams): Promise<ReferenceSpell[]> {
    const { q, school, class: className, level, limit = 50, offset = 0 } = params

    // When a class filter is requested we need to post-filter in memory,
    // so fetch all matching rows first (no DB-level limit/offset yet).
    if (className !== undefined) {
      const all = await referenceSpellRepository.searchAll({ q, school })

      const filtered = all.filter(spell => {
        const spellLevel = spell.spellLevelJson[className]
        if (spellLevel === undefined) return false
        if (level !== undefined) return spellLevel <= level
        return true
      })

      return filtered.slice(offset, offset + limit)
    }

    return referenceSpellRepository.search({ q, school, limit, offset })
  },

  async getById(id: string): Promise<ReferenceSpell> {
    const spell = await referenceSpellRepository.findById(id)
    if (!spell) throw AppError.notFound('Spell')
    return spell
  },
}
