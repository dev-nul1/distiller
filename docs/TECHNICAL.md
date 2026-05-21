# FigJam Exporter – Technical Design

**Companion to:** `PRD.md`
**Date:** [05/21/26]

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | Figma typings catch real bugs |
| Framework | `create-figma-plugin` (Preact) | Native-feeling UI, single-file bundling, well-maintained, Community-friendly |
| Template | `preact-tailwindcss` | First-class Tailwind integration with Figma theme auto-sync |
| UI components | `@create-figma-plugin/ui` + Tailwind | Native controls for inputs/buttons, Tailwind for layout |
| Linting | `@figma/eslint-plugin-figma-plugins` | Project standard |
| Typings | `@figma/plugin-typings` | Project standard |

### Bootstrap command

```
npx --yes create-figma-plugin --template plugin/preact-tailwindcss
```

### Why this stack (per project decision flow)

1. Surface: FigJam → `editorType: ["figjam"]`
2. Plugin (not widget)
3. Needs UI, medium complexity (4-5 views, format/mode picker, optional preview)
4. Public Community release → polish matters, native feel matters
5. No unusual deps

`create-figma-plugin` is the sweet spot. Tailwind via the official template
gives us layout DX without sacrificing native components. Dark mode handled
automatically via the `darkMode: ['class', '.figma-dark']` config.

## Architecture

### Two execution contexts

```
┌─────────────────────────────────────┐
│   Sandbox (main.ts)                 │
│   - Access to figma.* API           │
│   - Single-threaded vs document     │
│   - Traversal, extraction           │
│   - No DOM, no fetch                │
└──────────┬──────────────────────────┘
           │
           │  postMessage (typed events)
           │
┌──────────▼──────────────────────────┐
│   UI iframe (ui.tsx)                │
│   - Preact + Tailwind + native UI   │
│   - Renderers (md, csv, plain, llm) │
│   - Clipboard, download             │
│   - User interaction                │
└─────────────────────────────────────┘
```

**Division of responsibility:**

- **Sandbox** does FigJam traversal and produces a normalized intermediate
  representation (IR). It does *not* know about output formats.
- **UI** receives the IR and runs format-specific renderers. Keeping renderers
  in the UI context means we can preview live without re-traversing the
  document.

This split also means renderers are pure functions over the IR – easy to
unit-test outside Figma.

### Messaging

Use `@create-figma-plugin/utilities` `emit`/`on` for type-safe message
passing. Define event names as a const map in `src/events.ts` to avoid
stringly-typed bugs.

Events (initial):

- `EXTRACT_REQUEST` (UI → sandbox) with selection mode + options
- `EXTRACT_PROGRESS` (sandbox → UI) with `{ processed, total }` for large pages
- `EXTRACT_COMPLETE` (sandbox → UI) with the IR payload
- `EXTRACT_ERROR` (sandbox → UI) with a human-readable message

## Data model (IR)

The intermediate representation the sandbox produces and the UI consumes:

```ts
type ExportIR = {
  meta: {
    fileName: string
    pageName: string
    extractedAt: string  // ISO timestamp
    mode: SelectionMode
    counts: { stickies: number; text: number; shapes: number; tables: number; sections: number }
  }
  sections: SectionNode[]      // top-level sections
  orphans: ExportItem[]        // items not inside any section
}

type SectionNode = {
  id: string
  title: string
  depth: number                // for nested sections
  items: ExportItem[]
  children: SectionNode[]      // nested sections
}

type ExportItem = {
  id: string
  kind: 'sticky' | 'text' | 'shape' | 'table'
  content: string              // plain text, rich formatting flattened
  votes?: number               // omitted if zero/unknown
  position: { x: number; y: number }  // for ordering, dropped before render
  tableData?: TableData        // populated if kind === 'table'
}

type TableData = {
  rows: string[][]             // [row][col]
  hasHeader: boolean           // best-effort heuristic
}

type SelectionMode = 'page' | 'section' | 'selection' | 'viewport'
```

## Pipeline

1. **UI sends `EXTRACT_REQUEST`** with selection mode and options.
2. **Sandbox resolves the root node set** based on mode:
   - `page`: `figma.currentPage.children`
   - `section`: filter selection for `SECTION` nodes, error if none
   - `selection`: `figma.currentPage.selection`
   - `viewport`: filter `currentPage.children` by intersection with
     `figma.viewport.bounds`
3. **Sandbox traverses** the root set, recursing into sections. For each
   supported node type, produce an `ExportItem`. Yield to the event loop
   periodically (every N nodes) to keep the UI responsive on large pages.
4. **Sandbox orders items** within each section using the spatial heuristic
   (see Ordering below).
5. **Sandbox emits `EXTRACT_COMPLETE`** with the IR.
6. **UI renders preview** (if preview enabled) and shows the format picker.
7. **On format selection, UI runs the appropriate renderer** against the IR.
8. **On Copy/Download click**, UI writes to clipboard or triggers a download
   blob.

## Ordering heuristic

Within a section (or at the top level), items are sorted by spatial position:

1. Group items into "rows" by y-coordinate, with a tolerance of roughly
   half the median sticky height (tunable, start with 40px).
