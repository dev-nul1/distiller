export type SelectionMode = 'page' | 'section' | 'selection' | 'viewport'

export type Format = 'plaintext' | 'markdown' | 'csv'

export type TableData = {
  /** [row][col]; merged cells are exposed as empty strings */
  rows: string[][]
  /** best-effort: true when the table has at least one row (first row treated as header) */
  hasHeader: boolean
}

/**
 * One styled run within a rich-text block. Runs map 1:1 to the segments
 * returned by Figma's getStyledTextSegments API; the text may contain '\n'
 * for paragraph breaks.
 *
 * Known limitations (best-effort extraction):
 * - Bold: fontWeight >= 700. Medium/Semibold (500–600) are not tagged bold.
 * - Italic: detected via fontName.style containing "italic" (case-insensitive).
 * - Underline: captured here but not represented in any output format (text
 *   preserved intact, decoration silently dropped).
 * - Color, font size, and mixed-within-word styling have no output representation.
 * - Partial-word links (link spans that don't align with word boundaries) are
 *   supported but may look odd in plain text.
 * - Nested lists (ORDERED inside UNORDERED, etc.) are flattened to a single level.
 */
export type RichRun = {
  /** Raw characters for this run; may contain '\n' paragraph separators. */
  text: string
  bold?: boolean
  italic?: boolean
  strikethrough?: boolean
  /** Underline is captured but not emitted in any output format. */
  underline?: boolean
  /** URL string when this run is a hyperlink (NODE-type links are excluded). */
  href?: string
  /** List paragraph type. Absent (undefined) means a plain paragraph. */
  listType?: 'ORDERED' | 'UNORDERED'
}

/** Extracted content from a FigJam CODE_BLOCK node. */
export type CodeData = {
  code: string
  /** Lowercased language string from CodeBlockNode.codeLanguage (e.g. 'typescript', 'python'). */
  language?: string
}

export type ExportItem = {
  id: string
  kind: 'sticky' | 'text' | 'shape' | 'table' | 'code'
  /** Plain text; rich formatting flattened. Always populated. */
  content: string
  /**
   * Structured rich-text runs. Present only when at least one run in the
   * source text has formatting (bold, italic, strikethrough, link, or list
   * type). When absent, `content` is the canonical representation.
   */
  richContent?: RichRun[]
  /** count of '+1' STAMP nodes stuck to this item; omitted when zero */
  votes?: number
  /**
   * Display name of the sticky's author. Only present when the author has
   * enabled visibility on their sticky (node.authorVisible === true).
   * Only stickies carry this field; other node types do not expose authorship.
   */
  author?: string
  /** canvas position – used for ordering, dropped before render */
  position: { x: number; y: number }
  /** populated when kind === 'table' */
  tableData?: TableData
  /** populated when kind === 'code' */
  codeData?: CodeData
}

/**
 * IR representation of a FigJam section node.
 * Named ExportSection (not SectionNode) to avoid collision with the
 * global SectionNode type from @figma/plugin-typings.
 */
export type ExportSection = {
  id: string
  title: string
  /** 0 for top-level sections, increments for each nesting level */
  depth: number
  items: ExportItem[]
  children: ExportSection[]
}

export type RenderOpts = {
  /**
   * Whether to include vote counts in the output.
   * Defaults to true when not specified (treat undefined as true).
   */
  includeVotes?: boolean
  /**
   * CSV only: expand table items into one row per cell (kind=table_cell).
   * When false, tables are emitted as a single row using the flat content string.
   * Defaults to true when not specified.
   */
  csvExpandTables?: boolean
  /**
   * Whether to emit section headings / hierarchy.
   * When false, all items are rendered as a flat list regardless of nesting.
   * Defaults to true when not specified.
   */
  includeSections?: boolean
  /**
   * Whether to include sticky note author names in the output.
   * Opt-in (defaults to false/undefined). Only stickies whose authorVisible
   * flag is true in Figma will have an author to display.
   */
  includeAuthors?: boolean
  /**
   * When true, Markdown output includes the AI context preamble (the former
   * "LLM-ready" output). Only meaningful when used with the 'markdown' format.
   * Persisted in clientStorage; defaults to true.
   */
  aiOptimized?: boolean
}

/** Persisted user preferences stored in figma.clientStorage. */
export type PluginSettings = {
  includeVotes: boolean
  includeSections: boolean
  csvExpandTables: boolean
  showPreview: boolean
  includeAuthors: boolean
  /** Whether Markdown output should include the AI context preamble. Defaults to true. */
  aiOptimized: boolean
}

export type ExportIR = {
  meta: {
    fileName: string
    pageName: string
    /** ISO 8601 timestamp */
    extractedAt: string
    mode: SelectionMode
    counts: {
      stickies: number
      text: number
      shapes: number
      tables: number
      codes: number
      sections: number
    }
  }
  /** top-level sections */
  sections: ExportSection[]
  /** items not inside any section */
  orphans: ExportItem[]
}
