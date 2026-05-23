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
  codeIR,
  codeNoLangIR,
  richInlineItem,
  richLinkItem,
  richSelfLinkItem,
  richListItem,
  richOrderedListItem,
  richMixedItem,
  makeIR,
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

describe('renderPlaintext – rich text inline (no markup)', () => {
  it('strips bold/italic/strikethrough markers', () => {
    const ir = makeIR({ orphans: [richInlineItem()] })
    const out = renderPlaintext(ir, {})
    expect(out).not.toContain('**')
    expect(out).not.toContain('~~')
    expect(out).not.toContain('*')
  })

  it('preserves the plain text of formatted runs', () => {
    const ir = makeIR({ orphans: [richInlineItem()] })
    const out = renderPlaintext(ir, {})
    expect(out).toContain('check the docs')
    expect(out).toContain('details')
    expect(out).toContain('Important')
  })
})

describe('renderPlaintext – rich text links', () => {
  it('includes URL alongside anchor text', () => {
    const ir = makeIR({ orphans: [richLinkItem()] })
    const out = renderPlaintext(ir, {})
    expect(out).toContain('our site (https://example.com)')
  })

  it('does not duplicate URL when href equals display text', () => {
    const ir = makeIR({ orphans: [richSelfLinkItem()] })
    const out = renderPlaintext(ir, {})
    // Should contain the URL once, not twice
    const count = (out.match(/https:\/\/example\.com/g) ?? []).length
    expect(count).toBe(1)
  })
})

describe('renderPlaintext – rich text lists', () => {
  it('renders unordered list items with - prefix', () => {
    const ir = makeIR({ orphans: [richListItem()] })
    const out = renderPlaintext(ir, {})
    expect(out).toContain('- Idea Alpha')
    expect(out).toContain('- Idea Beta')
    expect(out).toContain('- Idea Gamma')
  })

  it('renders ordered list with counters', () => {
    const ir = makeIR({ orphans: [richOrderedListItem()] })
    const out = renderPlaintext(ir, {})
    expect(out).toContain('1. First step')
    expect(out).toContain('2. Second step')
    expect(out).toContain('3. Third step')
  })

  it('renders mixed bold+list without markup syntax', () => {
    const ir = makeIR({ orphans: [richMixedItem()] })
    const out = renderPlaintext(ir, {})
    expect(out).toContain('- Do this')
    expect(out).toContain('- Also do that')
    expect(out).not.toContain('**')
    expect(out).not.toContain('*that*')
  })
})

describe('renderPlaintext – code blocks', () => {
  it('renders code as raw text (no fencing)', () => {
    const out = renderPlaintext(codeIR(), {})
    expect(out).toContain('function greet')
    expect(out).not.toContain('```')
  })

  it('renders code-no-lang as raw text', () => {
    const out = renderPlaintext(codeNoLangIR(), {})
    expect(out).toContain('hello world')
    expect(out).not.toContain('```')
  })
})
