import type { ExportIR, ExportItem, ExportSection, RenderOpts } from '../../types'
import { renderRichRuns } from './richtext'

function csvHeader(opts: RenderOpts): string {
  const cols = ['section_path', 'kind', 'content', 'votes']
  if (opts.includeAuthors) cols.push('author')
  cols.push('position_x', 'position_y', 'cell_ref')
  return cols.join(',')
}

/** Wrap a field in double-quotes and escape inner quotes if required. */
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

function itemRow(
  sectionPath: string,
  item: ExportItem,
  opts: RenderOpts,
  kindOverride?: string,
  contentOverride?: string,
  cellRef?: string
): string {
  // For rich-content items, flatten to plain text (URLs preserved inline).
  // For code items, use the raw code. Otherwise fall back to content.
  let cellContent: string
  if (contentOverride !== undefined) {
    cellContent = contentOverride
  } else if (item.kind === 'code' && item.codeData) {
    cellContent = item.codeData.code
  } else if (item.richContent) {
    cellContent = renderRichRuns(item.richContent, 'plain')
  } else {
    cellContent = item.content
  }
  const cols = [
    csvField(sectionPath),
    csvField(kindOverride ?? item.kind),
    csvField(cellContent),
    item.votes ? String(item.votes) : '',
  ]
  if (opts.includeAuthors) cols.push(csvField(item.author ?? ''))
  cols.push(
    String(item.position.x),
    String(item.position.y),
    csvField(cellRef ?? ''),
  )
  return cols.join(',')
}

function collectItemRows(
  item: ExportItem,
  sectionPath: string,
  opts: RenderOpts,
  out: string[]
): void {
  if (
    item.kind === 'table' &&
    item.tableData &&
    opts.csvExpandTables !== false
  ) {
    // Expand each cell into its own row
    const { rows } = item.tableData
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        out.push(
          itemRow(
            sectionPath,
            item,
            opts,
            'table_cell',
            rows[r][c],
            `R${r + 1}C${c + 1}`
          )
        )
      }
    }
  } else {
    out.push(itemRow(sectionPath, item, opts))
  }
}

function collectSectionRows(
  section: ExportSection,
  parentPath: string,
  opts: RenderOpts,
  out: string[]
): void {
  const path = parentPath ? `${parentPath} > ${section.title}` : section.title

  for (const item of section.items) {
    collectItemRows(item, path, opts, out)
  }

  for (const child of section.children) {
    collectSectionRows(child, path, opts, out)
  }
}

/** Recursively collect all items from a section tree (depth-first). */
function flattenSection(section: ExportSection): ExportItem[] {
  return [...section.items, ...section.children.flatMap(flattenSection)]
}

export function renderCsv(ir: ExportIR, opts: RenderOpts): string {
  const rows: string[] = [csvHeader(opts)]

  if (opts.includeSections === false) {
    const all = [...ir.orphans, ...ir.sections.flatMap(flattenSection)]
    for (const item of all) collectItemRows(item, '', opts, rows)
    return rows.join('\n')
  }

  for (const orphan of ir.orphans) {
    collectItemRows(orphan, '', opts, rows)
  }

  for (const section of ir.sections) {
    collectSectionRows(section, '', opts, rows)
  }

  return rows.join('\n')
}

