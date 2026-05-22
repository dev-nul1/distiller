import { describe, it, expect, beforeEach } from 'vitest'
import { renderLlm } from '../../ui/renderers/llm'
import {
  emptyIR,
  singleOrphanIR,
  flatSectionsIR,
  nestedSectionsIR,
  votesIR,
  mediumIR,
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

  it('renders bullet items', () => {
    const out = renderLlm(singleOrphanIR, {})
    expect(out).toContain('- Hello world')
  })

  it('passes votes through to markdown renderer as plain text (plainMeta mode)', () => {
    const out = renderLlm(votesIR(), {})
    // LLM renderer uses plainMeta:true — votes appear as plain "(n votes)", not "*(n votes)*"
    expect(out).toContain('(5 votes)')
    expect(out).not.toContain('*(5 votes)*')
  })

  it('respects includeVotes: false', () => {
    const out = renderLlm(votesIR(), { includeVotes: false })
    expect(out).not.toContain('votes)')
    expect(out).toContain('- Top idea')
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
