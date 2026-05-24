import type { ExportIR, ExportItem, ExportSection, RenderOpts } from '../../types'
import { renderMarkdown } from './markdown'

function sumVotes(items: ExportItem[]): number {
  return items.reduce((n, i) => n + (i.votes ?? 0), 0)
}

function countVotesInIR(ir: ExportIR): number {
  function walk(sections: ExportSection[]): number {
    return sections.reduce((n, s) => n + sumVotes(s.items) + walk(s.children), 0)
  }
  return sumVotes(ir.orphans) + walk(ir.sections)
}

export function renderLlm(ir: ExportIR, opts: RenderOpts): string {
  const { fileName, pageName, extractedAt, mode, counts } = ir.meta

  const scopeLabel: Record<string, string> = {
    page: 'Whole page',
    selection: 'Current selection',
    viewport: 'Current viewport',
    section: 'Selected sections',
  }

  const countParts: string[] = []
  // Mirror badge order: sections → stickies → text → shapes → tables → votes
  if (counts.sections) countParts.push(`${counts.sections} ${counts.sections === 1 ? 'section' : 'sections'}`)
  if (counts.stickies) countParts.push(`${counts.stickies} ${counts.stickies === 1 ? 'sticky note' : 'sticky notes'}`)
  if (counts.text)     countParts.push(`${counts.text} ${counts.text === 1 ? 'text item' : 'text items'}`)
  if (counts.shapes)   countParts.push(`${counts.shapes} ${counts.shapes === 1 ? 'shape' : 'shapes'}`)
  if (counts.tables)   countParts.push(`${counts.tables} ${counts.tables === 1 ? 'table' : 'tables'}`)
  if (counts.codes)    countParts.push(`${counts.codes} ${counts.codes === 1 ? 'code block' : 'code blocks'}`)
  if (opts.includeVotes !== false) {
    const votes = countVotesInIR(ir)
    if (votes) countParts.push(`${votes} ${votes === 1 ? 'vote' : 'votes'}`)
  }

  const preamble = [
    `# Distiller FigJam Export: ${pageName}`,
    '',
    `Board: ${fileName}`,
    `Exported: ${extractedAt}`,
    `Scope: ${scopeLabel[mode] ?? mode}`,
    `Content: ${countParts.join(', ') || 'no items'}`,
    '',
    'Export settings:',
    `- Votes: ${opts.includeVotes !== false ? 'included' : 'excluded'}`,
    `- Section hierarchy: ${opts.includeSections !== false ? 'included' : 'flat list'}`,
    `- Author attribution: ${opts.includeAuthors ? 'included' : 'excluded'}`,
    '',
    '---',
    '',
  ].join('\n')

  return preamble + renderMarkdown(ir, { ...opts, plainMeta: true })
}

