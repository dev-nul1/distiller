import { describe, it, expect, beforeEach } from 'vitest'
import { renderPlaintext } from '../../ui/renderers/plaintext'
import {
  emptyIR,
  singleOrphanIR,
  flatSectionsIR,
  nestedSectionsIR,
  votesIR,
  tableIR,
  specialCharsIR,
  mediumIR,
  resetIds,
} from './fixtures'

beforeEach(() => resetIds())

describe('renderPlaintext – empty IR', () => {
  it('returns empty string', () => {
    expect(renderPlaintext(emptyIR, {})).toBe('')
  })
})

describe('renderPlaintext – single orphan, no section', () => {
  it('renders content as a top-level bullet', () => {
    const out = renderPlaintext(singleOrphanIR, {})
    expect(out).toBe('- Hello world')
  })
})

describe('renderPlaintext – flat sections', () => {
  it('renders section titles and items', () => {
    const out = renderPlaintext(flatSectionsIR(), {})
    const lines = out.split('\n')
    expect(lines).toContain('Alpha')
    expect(lines).toContain('  - A1')
    expect(lines).toContain('  - A2')
    expect(lines).toContain('Beta')
    expect(lines).toContain('  - B1')
  })

  it('separates sections with a blank line', () => {
    const out = renderPlaintext(flatSectionsIR(), {})
    // There should be at least one blank line between Alpha and Beta sections
    expect(out).toMatch(/Alpha[\s\S]*\n\nBeta/)
  })
})

describe('renderPlaintext – nested sections', () => {
  it('indents child section title deeper', () => {
    const out = renderPlaintext(nestedSectionsIR(), {})
    const lines = out.split('\n')
    const outerIdx = lines.findIndex((l) => l === 'Outer')
    const innerIdx = lines.findIndex((l) => l.includes('Inner'))
    expect(outerIdx).toBeGreaterThanOrEqual(0)
    expect(innerIdx).toBeGreaterThan(outerIdx)
    // Inner at depth 1 should be indented by 2 spaces
    expect(lines[innerIdx]).toMatch(/^  Inner/)
  })

  it('indents child items deeper than parent items', () => {
    const out = renderPlaintext(nestedSectionsIR(), {})
    const lines = out.split('\n')
    const parentItem = lines.find((l) => l.includes('Parent item'))
    const childItem = lines.find((l) => l.includes('Child item'))
    expect(parentItem).toMatch(/^  - /)   // depth 0 items: 2 spaces
    expect(childItem).toMatch(/^    - /)  // depth 1 items: 4 spaces
  })
})

describe('renderPlaintext – votes', () => {
  it('appends vote count when includeVotes is not false', () => {
    const out = renderPlaintext(votesIR(), {})
    expect(out).toContain('Top idea (5 votes)')
    expect(out).toContain('Second idea (1 vote)')
  })

  it('uses singular "vote" for exactly 1', () => {
    const out = renderPlaintext(votesIR(), {})
    expect(out).toContain('Second idea (1 vote)')
    expect(out).not.toContain('Second idea (1 votes)')
  })

  it('omits votes when includeVotes is false', () => {
    const out = renderPlaintext(votesIR(), { includeVotes: false })
    // Check that no vote-count suffix like "(5 votes)" or "(1 vote)" appears.
    // Note: item content "No votes idea" contains the word "votes" – that's fine.
    expect(out).not.toMatch(/\(\d+ votes?\)/)
  })

  it('omits suffix on items with no votes', () => {
    const out = renderPlaintext(votesIR(), {})
    // The item with no votes should appear without any "(N votes)" suffix.
    expect(out).toContain('- No votes idea')
    expect(out).not.toMatch(/No votes idea \(\d+ votes?\)/)
  })
})

describe('renderPlaintext – tables (rendered as flat content)', () => {
  it('renders table content string as a bullet', () => {
    const out = renderPlaintext(tableIR(), {})
    expect(out).toContain('Name | Role | Team')
  })
})

describe('renderPlaintext – special characters', () => {
  it('passes through special characters unchanged', () => {
    const out = renderPlaintext(specialCharsIR(), {})
    expect(out).toContain('Has a "quoted" word')
    expect(out).toContain('Comma, separated, text')
    expect(out).toContain('Pipe | character')
  })
})

describe('renderPlaintext – snapshot (medium fixture)', () => {
  it('matches snapshot', () => {
    expect(renderPlaintext(mediumIR(), { includeVotes: true })).toMatchSnapshot()
  })
})
