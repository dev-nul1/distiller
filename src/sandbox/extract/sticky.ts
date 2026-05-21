import type { ExportItem } from '../../types'
import { countVotes } from './votes'

/** Extract an ExportItem from a FigJam sticky note. */
export function extractSticky(node: StickyNode): ExportItem {
  const content = node.text.characters.trim()
  const votes = countVotes(node.stuckNodes)
  const bb = node.absoluteBoundingBox

  return {
    id: node.id,
    kind: 'sticky',
    content,
    ...(votes > 0 ? { votes } : {}),
    position: { x: bb?.x ?? 0, y: bb?.y ?? 0 },
  }
}

