// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'potion'
  | 'scroll'
  | 'wand'
  | 'ring'
  | 'wondrous'
  | 'gear'
  | 'ammunition'
  | 'tool'
  | 'trade good'
  | 'other'

export interface InventoryItem {
  id: string
  name: string
  category: ItemCategory
  quantity: number
  /** Weight in pounds per unit */
  weight: number
  /** Value in gold pieces */
  value: number
  equipped: boolean
  description: string
}

export interface Inventory {
  items: InventoryItem[]
  /** Currency in copper, silver, gold, platinum pieces */
  currency: Currency
  /** Max carry weight derived from STR score */
  maxCarryWeight: number
  /** Computed: sum of (item.weight * item.quantity) */
  totalWeight: number
}

export interface Currency {
  platinum: number
  gold: number
  silver: number
  copper: number
}

export const defaultInventoryItem = (id: string): InventoryItem => ({
  id,
  name: '',
  category: 'gear',
  quantity: 1,
  weight: 0,
  value: 0,
  equipped: false,
  description: '',
})

export const defaultCurrency = (): Currency => ({
  platinum: 0,
  gold: 0,
  silver: 0,
  copper: 0,
})

export const defaultInventory = (): Inventory => ({
  items: [],
  currency: defaultCurrency(),
  maxCarryWeight: 0,
  totalWeight: 0,
})
