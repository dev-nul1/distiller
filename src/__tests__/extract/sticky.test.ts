import { describe, it, expect } from 'vitest'
import { extractSticky } from '../../sandbox/extract/sticky'

// ---------------------------------------------------------------------------
// Minimal StickyNode mock factory
// ---------------------------------------------------------------------------

type StuckNode = { type: string }

function mockSticky(overrides: {
  id?: string
  characters?: string
  stuckNodes?: StuckNode[]
  authorVisible?: boolean
  authorName?: string
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number } | null
}): StickyNode {
  const {
    id = 'sticky-1',
    characters = 'Hello',
    stuckNodes = [],
    authorVisible = false,
    authorName = '',
    absoluteBoundingBox = { x: 0, y: 0, width: 100, height: 60 },
  } = overrides

  return {
    id,
    type: 'STICKY',
    text: {
      characters,
      // getStyledTextSegments: return empty so extractRichText returns null
      // (no formatting → richContent omitted; content string used instead)
      getStyledTextSegments: () => [],
    },
    stuckNodes,
    authorVisible,
    authorName,
    absoluteBoundingBox,
  } as unknown as StickyNode
}

// ---------------------------------------------------------------------------
// author-visibility gating
// ---------------------------------------------------------------------------

describe('extractSticky – author gating', () => {
  it('omits author when authorVisible is false, even when authorName is set', () => {
    const node = mockSticky({ authorVisible: false, authorName: 'Alice' })
    const item = extractSticky(node)
    expect(item).not.toBeNull()
    expect(item?.author).toBeUndefined()
  })

  it('omits author when authorVisible is true but authorName is empty', () => {
    const node = mockSticky({ authorVisible: true, authorName: '' })
    const item = extractSticky(node)
    expect(item?.author).toBeUndefined()
  })

  it('includes author when authorVisible is true and authorName is set', () => {
    const node = mockSticky({ authorVisible: true, authorName: 'Alice' })
    const item = extractSticky(node)
    expect(item?.author).toBe('Alice')
  })

  it('normalises whitespace in authorName', () => {
    // trim() removes leading/trailing; /\s+/g collapses internal runs too
    const node = mockSticky({ authorVisible: true, authorName: '  Bob   Smith  ' })
    const item = extractSticky(node)
    expect(item?.author).toBe('Bob Smith')
  })
})

// ---------------------------------------------------------------------------
// basic extraction sanity checks
// ---------------------------------------------------------------------------

describe('extractSticky – basic extraction', () => {
  it('returns null for empty text with no votes', () => {
    const node = mockSticky({ characters: '' })
    expect(extractSticky(node)).toBeNull()
  })

  it('preserves empty stickies that have votes', () => {
    const node = mockSticky({
      characters: '',
      stuckNodes: [{ type: 'STAMP' }],
    })
    const item = extractSticky(node)
    expect(item).not.toBeNull()
    expect(item?.content).toBe('(empty)')
    expect(item?.votes).toBe(1)
  })

  it('extracts content and position', () => {
    const node = mockSticky({
      characters: 'My idea',
      absoluteBoundingBox: { x: 10, y: 20, width: 100, height: 60 },
    })
    const item = extractSticky(node)
    expect(item?.content).toBe('My idea')
    expect(item?.position).toEqual({ x: 10, y: 20 })
  })
})
