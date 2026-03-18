export type NormalizedSpellcastingType =
  | 'prepared'
  | 'spontaneous'
  | 'custom'
  | 'none'
  | null

export function normalizeSpellcastingType(value: string | null | undefined): NormalizedSpellcastingType {
  const normalized = value?.trim().toLowerCase() ?? null
  if (!normalized) return null
  if (normalized === 'none') return 'none'
  if (normalized.includes('prepared')) return 'prepared'
  if (normalized.includes('spontaneous')) return 'spontaneous'
  if (normalized === 'custom') return 'custom'
  return 'custom'
}

export function isCasterSpellcastingType(value: string | null | undefined): boolean {
  const normalized = normalizeSpellcastingType(value)
  return normalized === 'prepared' || normalized === 'spontaneous' || normalized === 'custom'
}

export function getSpellcastingTypeLabel(value: string | null | undefined): string | null {
  const normalized = normalizeSpellcastingType(value)
  if (normalized === 'prepared') return 'Prepared'
  if (normalized === 'spontaneous') return 'Spontaneous'
  if (normalized === 'custom') return 'Custom'
  return null
}
