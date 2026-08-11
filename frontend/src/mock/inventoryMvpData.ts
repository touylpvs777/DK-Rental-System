// DK Rental — Executive MVP demo data for the Inventory KPIs surfaced on the
// main dashboard. Field names mirror the real ReorderAlert/SparePart shapes
// in types/inventory.ts so this can be swapped for the live API later.

export interface LowStockPart {
  id: string
  partNumber: string
  name: string
  quantityAvailable: number
  minStockLevel: number
  reorderQuantity: number
}

// Sorted most-critical first (lowest stock relative to its minimum).
export const MOCK_LOW_STOCK_PARTS: LowStockPart[] = [
  { id: 'sp-001', partNumber: 'BELT-V88', name: 'Drive Belt V-Type 88"', quantityAvailable: 1, minStockLevel: 5, reorderQuantity: 15 },
  { id: 'sp-002', partNumber: 'HYD-OF-102', name: 'Hydraulic Oil Filter', quantityAvailable: 2, minStockLevel: 8, reorderQuantity: 20 },
  { id: 'sp-003', partNumber: 'TIRE-650-10', name: 'Forklift Tire 6.50-10 (Solid)', quantityAvailable: 3, minStockLevel: 6, reorderQuantity: 12 },
  { id: 'sp-004', partNumber: 'SPK-LPG-04', name: 'Ignition Spark Plug Set — LPG', quantityAvailable: 4, minStockLevel: 10, reorderQuantity: 24 },
]

export const MOCK_TOTAL_STOCK_VALUE_LAK = 145_000_000
