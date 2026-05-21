import type {
  ExportIR,
  ExportItem,
  ExportSection,
  RenderOpts,
  TableData,
} from '../../types'

/** depth 0 → ##, depth 1 → ###, …, capped at ###### */
function headingLevel(depth: number): string {
  return '#'.repeat(Math.min(depth + 2, 6))
}

function voteSuffix(item: ExportItem, opts: RenderOpts): string {
  if (opts.includeVotes === false || !item.votes) return ''
  return ` *(${item.votes} ${item.votes === 1 ? 'vote' : 'votes'})*`
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
  return `- ${item.content}${voteSuffix(item, opts)}`
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

export function renderMarkdown(ir: ExportIR, opts: RenderOpts): string {
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

