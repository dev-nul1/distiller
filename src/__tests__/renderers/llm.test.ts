import { describe, it, expect, beforeEach } from 'vitest'
import { renderLlm } from '../../ui/renderers/llm'
import {
  emptyIR,
  singleOrphanIR,
  flatSectionsIR,
  nestedSectionsIR,
  votesIR,
  mediumIR,
  codeIR,
  codeNoLangIR,
  richInlineItem,
  makeIR,
  resetIds,
} from './fixtures'

beforeEach(() => resetIds())

describe('renderLlm – preamble', () => {
  it('starts with # FigJam Export: {pageName}', () => {
    const out = renderLlm(emptyIR, {})
    expect(out).toMatch(/^# FigJam Export: Page 1\n/)
  })

  it('includes Board, Exported, Scope, Content, Export settings fields', () => {
    const out = renderLlm(emptyIR, {})
    expect(out).toContain('Board: Workshop.fig')
    expect(out).toContain('Scope: Whole page')
    expect(out).toContain('Content: no items')
    expect(out).toContain('Export settings:')
  })

  it('includes Board: fileName and page name in the title', () => {
    const out = renderLlm(emptyIR, {})
    expect(out).toContain('Board: Workshop.fig')
    expect(out).toContain('# FigJam Export: Page 1')
  })

  it('includes Exported: ISO timestamp from meta', () => {
    const out = renderLlm(emptyIR, {})
    expect(out).toContain('Exported: 2026-05-21T12:00:00.000Z')
  })

  it('includes the --- separator', () => {
    const out = renderLlm(emptyIR, {})
    expect(out).toContain('\n---\n')
  })
})

describe('renderLlm – markdown body', () => {
  it('renders sections as ## headings after the preamble', () => {
    const out = renderLlm(flatSectionsIR(), {})
    expect(out).toContain('## Alpha')
    expect(out).toContain('## Beta')
  })

  it('renders block items with headings', () => {
    const out = renderLlm(singleOrphanIR, {})
    expect(out).toContain('### Sticky')
    expect(out).toContain('Hello world')
  })

  it('puts vote count in the block heading (no inline vote markers)', () => {
    const out = renderLlm(votesIR(), {})
    // Votes appear in the block heading as "· N votes"
    expect(out).toContain('\u00b7 5 votes')
    expect(out).not.toContain('*(5 votes)*')
  })

  it('respects includeVotes: false', () => {
    const out = renderLlm(votesIR(), { includeVotes: false })
    expect(out).not.toContain('votes)')
    expect(out).toContain('Top idea')
  })

  it('nested sections render as ### after the preamble', () => {
    const out = renderLlm(nestedSectionsIR(), {})
    expect(out).toContain('## Outer')
    expect(out).toContain('### Inner')
  })
})

describe('renderLlm – snapshot (medium fixture)', () => {
  it('matches snapshot', () => {
    expect(renderLlm(mediumIR(), { includeVotes: true })).toMatchSnapshot()
  })
})

describe('renderLlm – code blocks', () => {
  it('renders code block as fenced code with language in body', () => {
    const out = renderLlm(codeIR(), {})
    expect(out).toContain('```typescript')
    expect(out).toContain('function greet')
  })

  it('includes "1 code block" in Content preamble', () => {
    const out = renderLlm(codeIR(), {})
    expect(out).toContain('1 code block')
  })

  it('includes "2 code blocks" (plural) in Content preamble', () => {
    const twoCodeIR = makeIR({
      meta: { fileName: 'Test.fig', pageName: 'P', extractedAt: '2026-01-01T00:00:00.000Z', mode: 'page',
        counts: { stickies: 0, text: 0, shapes: 0, tables: 0, codes: 2, sections: 0 } },
      orphans: [],
    })
    const out = renderLlm(twoCodeIR, {})
    expect(out).toContain('2 code blocks')
  })

  it('renders PLAINTEXT code block without language tag in body', () => {
    const out = renderLlm(codeNoLangIR(), {})
    expect(out).toMatch(/```\nhello world\n```/)
  })
})

describe('renderLlm – rich text', () => {
  it('renders bold with ** markup in body', () => {
    const ir = makeIR({ orphans: [richInlineItem()] })
    const out = renderLlm(ir, {})
    expect(out).toContain('**check the docs**')
  })
})
