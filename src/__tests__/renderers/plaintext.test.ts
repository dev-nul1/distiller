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
  makeItem,
  makeSection,
  resetIds,
} from './fixtures'

beforeEach(() => resetIds())

describe('renderPlaintext – empty IR', () => {
  it('returns empty string', () => {
    expect(renderPlaintext(emptyIR, {})).toBe('')
  })
})

describe('renderPlaintext – single orphan, no section', () => {
  it('renders with a label line and content', () => {
    const out = renderPlaintext(singleOrphanIR, {})
    expect(out).toContain('Sticky')
    expect(out).toContain('Hello world')
  })
})

describe('renderPlaintext – flat sections', () => {
  it('renders section titles and items with labels', () => {
    const out = renderPlaintext(flatSectionsIR(), {})
    const lines = out.split('\n')
    expect(lines).toContain('Alpha')
    expect(lines).toContain('Beta')
    // Items appear as label + indented content
    expect(out).toContain('A1')
    expect(out).toContain('A2')
    expect(out).toContain('B1')
  })

  it('separates items within a section with a blank line', () => {
    const out = renderPlaintext(flatSectionsIR(), {})
    // Blank line should appear between item blocks within Alpha section
    expect(out).toMatch(/A1\n\n  Sticky/)
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
    // Label lines: depth-0 items at 2 spaces, depth-1 items at 4 spaces
    expect(out).toContain('  Sticky')   // depth-0 label
    expect(out).toContain('    Sticky') // depth-1 label
    // Content lines one level deeper
    expect(out).toContain('    Parent item')  // depth-0 content at 4 spaces
    expect(out).toContain('      Child item') // depth-1 content at 6 spaces
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
    expect(out).not.toMatch(/\(\d+ votes?\)/)
  })

  it('omits suffix on items with no votes', () => {
    const out = renderPlaintext(votesIR(), {})
    expect(out).toContain('No votes idea')
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
    expect(out).toContain('Do this')
    expect(out).toContain('Also do that')
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

describe('renderPlaintext – author in label', () => {
  it('includes author with em dash when includeAuthors is true', () => {
    resetIds()
    const ir = makeIR({
      orphans: [makeItem({ content: 'Hello', author: 'Alice' })],
    })
    const out = renderPlaintext(ir, { includeAuthors: true })
    expect(out).toContain('Sticky \u2014 Alice')
  })

  it('omits author when includeAuthors is false', () => {
    resetIds()
    const ir = makeIR({
      orphans: [makeItem({ content: 'Hello', author: 'Alice' })],
    })
    const out = renderPlaintext(ir, { includeAuthors: false })
    expect(out).not.toContain('Alice')
    expect(out).not.toContain('\u2014')
  })

  it('omits em dash when author is absent', () => {
    resetIds()
    const ir = makeIR({
      orphans: [makeItem({ content: 'Hello' })],
    })
    const out = renderPlaintext(ir, { includeAuthors: true })
    expect(out).not.toContain('\u2014')
  })
})
