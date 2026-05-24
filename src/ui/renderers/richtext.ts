import type { RichRun, CodeData } from '../../types'

export type RichRenderMode = 'markup' | 'plain'

/**
 * Render a single run's text in the given mode.
 *
 * markup: applies Markdown bold/italic/strikethrough/link syntax.
 * plain:  strips all decoration; URLs are appended as plain text to avoid
 *         data loss (no-data-loss principle).
 *
 * Underline has no output representation in any mode — text is preserved
 * without the underline marker.
 */
function renderInlinePart(text: string, run: RichRun, mode: RichRenderMode): string {
  if (!text) return ''

  if (mode === 'plain') {
    // Preserve URL alongside anchor text to avoid losing the link target.
    // Skip when the href IS the display text (avoids "https://x.com (https://x.com)").
    if (run.href && run.href !== text) {
      return `${text} (${run.href})`
    }
    return text
  }

  // ── Markup mode ────────────────────────────────────────────────────────
  let s = text
  // Link wraps outermost (Markdown link syntax contains all inline text)
  if (run.href) s = `[${s}](${run.href})`
  // Strikethrough
  if (run.strikethrough) s = `~~${s}~~`
  // Bold + italic combined, or individually
  if (run.bold && run.italic) s = `***${s}***`
  else if (run.bold) s = `**${s}**`
  else if (run.italic) s = `*${s}*`
  // Underline: no markup — text preserved as-is
  return s
}

/**
 * Render an array of rich-text runs into a formatted string.
 *
 * Paragraph breaks are encoded as '\n' characters within run.text.
 * List paragraphs receive '- ' (unordered) or 'N. ' (ordered) prefixes.
 * Ordered list counters reset when a non-ordered paragraph is encountered.
 *
 * @param runs  Rich-text run array from ExportItem.richContent
 * @param mode  'markup' → Markdown syntax; 'plain' → plain text with inline URLs
 */
export function renderRichRuns(runs: RichRun[], mode: RichRenderMode): string {
  // ── Phase 1: split runs into paragraphs ──────────────────────────────────
  // A paragraph is a list of (text, run) pairs plus the list-type for that para.
  type Part = { text: string; run: RichRun }
  type Para = { parts: Part[]; listType?: 'ORDERED' | 'UNORDERED' }

  const paragraphs: Para[] = []
  let current: Para = { parts: [] }

  for (const run of runs) {
    const pieces = run.text.split('\n')
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i]
      if (piece.length > 0) {
        current.parts.push({ text: piece, run })
        // Paragraph-level list type: set by the first list-typed part we find
        // (within a paragraph all segments share the same listOptions value).
        if (run.listType && !current.listType) {
          current.listType = run.listType
        }
      }
      if (i < pieces.length - 1) {
        // Newline found → close the current paragraph
        paragraphs.push(current)
        current = { parts: [] }
      }
    }
  }
  // Flush trailing paragraph if non-empty
  if (current.parts.length > 0) paragraphs.push(current)

  // ── Phase 2: render each paragraph ──────────────────────────────────────
  const lines: string[] = []
  let orderedCounter = 0

  for (const para of paragraphs) {
    const inline = para.parts
      .map(({ text, run }) => renderInlinePart(text, run, mode))
      .join('')

    if (para.listType === 'ORDERED') {
      orderedCounter++
      lines.push(`${orderedCounter}. ${inline}`)
    } else if (para.listType === 'UNORDERED') {
      orderedCounter = 0
      lines.push(`- ${inline}`)
    } else {
      orderedCounter = 0
      lines.push(inline)
    }
  }

  return lines.join('\n')
}

/**
 * Render a fenced Markdown code block.
 * Plain text mode outputs the code as-is (no fencing syntax).
 */
export function renderCodeFence(codeData: CodeData, mode: RichRenderMode): string {
  // Trim leading/trailing blank lines from the code content.
  const code = codeData.code.replace(/^\n+/, '').replace(/\n+$/, '')
  if (mode === 'plain') {
    return code
  }
  const lang = codeData.language ?? ''
  return `\`\`\`${lang}\n${code}\n\`\`\``
}
