import { describe, it, expect, beforeEach } from 'vitest'
import { renderMarkdown } from '../../ui/renderers/markdown'
import {
  emptyIR,
  singleOrphanIR,
  flatSectionsIR,
  nestedSectionsIR,
  votesIR,
  tableIR,
  specialCharsIR,
  mediumIR,
  makeIR,
  makeSection,
  makeItem,
  resetIds,
} from './fixtures'

beforeEach(() => resetIds())

describe('renderMarkdown – empty IR', () => {
  it('returns empty string', () => {
    expect(renderMarkdown(emptyIR, {})).toBe('')
  })
})

describe('renderMarkdown – single orphan, no section', () => {
  it('renders as a bullet item', () => {
    expect(renderMarkdown(singleOrphanIR, {})).toBe('- Hello world')
  })
})

describe('renderMarkdown – flat sections', () => {
  it('renders depth-0 sections as ## headings', () => {
    const out = renderMarkdown(flatSectionsIR(), {})
    expect(out).toContain('## Alpha')
    expect(out).toContain('## Beta')
  })

  it('renders items as bullet points', () => {
    const out = renderMarkdown(flatSectionsIR(), {})
    expect(out).toContain('- A1')
    expect(out).toContain('- A2')
    expect(out).toContain('- B1')
  })

  it('separates sections with a blank line', () => {
    const out = renderMarkdown(flatSectionsIR(), {})
    expect(out).toMatch(/## Beta/)
    expect(out).toMatch(/\n\n## Beta/)
  })
})

describe('renderMarkdown – nested sections', () => {
  it('renders child section as ### heading', () => {
    const out = renderMarkdown(nestedSectionsIR(), {})
    expect(out).toContain('## Outer')
    expect(out).toContain('### Inner')
  })

  it('child heading appears after parent heading', () => {
    const out = renderMarkdown(nestedSectionsIR(), {})
    const outerIdx = out.indexOf('## Outer')
    const innerIdx = out.indexOf('### Inner')
    expect(innerIdx).toBeGreaterThan(outerIdx)
  })
})

describe('renderMarkdown – heading level capping', () => {
  it('caps heading at ###### for deeply nested sections', () => {
    // depth 4 → level 6 (######)
    const deep = {
      id: 's1', title: 'Deep', depth: 4, items: [], children: [],
    }
    const ir = { meta: emptyIR.meta, sections: [deep], orphans: [] }
    expect(renderMarkdown(ir, {})).toContain('###### Deep')
  })
})

describe('renderMarkdown – votes', () => {
  it('appends italic vote suffix by default', () => {
    const out = renderMarkdown(votesIR(), {})
    expect(out).toContain('*(5 votes)*')
    expect(out).toContain('*(1 vote)*')
  })

  it('uses singular for exactly 1 vote', () => {
    const out = renderMarkdown(votesIR(), {})
    expect(out).toContain('*(1 vote)*')
    expect(out).not.toContain('*(1 votes)*')
  })

  it('omits suffix when includeVotes is false', () => {
    const out = renderMarkdown(votesIR(), { includeVotes: false })
    // Check that no "*(N votes)*" suffix appears.
    // Note: item content "No votes idea" contains the word "votes" – that's expected.
    expect(out).not.toMatch(/\*\(\d+ votes?\)\*/)
    expect(out).toContain('- Top idea')
  })
})

describe('renderMarkdown – tables', () => {
  it('renders a markdown table with header separator', () => {
    const out = renderMarkdown(tableIR(), {})
    expect(out).toContain('| Name | Role | Team |')
    expect(out).toContain('| --- | --- | --- |')
    expect(out).toContain('| Alice | Designer | UX |')
    expect(out).toContain('| Bob | Engineer | Platform |')
  })

  it('does not duplicate the header row as a data row', () => {
    const out = renderMarkdown(tableIR(), {})
    const headerMatches = (out.match(/Name \| Role \| Team/g) ?? []).length
    expect(headerMatches).toBe(1)
  })
})

describe('renderMarkdown – special characters', () => {
  it('escapes pipe characters in table cells', () => {
    resetIds()
    const ir = makeIR({
      sections: [
        makeSection('S', 0, [
          makeItem({
            kind: 'table' as const,
            content: 'a',
            tableData: { rows: [['A|B', 'C']], hasHeader: true },
          }),
        ]),
      ],
    })
    const out = renderMarkdown(ir, {})
    expect(out).toContain('A\\|B')
  })

  it('does not escape special chars in regular bullet items', () => {
    const out = renderMarkdown(specialCharsIR(), {})
    expect(out).toContain('- Pipe | character')
    expect(out).toContain('- Has a "quoted" word')
    expect(out).toContain('- Comma, separated, text')
  })
})

describe('renderMarkdown – snapshot (medium fixture)', () => {
  it('matches snapshot', () => {
    expect(renderMarkdown(mediumIR(), { includeVotes: true })).toMatchSnapshot()
  })
})
