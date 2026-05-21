import type { ExportIR, ExportSection, ExportItem, SelectionMode } from '../types'
import { extractSticky } from './extract/sticky'
import { extractText } from './extract/text'
import { extractShape } from './extract/shape'
import { extractTable } from './extract/table'
import { spatialSort } from './ordering'

type Counts = ExportIR['meta']['counts']

/**
 * Try to produce an ExportItem from a single SceneNode.
 * Returns null for unsupported or skippable node types.
 */
function extractItem(node: SceneNode): ExportItem | null {
  switch (node.type) {
    case 'STICKY':
      return extractSticky(node as StickyNode)
    case 'TEXT':
      return extractText(node as TextNode)
    case 'SHAPE_WITH_TEXT':
      return extractShape(node as ShapeWithTextNode)
    case 'TABLE':
      return extractTable(node as TableNode)
    default:
      // FRAME, GROUP, CONNECTOR, WIDGET, etc. – skip
      return null
  }
}

function bumpCounts(counts: Counts, item: ExportItem): void {
  switch (item.kind) {
    case 'sticky':
      counts.stickies++
      break
    case 'text':
      counts.text++
      break
    case 'shape':
      counts.shapes++
      break
    case 'table':
      counts.tables++
      break
  }
}

/**
 * Recursively walk a SECTION node, collecting items and nested sections.
 * Uses manual recursion on node.children so unsupported branches are
 * pruned early (avoids the cost of findAll on large pages).
 */
function traverseSection(
  node: SectionNode,
  depth: number,
  counts: Counts
): ExportSection {
  counts.sections++

  const items: ExportItem[] = []
  const children: ExportSection[] = []

  for (const child of node.children) {
    if (child.type === 'SECTION') {
      children.push(traverseSection(child as SectionNode, depth + 1, counts))
    } else {
      const item = extractItem(child)
      if (item) {
        bumpCounts(counts, item)
        items.push(item)
      }
    }
  }

  return {
    id: node.id,
    title: node.name,
    depth,
    items: spatialSort(items),
    children,
  }
}

/**
 * Walk the given root nodes and produce a complete ExportIR.
 *
 * Note: traversal is synchronous. setTimeout is not available in the
 * Figma sandbox context. For typical FigJam boards this completes in
 * well under 1 second.
 */
export function buildIR(roots: SceneNode[], mode: SelectionMode): ExportIR {
  const counts: Counts = {
    stickies: 0,
    text: 0,
    shapes: 0,
    tables: 0,
    sections: 0,
  }

  const sections: ExportSection[] = []
  const orphans: ExportItem[] = []

  for (const node of roots) {
    if (node.type === 'SECTION') {
      sections.push(traverseSection(node as SectionNode, 0, counts))
    } else {
      const item = extractItem(node)
      if (item) {
        bumpCounts(counts, item)
        orphans.push(item)
      }
    }
  }

  return {
    meta: {
      fileName: figma.root.name,
      pageName: figma.currentPage.name,
      extractedAt: new Date().toISOString(),
      mode,
      counts,
    },
    sections,
    orphans: spatialSort(orphans),
  }
}

