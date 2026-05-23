/**
 * Centralized microcopy: toggle helper strings and per-format descriptions.
 * Edit here to review or adjust all Options/Format UI copy in one place.
 */
import type { Format } from '../types'

// ── Options popover — per-toggle helpers ────────────────────────────────────
// Shown as a single muted line beneath each toggle.

export const TOGGLE_HELPERS = {
  includeVotes:
    'Show vote counts next to items that received them.',
  includeSections:
    "Keep the board's sections as headings in the export.",
  // authorName is only available on StickyNode (not shapes or text), and reads
  // the creator of the sticky as set by FigJam — not the last editor.
  includeAuthors:
    'Attribute each sticky to the person who created it.',
} as const

// ── Format picker — per-format one-liner descriptions ───────────────────────
// Shown inline beneath the Format select; updates with each selection.
// When format is Markdown, the description also reacts to the AI-optimized checkbox.

export const FORMAT_DESCRIPTIONS: Record<Format, string> = {
  markdown:  'Headings, lists, and tables. Good for docs and wikis.',
  plaintext: 'Simple indented text, no formatting syntax.',
  csv:       'Tabular rows, for spreadsheets.',
}

/** Shown in place of the standard Markdown description when AI-optimized is checked. */
export const MARKDOWN_AI_DESCRIPTION =
  'Markdown with context headers, formatted for AI tools.'
