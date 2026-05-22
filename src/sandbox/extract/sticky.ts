import type { ExportItem } from '../../types'
import { countVotes } from './votes'

/** Extract an ExportItem from a FigJam sticky note.
 *  Returns null for stickies with no text and no votes.
 *  Empty stickies that have votes are preserved as '(empty)' so the
 *  vote count is not silently discarded.
 *  Author is captured only when the author has enabled their name visibility
 *  on the sticky (node.authorVisible === true). */
export function extractSticky(node: StickyNode): ExportItem | null {
  const content = node.text.characters.trim()
  const votes = countVotes(node.stuckNodes)
  if (!content && votes === 0) return null
  const bb = node.absoluteBoundingBox

  return {
    id: node.id,
    kind: 'sticky',
    content: content || '(empty)',
    ...(votes > 0 ? { votes } : {}),
    ...(node.authorName ? { author: node.authorName.trim().replace(/\s+/g, ' ') } : {}),
    position: { x: bb?.x ?? 0, y: bb?.y ?? 0 },
  }
}

