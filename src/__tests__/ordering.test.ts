import { describe, it, expect } from 'vitest'
import type { ExportItem } from '../types'
import { spatialSort, ROW_TOLERANCE_PX } from '../sandbox/ordering'

function item(
  id: string,
  x: number,
  y: number,
  overrides?: Partial<ExportItem>
): ExportItem {
  return {
    id,
    kind: 'sticky',
    content: id,
    position: { x, y },
    ...overrides,
  }
}

describe('spatialSort', () => {
  it('returns empty array for empty input', () => {
    expect(spatialSort([])).toEqual([])
  })

  it('returns single item unchanged', () => {
    const items = [item('A', 100, 100)]
    expect(spatialSort(items)).toEqual(items)
  })

  it('sorts two items top-to-bottom', () => {
    const top = item('top', 100, 50)
    const bottom = item('bottom', 100, 200)
    expect(spatialSort([bottom, top]).map((i) => i.id)).toEqual(['top', 'bottom'])
  })

  it('sorts two items left-to-right within same row', () => {
    const left = item('left', 50, 100)
    const right = item('right', 200, 100)
    expect(spatialSort([right, left]).map((i) => i.id)).toEqual(['left', 'right'])
  })

  it('groups items within ROW_TOLERANCE_PX into one row', () => {
    // A and C share a row (y diff = ROW_TOLERANCE_PX - 1), B is below
    const a = item('A', 100, 50)
    const c = item('C', 200, 50 + ROW_TOLERANCE_PX - 1)
    const b = item('B', 50, 200)
    const result = spatialSort([b, c, a]).map((i) => i.id)
    // A and C should be in the top row (A left of C), B below
    expect(result).toEqual(['A', 'C', 'B'])
  })

  it('separates items farther apart than ROW_TOLERANCE_PX into different rows', () => {
    const a = item('A', 200, 50)
    const b = item('B', 50, 50 + ROW_TOLERANCE_PX + 1)
    const result = spatialSort([a, b]).map((i) => i.id)
    // A is higher, B is in its own row below
    expect(result).toEqual(['A', 'B'])
  })

  it('sorts a realistic 3-column x 2-row grid correctly', () => {
    // Row 1: y=0 → A(x=0), B(x=100), C(x=200)
    // Row 2: y=100 → D(x=50), E(x=150), F(x=250)
    const grid = [
      item('C', 200, 0),
      item('F', 250, 100),
      item('A', 0, 0),
      item('D', 50, 100),
      item('B', 100, 0),
      item('E', 150, 100),
    ]
    const result = spatialSort(grid).map((i) => i.id)
    expect(result).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
  })

  it('does not mutate the input array', () => {
    const original = [item('B', 200, 0), item('A', 100, 0)]
    const copy = [...original]
    spatialSort(original)
    expect(original).toEqual(copy)
  })
})
