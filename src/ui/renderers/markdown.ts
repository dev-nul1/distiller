import type {
  ExportIR,
  ExportItem,
  ExportSection,
  RenderOpts,
  TableData,
} from '../../types'
import { renderRichRuns, hasListRuns, renderCodeFence } from './richtext'

/** depth 0 → ##, depth 1 → ###, …, capped at ###### */
function headingLevel(depth: number): string {
  return '#'.repeat(Math.min(depth + 2, 6))
}

function voteSuffix(item: ExportItem, opts: RenderOpts): string {
  const parts: string[] = []
  if (opts.includeVotes !== false && item.votes) {
    const vStr = `${item.votes} ${item.votes === 1 ? 'vote' : 'votes'}`
    parts.push(opts.plainMeta ? `(${vStr})` : `*(${vStr})*`)
  }
  if (opts.includeAuthors && item.author) {
    parts.push(opts.plainMeta ? `\u2013 ${item.author}` : `\u2013 *${item.author}*`)
  }
  return parts.length ? ' ' + parts.join(' ') : ''
}

/** Escape pipe characters inside a table cell. */
function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function renderMarkdownTable(tableData: TableData): string {
  const { rows, hasHeader } = tableData
  if (rows.length === 0) return ''

  const colCount = Math.max(...rows.map((r) => r.length), 1)
  const lines: string[] = []

  const headerRow = rows[0]
  lines.push(
    '| ' +
      Array.from({ length: colCount }, (_, i) =>
        escapeCell(headerRow[i] ?? '')
      ).join(' | ') +
      ' |'
  )
  lines.push('| ' + Array.from({ length: colCount }, () => '---').join(' | ') + ' |')

  const dataStart = hasHeader ? 1 : 0
  for (let r = dataStart; r < rows.length; r++) {
    lines.push(
      '| ' +
        Array.from({ length: colCount }, (_, i) =>
          escapeCell(rows[r][i] ?? '')
        ).join(' | ') +
        ' |'
    )
  }

  return lines.join('\n')
}

function renderItem(item: ExportItem, opts: RenderOpts): string {
  if (item.kind === 'table' && item.tableData) {
    return renderMarkdownTable(item.tableData)
  }
  if (item.kind === 'code' && item.codeData) {
    return renderCodeFence(item.codeData, 'markup')
  }
  const suffix = voteSuffix(item, opts)
  if (item.richContent) {
    const body = renderRichRuns(item.richContent, 'markup')
    // When the body already contains list structure, skip the outer '- ' bullet.
    if (hasListRuns(item.richContent)) return body + suffix
    return `- ${body}${suffix}`
  }
  return `- ${item.content}${suffix}`
}

function renderSection(section: ExportSection, opts: RenderOpts): string[] {
  const lines: string[] = []

  lines.push(`${headingLevel(section.depth)} ${section.title}`)
  lines.push('')

  for (const item of section.items) {
    lines.push(renderItem(item, opts))
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

export function renderMarkdown(ir: ExportIR, opts: RenderOpts): string {
  if (opts.includeSections === false) {
    const all = [...ir.orphans, ...ir.sections.flatMap(flattenSection)]
    return all.map((item) => renderItem(item, opts)).join('\n').trimEnd()
  }

  const parts: string[] = []

  for (const orphan of ir.orphans) {
    parts.push(renderItem(orphan, opts))
  }

  for (const section of ir.sections) {
    if (parts.length > 0) parts.push('')
    parts.push(...renderSection(section, opts))
  }

  return parts.join('\n').trimEnd()
}

