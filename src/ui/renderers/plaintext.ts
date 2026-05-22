import type { ExportIR, ExportItem, ExportSection, RenderOpts } from '../../types'

function voteSuffix(item: ExportItem, opts: RenderOpts): string {
  const parts: string[] = []
  if (opts.includeVotes !== false && item.votes) {
    parts.push(`(${item.votes} ${item.votes === 1 ? 'vote' : 'votes'})`)
  }
  if (opts.includeAuthors && item.author) {
    parts.push(`[${item.author}]`)
  }
  return parts.length ? ' ' + parts.join(' ') : ''
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

/** Recursively collect all items from a section tree (depth-first). */
function flattenSection(section: ExportSection): ExportItem[] {
  return [...section.items, ...section.children.flatMap(flattenSection)]
}

export function renderPlaintext(ir: ExportIR, opts: RenderOpts): string {
  if (opts.includeSections === false) {
    const all = [...ir.orphans, ...ir.sections.flatMap(flattenSection)]
    return all.map((item) => `- ${item.content}${voteSuffix(item, opts)}`).join('\n')
  }

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

