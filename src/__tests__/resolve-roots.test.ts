import { describe, it, expect } from 'vitest'
import { resolveRoots } from '../sandbox/resolve-roots'

// ---------------------------------------------------------------------------
// Minimal mock node factory
// ---------------------------------------------------------------------------

type MockNode = {
  type: string
  absoluteBoundingBox: { x: number; y: number; width: number; height: number } | null
  [k: string]: unknown
}

function mockNode(
  type: string,
  bb?: { x: number; y: number; width: number; height: number }
): MockNode {
  return { type, absoluteBoundingBox: bb ?? null }
}

// ---------------------------------------------------------------------------
// Mock figma global
// ---------------------------------------------------------------------------

function setFigmaMock(overrides: {
  children?: MockNode[]
  selection?: MockNode[]
  viewportBounds?: { x: number; y: number; width: number; height: number }
}): void {
  const {
    children = [],
    selection = [],
    viewportBounds = { x: 0, y: 0, width: 1920, height: 1080 },
  } = overrides

  // @figma/plugin-typings declares figma as readonly; cast for test purposes.
  ;(globalThis as Record<string, unknown>).figma = {
    currentPage: {
      children: children as unknown as SceneNode[],
      selection: selection as unknown as SceneNode[],
    },
    viewport: { bounds: viewportBounds },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveRoots – page mode', () => {
  it('returns all currentPage.children', () => {
    const nodes = [mockNode('STICKY'), mockNode('TEXT')]
    setFigmaMock({ children: nodes })
    expect(resolveRoots('page')).toEqual(nodes)
  })

  it('returns a copy (does not alias the original array)', () => {
    const nodes = [mockNode('STICKY')]
    setFigmaMock({ children: nodes })
    const result = resolveRoots('page')
    result.push(mockNode('TEXT'))
    expect(nodes).toHaveLength(1)
  })
})

describe('resolveRoots – selection mode', () => {
  it('returns the current selection', () => {
    const sel = [mockNode('SECTION'), mockNode('STICKY')]
    setFigmaMock({ selection: sel })
    expect(resolveRoots('selection')).toEqual(sel)
  })

  it('returns empty array when selection is empty', () => {
    setFigmaMock({ selection: [] })
    expect(resolveRoots('selection')).toEqual([])
  })
})

describe('resolveRoots – viewport mode', () => {
  const vp = { x: 0, y: 0, width: 1000, height: 800 }

  it('returns nodes whose bounding box intersects the viewport', () => {
    const inside = mockNode('STICKY', { x: 100, y: 100, width: 150, height: 150 })
    const outside = mockNode('TEXT', { x: 1100, y: 100, width: 100, height: 50 })
    setFigmaMock({ children: [inside, outside], viewportBounds: vp })
    const result = resolveRoots('viewport')
    expect(result).toEqual([inside])
  })

  it('includes nodes that partially overlap the left edge', () => {
    const partial = mockNode('STICKY', { x: -50, y: 0, width: 100, height: 100 })
    setFigmaMock({ children: [partial], viewportBounds: vp })
    expect(resolveRoots('viewport')).toEqual([partial])
  })

  it('includes nodes that partially overlap the right edge', () => {
    const partial = mockNode('STICKY', { x: 950, y: 0, width: 100, height: 100 })
    setFigmaMock({ children: [partial], viewportBounds: vp })
    expect(resolveRoots('viewport')).toEqual([partial])
  })

  it('excludes nodes just outside the right edge', () => {
    const outside = mockNode('STICKY', { x: 1000, y: 0, width: 100, height: 100 })
    setFigmaMock({ children: [outside], viewportBounds: vp })
    expect(resolveRoots('viewport')).toEqual([])
  })

  it('excludes nodes with null absoluteBoundingBox', () => {
    const noBB = mockNode('STICKY', undefined)
    setFigmaMock({ children: [noBB], viewportBounds: vp })
    expect(resolveRoots('viewport')).toEqual([])
  })

  it('returns empty when page has no children', () => {
    setFigmaMock({ children: [], viewportBounds: vp })
    expect(resolveRoots('viewport')).toEqual([])
  })
})
