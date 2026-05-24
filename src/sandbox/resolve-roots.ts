import type { SelectionMode } from '../types'

/**
 * Map a SelectionMode to the set of root SceneNodes to traverse.
 */
export function resolveRoots(mode: SelectionMode): SceneNode[] {
  switch (mode) {
    case 'page':
      return [...figma.currentPage.children]

    case 'selection':
      return [...figma.currentPage.selection]

    case 'viewport': {
      const vp = figma.viewport.bounds
      return figma.currentPage.children.filter((n) => {
        const bb = n.absoluteBoundingBox
        if (!bb) return false
        return (
          bb.x < vp.x + vp.width &&
          bb.x + bb.width > vp.x &&
          bb.y < vp.y + vp.height &&
          bb.y + bb.height > vp.y
        )
      })
    }
  }
}
