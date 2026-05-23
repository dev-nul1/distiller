import type {
  ExportIR,
  ExportItem,
  ExportSection,
  RenderOpts,
  TableData,
} from '../../types'
import { renderRichRuns, renderCodeFence } from './richtext'

/** depth 0 → ##, depth 1 → ###, …, capped at ###### */
function headingLevel(depth: number): string {
  return '#'.repeat(Math.min(depth + 2, 6))
}

function voteSuffix(item: ExportItem, opts: RenderOpts): string {
  if (opts.includeVotes === false || !item.votes) return ''
  const vStr = `${item.votes} ${item.votes === 1 ? 'vote' : 'votes'}`
  return ' ' + (opts.plainMeta ? `(${vStr})` : `*(${vStr})*`)
}

/** Map item kind to a display label for the block heading. */
const KIND_LABEL: Partial<Record<ExportItem['kind'], string>> = {
  sticky: 'Sticky',
  text: 'Text',
  shape: 'Shape',
}

/**
 * Build the block-level heading for an item.
 * sectionDepth is the depth of the containing section (use 0 for orphans).
 * Tables and code blocks don't get a heading.
 */
function itemHeading(item: ExportItem, sectionDepth: number, opts: RenderOpts): string {
  const label = KIND_LABEL[item.kind]
  if (!label) return ''
  const hashes = '#'.repeat(Math.min(sectionDepth + 3, 6))
  const authorPart = (opts.includeAuthors && item.author) ? ` (${item.author})` : ''
  return `${hashes} ${label}${authorPart}`
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

function renderItem(item: ExportItem, opts: RenderOpts, sectionDepth: number): string {
  if (item.kind === 'table' && item.tableData) {
    return renderMarkdownTable(item.tableData)
  }
  if (item.kind === 'code' && item.codeData) {
    return renderCodeFence(item.codeData, 'markup')
  }
  const heading = itemHeading(item, sectionDepth, opts)
  const suffix = voteSuffix(item, opts)
  let body: string
  if (item.richContent) {
    body = renderRichRuns(item.richContent, 'markup')
  } else {
    body = item.content
  }
  return `${heading}\n${body}${suffix}`
}

function renderSection(section: ExportSection, opts: RenderOpts): string[] {
  const lines: string[] = []

  lines.push(`${headingLevel(section.depth)} ${section.title}`)
  lines.push('')

  const itemBlocks = section.items.map((item) => renderItem(item, opts, section.depth))
  for (let i = 0; i < itemBlocks.length; i++) {
    lines.push(itemBlocks[i])
    if (i < itemBlocks.length - 1) lines.push('')
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
    return all.map((item) => renderItem(item, opts, 0)).join('\n\n').trimEnd()
  }

  const parts: string[] = []

  for (const orphan of ir.orphans) {
    parts.push(renderItem(orphan, opts, 0))
  }

  for (const section of ir.sections) {
    if (parts.length > 0) parts.push('')
    parts.push(...renderSection(section, opts))
  }

  return parts.join('\n').trimEnd()
}

