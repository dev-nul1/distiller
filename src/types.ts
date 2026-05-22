export type SelectionMode = 'page' | 'section' | 'selection' | 'viewport'

export type Format = 'plaintext' | 'markdown' | 'llm' | 'csv'

export type ExtractOptions = {
  // reserved for future per-extraction options
}

export type TableData = {
  /** [row][col]; merged cells are exposed as empty strings */
  rows: string[][]
  /** best-effort: true when the table has at least one row (first row treated as header) */
  hasHeader: boolean
}

export type ExportItem = {
  id: string
  kind: 'sticky' | 'text' | 'shape' | 'table'
  /** plain text; rich formatting flattened */
  content: string
  /** count of '+1' STAMP nodes stuck to this item; omitted when zero */
  votes?: number
  /** canvas position – used for ordering, dropped before render */
  position: { x: number; y: number }
  /** populated when kind === 'table' */
  tableData?: TableData
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
}

/** Persisted user preferences stored in figma.clientStorage. */
export type PluginSettings = {
  includeVotes: boolean
  includeSections: boolean
  csvExpandTables: boolean
  showPreview: boolean
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
      sections: number
    }
  }
  /** top-level sections */
  sections: ExportSection[]
  /** items not inside any section */
  orphans: ExportItem[]
}
