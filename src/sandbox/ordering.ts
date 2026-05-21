import type { ExportItem } from '../types'

/**
 * Y-distance tolerance for grouping items into the same visual row.
 * Roughly half the median sticky height. Tunable.
 */
export const ROW_TOLERANCE_PX = 40

/**
 * Sort items spatially: top-to-bottom rows, left-to-right within each row.
 *
 * Algorithm:
 * 1. Sort all items by y ascending.
 * 2. Greedily assign each item to an existing row if its y is within
 *    ROW_TOLERANCE_PX of that row's first item's y; otherwise start a new row.
 * 3. Sort rows by their minimum y (ascending).
 * 4. Within each row sort by x (ascending).
 */
export function spatialSort(items: ExportItem[]): ExportItem[] {
  if (items.length === 0) return []

  const sorted = [...items].sort((a, b) => a.position.y - b.position.y)

  const rows: ExportItem[][] = []
  for (const item of sorted) {
    const row = rows.find(
      (r) => Math.abs(item.position.y - r[0].position.y) <= ROW_TOLERANCE_PX
    )
    if (row) {
      row.push(item)
    } else {
      rows.push([item])
    }
  }

  rows.sort(
    (a, b) =>
      Math.min(...a.map((i) => i.position.y)) -
      Math.min(...b.map((i) => i.position.y))
  )

  for (const row of rows) {
    row.sort((a, b) => a.position.x - b.position.x)
  }

  return rows.flat()
}

