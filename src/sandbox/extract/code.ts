import type { ExportItem } from '../../types'

/**
 * Extract an ExportItem from a FigJam CODE_BLOCK node.
 * The `content` field holds the raw code text (for formats that ignore codeData).
 * The `codeData` field holds code + lowercased language for rich rendering.
 */
export function extractCode(node: CodeBlockNode): ExportItem {
  const bb = node.absoluteBoundingBox
  // codeLanguage is an enum like 'TYPESCRIPT', 'PYTHON', etc. — lowercase it.
  const language =
    typeof node.codeLanguage === 'string' && node.codeLanguage !== 'PLAINTEXT'
      ? node.codeLanguage.toLowerCase()
      : undefined

  return {
    id: node.id,
    kind: 'code',
    content: node.code,
    codeData: { code: node.code, ...(language ? { language } : {}) },
    position: { x: bb?.x ?? 0, y: bb?.y ?? 0 },
  }
}
