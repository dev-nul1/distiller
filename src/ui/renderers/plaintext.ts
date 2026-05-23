import type { ExportIR, ExportItem, ExportSection, RenderOpts } from '../../types'
import { renderRichRuns, hasListRuns, renderCodeFence } from './richtext'

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
  return items.map((item) => {
    const suffix = voteSuffix(item, opts)
    if (item.kind === 'code' && item.codeData) {
      // Code items: raw code text, indented, no bullet prefix
      return renderCodeFence(item.codeData, 'plain')
        .split('\n')
        .map((line) => `${indent}${line}`)
        .join('\n')
    }
    if (item.richContent) {
      const body = renderRichRuns(item.richContent, 'plain')
      if (hasListRuns(item.richContent)) {
        // List structure: indent each line, no outer bullet
        return body
          .split('\n')
          .map((line) => `${indent}${line}`)
          .join('\n') + suffix
      }
      return `${indent}- ${body}${suffix}`
    }
    return `${indent}- ${item.content}${suffix}`
  })
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
    return renderItems(all, '', opts).join('\n')
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

