import type { ExportIR, ExportItem, ExportSection, RenderOpts } from '../../types'

function voteSuffix(item: ExportItem, opts: RenderOpts): string {
  if (opts.includeVotes === false || !item.votes) return ''
  return ` (${item.votes} ${item.votes === 1 ? 'vote' : 'votes'})`
}

function renderItems(
  items: ExportItem[],
  indent: string,
  opts: RenderOpts
): string[] {
  return items.map((item) => `${indent}- ${item.content}${voteSuffix(item, opts)}`)
}

function renderSection(section: ExportSection, opts: RenderOpts): string[] {
  const titleIndent = '  '.repeat(section.depth)
  const itemIndent = '  '.repeat(section.depth + 1)
  const lines: string[] = []

  lines.push(`${titleIndent}${section.title}`)
  lines.push(...renderItems(section.items, itemIndent, opts))

  for (const child of section.children) {
    lines.push('')
    lines.push(...renderSection(child, opts))
  }

  return lines
}

export function renderPlaintext(ir: ExportIR, opts: RenderOpts): string {
  const parts: string[] = []

  if (ir.orphans.length > 0) {
    parts.push(...renderItems(ir.orphans, '', opts))
  }

  for (const section of ir.sections) {
    if (parts.length > 0) parts.push('')
    parts.push(...renderSection(section, opts))
  }

  return parts.join('\n')
}

