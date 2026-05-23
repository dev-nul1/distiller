import type { ExportIR, ExportItem, ExportSection, RenderOpts } from '../../types'
import { renderRichRuns, renderCodeFence } from './richtext'

function voteSuffix(item: ExportItem, opts: RenderOpts): string {
  if (opts.includeVotes === false || !item.votes) return ''
  return ` (${item.votes} ${item.votes === 1 ? 'vote' : 'votes'})`
}

const KIND_LABEL: Partial<Record<ExportItem['kind'], string>> = {
  sticky: 'Sticky',
  text: 'Text',
  shape: 'Shape',
}

function renderItem(item: ExportItem, indent: string, opts: RenderOpts): string {
  if (item.kind === 'code' && item.codeData) {
    return renderCodeFence(item.codeData, 'plain')
      .split('\n')
      .map((line) => `${indent}${line}`)
      .join('\n')
  }
  const label = KIND_LABEL[item.kind] ?? item.kind
  const authorPart = (opts.includeAuthors && item.author) ? ` \u2014 ${item.author}` : ''
  const labelLine = `${indent}${label}${authorPart}`
  const suffix = voteSuffix(item, opts)
  let body: string
  if (item.richContent) {
    body = renderRichRuns(item.richContent, 'plain')
      .split('\n')
      .map((line) => `${indent}  ${line}`)
      .join('\n')
  } else {
    body = `${indent}  ${item.content}`
  }
  return `${labelLine}\n${body}${suffix}`
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