2. Sort rows top-to-bottom by min y.
3. Within a row, sort left-to-right by x.

This won't match human intent perfectly. Document as a known limitation. v2
candidate: optional drag-to-reorder in the preview pane.

## Renderers

Each renderer is a pure function `(ir: ExportIR, opts: RenderOpts) => string`.

### `plaintext.ts`

- Section titles as their own lines, optionally with depth indentation.
- Items as bullet-like dashes or just indented lines.
- Votes as ` (N votes)` suffix when present and `opts.includeVotes`.

### `markdown.ts`

- Section titles as `##`, `###`, etc. based on depth.
- Items as `- ` bullets.
- Votes as ` *(N votes)*` suffix.
- Tables rendered as markdown tables.

### `llm.ts`

- Wraps markdown with a preamble:
  ```
  # FigJam Workshop Export

  This is an export from a FigJam collaborative session. The structure below
  reflects the workshop's organization:
  - Headings are sections the facilitator created
  - Bullet items are sticky notes, text, or labeled shapes
  - Vote counts (when present) indicate participant prioritization

  Source: {fileName} / {pageName}
  Exported: {extractedAt}

  ---
  ```
- Otherwise same as markdown, possibly with slightly more verbose structural cues.

### `csv.ts`

- One row per item.
- Columns: `section_path`, `kind`, `content`, `votes`, `position_x`, `position_y`
- Section path uses ` > ` as separator for nested sections.
- Tables get one row per table cell with `kind=table_cell` and a `cell_ref`
  column added, OR are skipped in CSV with a flag in `RenderOpts`. Decide
  after prototyping.

## Project structure

```
figjam-exporter/
├── README.md
├── manifest.json
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── .eslintrc.json
├── docs/
│   ├── PRD.md
│   ├── TECHNICAL.md
│   ├── API-VERIFICATION.md
│   └── ROADMAP.md
└── src/
    ├── main.ts                 // sandbox entry
    ├── ui.tsx                  // UI entry
    ├── input.css               // tailwind entrypoint
    ├── events.ts               // typed event names + payloads
    ├── types.ts                // shared IR types
    ├── sandbox/
    │   ├── resolve-roots.ts    // mode → root nodes
    │   ├── traverse.ts         // walk tree, build IR
    │   ├── extract/
    │   │   ├── sticky.ts
    │   │   ├── text.ts
    │   │   ├── shape.ts
    │   │   ├── table.ts        // pending API verification
    │   │   └── votes.ts        // pending API verification
    │   └── ordering.ts
    ├── ui/
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── ModePicker.tsx
    │   │   ├── FormatPicker.tsx
    │   │   ├── OptionsPanel.tsx
    │   │   ├── PreviewPanel.tsx
    │   │   └── ActionButtons.tsx
    │   ├── hooks/
    │   │   ├── useExtraction.ts
    │   │   └── useClipboard.ts
    │   └── renderers/
    │       ├── plaintext.ts
    │       ├── markdown.ts
    │       ├── llm.ts
    │       └── csv.ts
    └── __tests__/
        └── renderers/          // renderer tests against fixture IRs
```

## Manifest (v1)

```json
{
  "name": "FigJam Exporter",
  "id": "TBD-assigned-at-publish",
  "api": "1.0.0",
  "main": "build/main.js",
  "ui": "build/ui.js",
  "editorType": ["figjam"],
  "networkAccess": { "allowedDomains": ["none"] }
}
```

No network access. No external services. This should breeze through Figma
review.

## Performance

- FigJam pages can have thousands of nodes. The Plugin API is single-threaded
  against the document.
- During traversal, yield to the event loop every 100-200 nodes via
  `await new Promise(r => setTimeout(r, 0))` to keep the UI responsive.
- Emit `EXTRACT_PROGRESS` periodically so the UI can show a progress bar
  during large extractions.
- Renderers run in the UI iframe, off the document thread, so they don't
  affect document responsiveness.

## Testing strategy

- Renderers: unit tests against hand-built `ExportIR` fixtures. No Figma
  needed. Snapshot tests are fine here.
- Traversal: harder to unit-test without Figma. Approach: build minimal mock
  node objects matching the Figma API shape and test traversal logic against
  them. Skip integration tests in v1.
- Manual test matrix: small board (10 stickies), medium board (50 stickies, 4
  sections), large board (500+ stickies), pathological board (deeply nested
  sections), empty board.

## Build and dev

Scripts from the `preact-tailwindcss` template, unchanged:

```json
{
  "scripts": {
    "build": "npm run build:css && npm run build:js",
    "build:css": "tailwindcss --input ./src/input.css --output ./src/output.css",
    "build:js": "build-figma-plugin --typecheck --minify",
    "watch": "npm run build:css && concurrently npm:watch:css npm:watch:js",
    "watch:css": "tailwindcss --input ./src/input.css --output ./src/output.css --watch",
    "watch:js": "build-figma-plugin --typecheck --watch"
  }
}
```

## Open technical questions

These are tracked in `API-VERIFICATION.md` for resolution at the start of the
build phase.
