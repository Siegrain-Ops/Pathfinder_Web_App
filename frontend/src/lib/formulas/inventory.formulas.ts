// ---------------------------------------------------------------------------
// Inventory & Encumbrance Formulas
// ---------------------------------------------------------------------------

import type { InventoryItem, Inventory } from '@/types/inventory.types'

/**
 * Total carried weight = sum of (item.weight × item.quantity) for all items.
 */
export function calcTotalWeight(items: InventoryItem[]): number {
  return items.reduce((sum, item) => sum + item.weight * item.quantity, 0)
}

/**
 * Pathfinder carry capacity by Strength score.
 *
 * Table: https://www.d20pfsrd.com/alignment-description/carrying-capacity/
 * Returns the LIGHT load limit in pounds for the given STR score.
 * Medium = ×2, Heavy = ×3.
 */
const LIGHT_LOAD_BY_STR: Record<number, number> = {
  1: 3,   2: 6,   3: 10,  4: 13,  5: 16,
  6: 20,  7: 23,  8: 26,  9: 30,  10: 33,
  11: 38, 12: 43, 13: 50, 14: 58, 15: 66,
  16: 76, 17: 86, 18: 100, 19: 116, 20: 133,
  21: 153, 22: 173, 23: 200, 24: 233, 25: 266,
  26: 306, 27: 346, 28: 400, 29: 466, 30: 533,
}

export function getLightLoadLimit(strScore: number): number {
  const clamped = Math.max(1, Math.min(30, strScore))
  return LIGHT_LOAD_BY_STR[clamped] ?? 33
}

export function getMediumLoadLimit(strScore: number): number {
  return getLightLoadLimit(strScore) * 2
}

export function getHeavyLoadLimit(strScore: number): number {
  return getLightLoadLimit(strScore) * 3
}

export type EncumbranceCategory = 'light' | 'medium' | 'heavy' | 'over'

/**
 * Returns the encumbrance category for a given total weight and STR score.
 */
export function getEncumbranceCategory(
  totalWeight: number,
  strScore: number,
): EncumbranceCategory {
  if (totalWeight <= getLightLoadLimit(strScore))  return 'light'
  if (totalWeight <= getMediumLoadLimit(strScore)) return 'medium'
  if (totalWeight <= getHeavyLoadLimit(strScore))  return 'heavy'
  return 'over'
}

/**
 * Recomputes the inventory totals (total weight, max carry weight).
 */
export function calcInventory(inventory: Inventory, strScore: number): Inventory {
  const totalWeight    = calcTotalWeight(inventory.items)
  const maxCarryWeight = getHeavyLoadLimit(strScore)
  return { ...inventory, totalWeight, maxCarryWeight }
}
