import { prisma } from '../../../common/db/prisma'
import type { DomainSearchParams, ReferenceDomain } from '../types'

export const referenceDomainRepository = {
  async search(params: DomainSearchParams): Promise<ReferenceDomain[]> {
    const { q, className, limit = 50, offset = 0 } = params

    // Some imported subdomains exist more than once with different source URLs
    // but the same visible name. The character creation UI only needs one
    // option per display name, so we deduplicate after the query.
    const rows = await prisma.referenceDomain.findMany({
      where: {
        ...(q         ? { name:      { contains: q         } } : {}),
        ...(className ? { className: { contains: className } } : {}),
      },
      orderBy: { name: 'asc' },
      take: limit * 4,
      skip: offset,
    })

    const seen = new Set<string>()
    const deduped = rows.filter(row => {
      const key = row.name.trim().toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return deduped.slice(0, limit)
  },
}
