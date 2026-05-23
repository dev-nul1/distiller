import type { ExportItem } from '../../types'
import { countVotes } from './votes'
import { extractRichText } from './richtext'

/**
 * Extract an ExportItem from a SHAPE_WITH_TEXT node.
 * Returns null for unlabeled shapes (no text content).
 */
export function extractShape(node: ShapeWithTextNode): ExportItem | null {
  const content = node.text.characters.trim()
  if (!content) return null

  const votes = countVotes(node.stuckNodes)
  const bb = node.absoluteBoundingBox
  const richContent = extractRichText(node.text)

  return {
    id: node.id,
    kind: 'shape',
    content,
    ...(richContent ? { richContent } : {}),
    ...(votes > 0 ? { votes } : {}),
    position: { x: bb?.x ?? 0, y: bb?.y ?? 0 },
  }
}

