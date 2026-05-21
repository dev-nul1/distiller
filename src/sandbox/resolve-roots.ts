import type { SelectionMode } from '../types'

/**
 * Map a SelectionMode to the set of root SceneNodes to traverse.
 * Throws a user-facing Error when the mode requires a selection that
 * the user hasn't made (e.g. 'section' with nothing selected).
 */
export function resolveRoots(mode: SelectionMode): SceneNode[] {
  switch (mode) {
    case 'page':
      return [...figma.currentPage.children]

    case 'section': {
      const sections = figma.currentPage.selection.filter(
        (n): n is SectionNode => n.type === 'SECTION'
      )
      if (sections.length === 0) {
        throw new Error(
          'No sections selected. Select one or more sections and try again.'
        )
      }
      return sections
    }

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

