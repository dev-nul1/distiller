import type { ExportItem } from '../../types'

/**
 * Extract an ExportItem from a standalone TEXT node.
 * Returns null for empty text nodes (nothing useful to export).
 */
export function extractText(node: TextNode): ExportItem | null {
  const content = node.characters.trim()
  if (!content) return null

  const bb = node.absoluteBoundingBox
  return {
    id: node.id,
    kind: 'text',
    content,
    position: { x: bb?.x ?? 0, y: bb?.y ?? 0 },
  }
}

