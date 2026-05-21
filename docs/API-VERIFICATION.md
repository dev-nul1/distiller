# FigJam Exporter – API Verification Checklist

**Purpose:** Before writing any sandbox code, verify each of the following
against the live Figma developer docs. Claude's training data has a cutoff
and these APIs evolve frequently. Confirm signatures, property names, and
availability. Update this doc with findings.

**Date created:** [05/21/26]
**Verified:** 2026-05-21 – all items fetched from live Figma developer docs
**Primary references:**
- https://developers.figma.com/
- https://developers.figma.com/docs/plugins/updates/
- https://www.figma.com/plugin-docs/api/api-reference/

---

## 1. Sticky note node type and text access

**What we need:** Read the text content of a sticky note. Confirm node type
name and the property exposing text.

**To verify:**
- Node type identifier (likely `'STICKY'` but confirm)
- Text property name (likely `text.characters` or `characters`)
- Whether rich text (bold/italic) is exposed and whether v1 should flatten
- Author metadata (if exposed, may be useful for ROADMAP)

**Outcome / notes:** ✅ VERIFIED

- Node type is `'STICKY'` – confirmed.
- Text is on a sublayer: `text: TextSublayerNode [readonly]`. Access content via
  `node.text.characters: string`. There is **no** `characters` property directly
  on `StickyNode`; must go through the `text` sublayer.
- `.characters` returns a flat string. Rich text formatting (bold/italic) exists
  in the sublayer but v1 should use `.characters` only (correct approach).
- Author: `authorName: string` and `authorVisible: boolean` are on `StickyNode`.
  Exposing author is a ROADMAP item as assumed.
- `isWideWidth: boolean` – sticky-shape variant. Not needed for v1.
- `stuckNodes: SceneNode[]` – lists stamps, highlights, and widgets stuck to this
  sticky. This is the entry point for vote counting (see item 2).

---

## 2. FigJam voting widget – how vote counts are exposed

**What we need:** Capture vote counts per sticky/item.

**To verify:**
- Is voting a property on the target node, a separate widget node, or both?
- If a separate node: how do we associate votes with the voted-on item?
- Per-voter detail or aggregate count only?
- Whether voting state persists in the file after a voting session ends

**Outcome / notes:** ⚠️ SIGNIFICANT FINDING – assumption partially wrong

- **There is no `voteCount` property on any node.** No native vote-count field
  exists anywhere in the Plugin API.
- **FigJam's native Voting Widget** is a `WIDGET` type node. Its state lives in
  `WidgetNode.widgetSyncedState`, which is **only readable by a plugin whose
  manifest `id` matches the widget's own `widgetId`**. An external plugin
  cannot read vote counts stored inside the official Voting Widget.
- **What IS readable:** Every `SceneNode` exposes `stuckNodes: SceneNode[]`,
  listing all `STAMP`, highlight, and `WIDGET` nodes physically stuck to it.
  `StampNode.name` encodes the stamp type: `"+1"`, `"Thumbs up"`,
  `"Thumbs down"`, `"Heart"`, `"Star"`, `"Question"`, `"Dot"`, `"Profile"`.
- **v1 vote-counting approach:** On each sticky/shape, count `STAMP` nodes in
  `stuckNodes` where `name === '+1'` (or optionally all non-`"Profile"` stamps).
  This covers the common dot-voting pattern using +1 stamps.
- **Limitation:** If facilitators used the official FigJam Voting Widget, those
  counts are inaccessible. Document this in the README.

**Decision:** Ship vote counting via stamp counting in v1. Flag the
voting-widget limitation in the README.

**TECHNICAL.md revision required** – see flag in that doc.

**Decision impact:** If votes can't be cleanly associated with items, drop
to roadmap and ship v1 without them.

---

## 3. FigJam tables – API support

**What we need:** Read tables cell by cell, in row/column order, with text
content per cell. This is the highest-risk item for v1.

**To verify:**
- Does a FigJam-specific table node type exist in the current Plugin API?
- If yes: how are rows, columns, and cells exposed?
- Header row detection (is there a property, or is it heuristic?)
- Merged cells handling

**Outcome / notes:** ✅ VERIFIED – tables are included in v1

- `TableNode` exists with `type: 'TABLE'`. It is part of the standard
  `SceneNode` union.
- `numRows: number [readonly]` and `numColumns: number [readonly]` present.
- `cellAt(rowIndex: number, columnIndex: number): TableCellNode` – clean indexed
  cell access.
- `TableCellNode`: `type: 'TABLE_CELL'`, `text: TextSublayerNode [readonly]`,
  `rowIndex: number [readonly]`, `columnIndex: number [readonly]`.
- **Header row:** No `isHeader` or equivalent property. Detection is heuristic
  (assume first row is header), as planned.
- **Merged cells:** No `rowSpan` / `colSpan` exposed. Merged cells return empty
  text. Handle gracefully: if `cell.text.characters.trim() === ''`, render as
  empty string.
- **Iteration:** `for r in 0..numRows-1, for c in 0..numColumns-1: cellAt(r,c).text.characters`.
- Tables are **in v1** – the API is clean enough.

