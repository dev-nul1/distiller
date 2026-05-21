import type { ExportIR, ExportItem, ExportSection, RenderOpts } from '../../types'

const HEADER = 'section_path,kind,content,votes,position_x,position_y,cell_ref'

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
  kindOverride?: string,
  contentOverride?: string,
  cellRef?: string
): string {
  return [
    csvField(sectionPath),
    csvField(kindOverride ?? item.kind),
    csvField(contentOverride ?? item.content),
    item.votes ? String(item.votes) : '',
    String(item.position.x),
    String(item.position.y),
    csvField(cellRef ?? ''),
  ].join(',')
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
            'table_cell',
            rows[r][c],
            `R${r + 1}C${c + 1}`
          )
        )
      }
    }
  } else {
    out.push(itemRow(sectionPath, item))
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

export function renderCsv(ir: ExportIR, opts: RenderOpts): string {
  const rows: string[] = [HEADER]

  for (const orphan of ir.orphans) {
    collectItemRows(orphan, '', opts, rows)
  }

  for (const section of ir.sections) {
    collectSectionRows(section, '', opts, rows)
  }

  return rows.join('\n')
}

