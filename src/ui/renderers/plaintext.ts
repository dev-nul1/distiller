import type { ExportIR, ExportItem, ExportSection, RenderOpts } from '../../types'
import { renderRichRuns, renderCodeFence } from './richtext'

/** Map item kind to a display label for the plain-text label line. */
const KIND_LABEL: Record<ExportItem['kind'], string> = {
  sticky: 'Sticky',
  text: 'Text',
  shape: 'Shape',
  code: 'Code block',
  table: 'Table',
}

/**
 * Build the label line: "Label — Author · N votes" from whichever parts are present.
 * Separators only appear when their associated part is present.
 */
function buildLabelLine(item: ExportItem, indent: string, opts: RenderOpts): string {
  const label = KIND_LABEL[item.kind] ?? item.kind
  let line = `${indent}${label}`
  if (opts.includeAuthors && item.author) line += ` \u2014 ${item.author}`
  if (opts.includeVotes !== false && item.votes) {
    line += ` \u00b7 ${item.votes} ${item.votes === 1 ? 'vote' : 'votes'}`
  }
  return line
}

function renderItem(item: ExportItem, indent: string, opts: RenderOpts): string {
  const label = buildLabelLine(item, indent, opts)
  if (item.kind === 'code' && item.codeData) {
    const code = renderCodeFence(item.codeData, 'plain')
    const indented = code.split('\n').map((l) => `${indent}${l}`).join('\n')
    return `${label}\n${indented}`
  }
  if (item.kind === 'table') {
    const body = item.content.trim()
    if (!body) return label
    const indented = body.split('\n').map((l) => `${indent}${l}`).join('\n')
    return `${label}\n${indented}`
  }
  const raw = item.richContent
    ? renderRichRuns(item.richContent, 'plain')
    : item.content
  const body = raw.trim()
  if (!body) return label
  const indented = body.split('\n').map((l) => `${indent}${l}`).join('\n')
  return `${label}\n${indented}`
}

function renderItemsWithBlanks(items: ExportItem[], indent: string, opts: RenderOpts): string[] {
  const blocks = items.map((item) => renderItem(item, indent, opts))
  const result: string[] = []
  for (let i = 0; i < blocks.length; i++) {
    result.push(blocks[i])
    if (i < blocks.length - 1) result.push('')
  }
  return result
}

function renderSection(section: ExportSection, opts: RenderOpts): string[] {
  const titleIndent = '  '.repeat(section.depth)
  const itemIndent = '  '.repeat(section.depth + 1)
  const lines: string[] = []

  lines.push(`${titleIndent}${section.title}`)
  if (section.items.length > 0) {
    lines.push('')
    lines.push(...renderItemsWithBlanks(section.items, itemIndent, opts))
  }

  for (const child of section.children) {
    lines.push('')
    lines.push(...renderSection(child, opts))
  }

  return lines
}

/** Recursively collect all items from a section tree (depth-first). */
function flattenSection(section: ExportSection): ExportItem[] {
  return [...section.items, ...section.children.flatMap(flattenSection)]
}

export function renderPlaintext(ir: ExportIR, opts: RenderOpts): string {
  if (opts.includeSections === false) {
    const all = [...ir.orphans, ...ir.sections.flatMap(flattenSection)]
    return renderItemsWithBlanks(all, '', opts).join('\n')
  }

  const parts: string[] = []

  if (ir.orphans.length > 0) {
    parts.push(...renderItemsWithBlanks(ir.orphans, '', opts))
  }

  for (const section of ir.sections) {
    if (parts.length > 0) parts.push('')
    parts.push(...renderSection(section, opts))
  }

  return parts.join('\n')
}