**Decision impact:** If table API is missing or awkward, tables drop from
v1 cleanly. The IR already has an optional `tableData` field.

---

## 4. Section node API

**What we need:** Identify sections, read their titles, recurse into children,
detect nested sections.

**To verify:**
- Node type identifier (likely `'SECTION'`)
- Title property name
- Whether sections can be nested in FigJam, and if so, how deep
- How to distinguish section nodes from frames or groups

**Outcome / notes:** ✅ VERIFIED

- Node type is `'SECTION'` – confirmed.
- **Title:** No separate `title` property. The label uses standard `name: string`
  (inherited from `BaseNode`). Access as `node.name`.
- **Children:** `SectionNode` implements `ChildrenMixin` – iterate `node.children`.
- **Nesting:** Sections CAN be nested. Detect nested sections by checking
  children for `type === 'SECTION'`. No documented depth limit.
- **`sectionContentsHidden: boolean`** available if we want to skip hidden sections.
- Distinguished from frames/groups unambiguously by `type === 'SECTION'`.

---

## 5. Shapes with text – which node types and how to read text

**What we need:** Read text from labeled shapes (rectangles, ellipses, etc.).

**To verify:**
- Which shape node types support text in FigJam (`SHAPE_WITH_TEXT`,
  `RECTANGLE`, etc.)
- Property name for embedded text
- Whether unlabeled shapes should be silently skipped (yes, probably)

**Outcome / notes:** ✅ VERIFIED

- FigJam-specific type: `'SHAPE_WITH_TEXT'` (`ShapeWithTextNode`). Standard
  Figma shapes like `RECTANGLE` and `ELLIPSE` do **not** have embedded text in
  FigJam; only `SHAPE_WITH_TEXT` does.
- Text access: `text: TextSublayerNode [readonly]` → `node.text.characters`.
  Same pattern as `StickyNode`.
- `shapeType` covers many variants: `'SQUARE'`, `'ELLIPSE'`,
  `'ROUNDED_RECTANGLE'`, `'DIAMOND'`, `'TRIANGLE_UP'`, `'TRIANGLE_DOWN'`,
  plus flowchart/engineering shapes (`'ENG_DATABASE'`, etc.), `'SPEECH_BUBBLE'`,
  and others.
- Unlabeled shapes: skip when `node.text.characters.trim() === ''`.

---

## 6. Text node access

**What we need:** Read text from standalone text nodes on the canvas.

**To verify:**
- Node type identifier (`'TEXT'`)
- `characters` property availability and whether loadFontAsync is needed for
  *reading* (it should not be – font loading is for writing)

**Outcome / notes:** ✅ VERIFIED

- Node type is `'TEXT'` – confirmed.
- `characters: string` is a direct property on `TextNode`, readable without
  any font loading. `loadFontAsync` is only required when writing text. Reading
  is synchronous and requires nothing extra.

---

## 7. Viewport bounds traversal

**What we need:** For the "current viewport" selection mode, find all nodes
intersecting the visible viewport.

**To verify:**
- `figma.viewport.bounds` returns a `Rect` – confirm shape
- Best pattern for "nodes intersecting this rect": iterate
  `currentPage.children` and check `absoluteBoundingBox` overlap, or is there
  a helper?
- Performance implications on large pages

**Outcome / notes:** ✅ VERIFIED – ship viewport mode in v1

- `figma.viewport.bounds: Rect [readonly]` confirmed. `Rect` is
  `{ x: number, y: number, width: number, height: number }` where `(x, y)` is
  the top-left of the visible area.
- **No built-in intersection helper.** Must iterate `currentPage.children` and
  check `absoluteBoundingBox` overlap manually. Intersection test:
  `nodeRect.x < vp.x + vp.width && nodeRect.x + nodeRect.width > vp.x` (and
  same for y). `absoluteBoundingBox` is `Rect | null` on every SceneNode.
- **Performance:** Iterating top-level `currentPage.children` is fast. Viewport
  mode does not need to recurse deeply since sections are top-level. Cost is
  O(top-level nodes), typically tens to a few hundred items on FigJam boards.
- **Decision:** Cheap enough to ship in v1.

**Decision impact:** If this is awkward or expensive, drop viewport mode to
roadmap. PRD already flags it as "ship if cheap."

---

## 8. Page traversal performance

**What we need:** Confirm best practices for traversing thousands of nodes
without locking the UI.

**To verify:**
- `findAll` vs manual recursion – performance characteristics
- Whether yielding via `setTimeout(r, 0)` is the current recommended pattern
- Any newer async traversal helpers
- Whether `loadAsync`-style methods exist for any of the properties we read

**Outcome / notes:** ⚠️ PARTIAL FINDING – `setTimeout` assumption is wrong

- **`findAll(callback?): SceneNode[]`** is synchronous. Docs warn it can be
  slow on large files ("tens of thousands of nodes"). Prefer manual recursion
  on `node.children` so we can skip irrelevant branches early.
- **`findAllWithCriteria(criteria)`** also exists as a type-filtered synchronous
  alternative.
