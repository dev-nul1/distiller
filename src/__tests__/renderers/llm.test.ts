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
  it('starts with # FigJam Workshop Export', () => {
    const out = renderLlm(emptyIR, {})
    expect(out).toMatch(/^# FigJam Workshop Export\n/)
  })

  it('includes the context explanation bullet points', () => {
    const out = renderLlm(emptyIR, {})
    expect(out).toContain('- Headings are sections the facilitator created')
    expect(out).toContain('- Bullet items are sticky notes, text, or labeled shapes')
    expect(out).toContain('- Vote counts (when present) indicate participant prioritization')
  })

  it('includes Source: fileName / pageName from meta', () => {
    const out = renderLlm(emptyIR, {})
    expect(out).toContain('Source: Workshop.fig / Page 1')
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

  it('passes votes through to markdown renderer', () => {
    const out = renderLlm(votesIR(), {})
    expect(out).toContain('*(5 votes)*')
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
