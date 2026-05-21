import type { ExportItem, TableData } from '../../types'

/**
 * Extract an ExportItem from a TABLE node.
 *
 * Merged cells are not exposed by the Plugin API; they appear as empty
 * strings, which we preserve as-is.
 *
 * Header detection: heuristic – the first row is treated as a header
 * whenever the table has at least one row.
 */
export function extractTable(node: TableNode): ExportItem {
  const rows: string[][] = []

  for (let r = 0; r < node.numRows; r++) {
    const row: string[] = []
    for (let c = 0; c < node.numColumns; c++) {
      row.push(node.cellAt(r, c).text.characters)
    }
    rows.push(row)
  }

  const tableData: TableData = {
    rows,
    hasHeader: rows.length > 0,
  }

  // Flat text representation for renderers that don't handle tableData specially
  const content = rows.map((r) => r.join(' | ')).join('\n')
  const bb = node.absoluteBoundingBox

  return {
    id: node.id,
    kind: 'table',
    content,
    position: { x: bb?.x ?? 0, y: bb?.y ?? 0 },
    tableData,
  }
}