- **`setTimeout` is NOT available in the main sandbox.** Docs explicitly state:
  "browser APIs like XMLHttpRequest, fetch, setTimeout, and the DOM are not
  directly available from the sandbox." The `setTimeout(r, 0)` yielding pattern
  in TECHNICAL.md is incorrect and must be removed.
- **For typical FigJam boards** (~50–200 stickies, 4–8 sections), synchronous
  manual recursion completes in well under 1 second. No yielding needed for v1.
- **No `loadAsync`** is needed for reading `text.characters`, `name`,
  `absoluteBoundingBox`, or `stuckNodes` – all are synchronous.

**TECHNICAL.md revision required** – remove `setTimeout(r, 0)` reference.

---

## 9. Manifest fields and current API version

**What we need:** Confirm the current manifest schema and API version we
should target.

**To verify:**
- Current `api` version value
- `editorType` accepted values – confirm `"figjam"` is current spelling
- `networkAccess` schema (was it once `allowedDomains: []` vs `["none"]`?)
- Any new required fields for Community submission

**Outcome / notes:** ✅ VERIFIED – one new required field found

- **`api`**: The manifest example shows `"1.0.0"`. Figma does not auto-upgrade;
  use `"1.0.0"` (matching what `create-figma-plugin` generates).
- **`editorType`**: Confirmed `"figjam"` is current spelling. Full enum:
  `'figma' | 'figjam' | 'dev' | 'slides' | 'buzz'`. ⚠️ **The scaffolded
  template defaults to `["figma"]` – must be changed to `["figjam"]`.**
- **`networkAccess.allowedDomains: ["none"]`**: Valid. Plugin makes no outbound
  network requests.
- **`documentAccess: "dynamic-page"`**: ⚠️ **REQUIRED for all new plugins.**
  Without it, Figma loads all file pages on first run. Since we act only on the
  current page, include this field. TECHNICAL.md does not currently mention it.

**TECHNICAL.md revision required** – add `documentAccess` to manifest section.

---

## 10. Clipboard and download from the UI iframe

**What we need:** Copy to clipboard and trigger file download from the UI.

**To verify:**
- `navigator.clipboard.writeText` works in the plugin iframe (it should –
  Figma grants clipboard permission to plugins, but confirm current state)
- Standard blob+anchor pattern for file downloads works from the iframe
- Any size limits on clipboard payload (unlikely to matter, but flag)

**Outcome / notes:** ✅ VERIFIED

- **Clipboard:** The plugin UI runs in an `<iframe>` with full browser API access.
  `navigator.clipboard.writeText(text)` is available. The Copy button provides
  the required user gesture. No manifest permission needed.
- **File download:** Standard `blob + <a download>` pattern works from the
  iframe. No restrictions documented.
- **Size limits:** None documented. Typical export payloads (text/markdown/CSV)
  are well under any practical limit.

---

## 11. `create-figma-plugin` template currency

**What we need:** Confirm `preact-tailwindcss` template is current and the
recommended Tailwind integration path.

**To verify:**
- Template still exists in the create-figma-plugin repo
- Tailwind version it uses (v3 vs v4 – setup differs)
- Whether the docs example matches the actual generated project

**Outcome / notes:** ✅ VERIFIED – template exists; Tailwind is v4, not v3

- **`preact-tailwindcss` template exists** in the current repo at
  `packages/create-figma-plugin/templates/plugin/preact-tailwindcss`.
- **Tailwind v4** – `package.json` declares `"tailwindcss": ">=4"` and
  `"@tailwindcss/cli": ">=4"`. This is a meaningful change from v3:
  - Build command: `npx @tailwindcss/cli --input ./src/input.css --output ./src/output.css`
    (standalone CLI, no PostCSS).
  - `src/input.css` contains only `@import "tailwindcss";` (v4 entry point).
  - `tailwind.config.js` is present with `darkMode: ['class', '.figma-dark']`.
    In Tailwind v4, the JS config is not auto-loaded; a `@config "./tailwind.config.js"`
    directive in `input.css` is needed to activate it. The template omits this directive,
    so `.figma-dark` dark mode may be inert until `@config` is added at scaffold time.
    **Verify and add `@config` when scaffolding.**
- **`editorType` default:** Template's manifest defaults to `["figma"]`.
  Change to `["figjam"]` at scaffold.
- **`concurrently`** dev dep for parallel CSS/JS watching – no issues.

**TECHNICAL.md revision required** – clarify Tailwind v4, note `@config` requirement.

---

## Verification process

1. Open https://developers.figma.com/ in a browser.
2. For each item, read the relevant API reference section and the recent
   changelog entries.
3. Record findings under "Outcome / notes" for each item.
4. Flag any item where the API differs from what TECHNICAL.md assumes.
5. Update TECHNICAL.md before writing code if any assumption was wrong.

## Use the Figma MCP for spot-checks

The Figma MCP server is available in this workspace and can be used to:
- Inspect a real FigJam file to see how stickies, sections, votes, and
  tables show up in the node tree.
- Validate the IR shape against real data before committing to it.

Not a substitute for reading the docs, but useful as a sanity check after
the doc reading is done.
