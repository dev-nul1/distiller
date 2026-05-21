import type { ExportItem } from '../../types'
import { countVotes } from './votes'

/**
 * Extract an ExportItem from a SHAPE_WITH_TEXT node.
 * Returns null for unlabeled shapes (no text content).
 */
export function extractShape(node: ShapeWithTextNode): ExportItem | null {
  const content = node.text.characters.trim()
  if (!content) return null

  const votes = countVotes(node.stuckNodes)
  const bb = node.absoluteBoundingBox

  return {
    id: node.id,
    kind: 'shape',
    content,
    ...(votes > 0 ? { votes } : {}),
    position: { x: bb?.x ?? 0, y: bb?.y ?? 0 },
  }
}

