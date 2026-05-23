import type { RichRun } from '../../types'

/**
 * Extract rich-text runs from a FigJam text sublayer or TextNode.
 *
 * Uses getStyledTextSegments for O(segments) performance — never per-character
 * range probing, which would be pathologically slow on large text blocks.
 *
 * Returns null when:
 * - The text is empty, or
 * - All segments are plain (no bold, italic, strikethrough, underline, link,
 *   or list formatting found), in which case `content` is the canonical value.
 *
 * Bold detection: fontWeight >= 700 (numeric). Medium/Semibold (500–600) are
 * not tagged bold. Italic detection: fontName.style contains "italic"
 * (case-insensitive). Underline is captured but not emitted in any renderer.
 * NODE-type hyperlinks (intra-document) are excluded; only URL links are kept.
 */
export function extractRichText(
  textNode: NonResizableTextMixin
): RichRun[] | null {
  if (!textNode.characters) return null

  let segments: StyledTextSegment[]
  try {
    segments = textNode.getStyledTextSegments(
      ['fontWeight', 'fontName', 'textDecoration', 'hyperlink', 'listOptions']
    ) as StyledTextSegment[]
  } catch {
    // API failure is not expected but degrade gracefully rather than crash
    return null
  }

  if (segments.length === 0) return null

  const runs: RichRun[] = []
  let hasFormatting = false

  for (const seg of segments) {
    const bold = typeof seg.fontWeight === 'number' && seg.fontWeight >= 700
    const italic =
      typeof seg.fontName === 'object' &&
      seg.fontName !== null &&
      typeof (seg.fontName as FontName).style === 'string' &&
      (seg.fontName as FontName).style.toLowerCase().includes('italic')
    const strikethrough = seg.textDecoration === 'STRIKETHROUGH'
    const underline = seg.textDecoration === 'UNDERLINE'
    const href =
      seg.hyperlink != null && seg.hyperlink.type === 'URL'
        ? seg.hyperlink.value
        : undefined
    const listType =
      seg.listOptions?.type != null && seg.listOptions.type !== 'NONE'
        ? (seg.listOptions.type as 'ORDERED' | 'UNORDERED')
        : undefined

    if (bold || italic || strikethrough || underline || href || listType) {
      hasFormatting = true
    }

    const run: RichRun = { text: seg.characters }
    if (bold) run.bold = true
    if (italic) run.italic = true
    if (strikethrough) run.strikethrough = true
    if (underline) run.underline = true
    if (href) run.href = href
    if (listType) run.listType = listType

    runs.push(run)
  }

  // When no run carries any formatting, the flat `content` string is equivalent
  // and `richContent` would add overhead without value.
  if (!hasFormatting) return null

  return runs
}
