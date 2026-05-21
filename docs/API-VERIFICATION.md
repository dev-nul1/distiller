# FigJam Exporter – API Verification Checklist

**Purpose:** Before writing any sandbox code, verify each of the following
against the live Figma developer docs. Claude's training data has a cutoff
and these APIs evolve frequently. Confirm signatures, property names, and
availability. Update this doc with findings.

**Date created:** [05/21/26]
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

**Outcome / notes:**

---

## 2. FigJam voting widget – how vote counts are exposed

**What we need:** Capture vote counts per sticky/item.

**To verify:**
- Is voting a property on the target node, a separate widget node, or both?
- If a separate node: how do we associate votes with the voted-on item?
- Per-voter detail or aggregate count only?
- Whether voting state persists in the file after a voting session ends

**Outcome / notes:**

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

**Outcome / notes:**

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

**Outcome / notes:**

---

## 5. Shapes with text – which node types and how to read text

**What we need:** Read text from labeled shapes (rectangles, ellipses, etc.).

**To verify:**
- Which shape node types support text in FigJam (`SHAPE_WITH_TEXT`,
  `RECTANGLE`, etc.)
- Property name for embedded text
- Whether unlabeled shapes should be silently skipped (yes, probably)

**Outcome / notes:**

---

## 6. Text node access

**What we need:** Read text from standalone text nodes on the canvas.

**To verify:**
- Node type identifier (`'TEXT'`)
- `characters` property availability and whether loadFontAsync is needed for
  *reading* (it should not be – font loading is for writing)

**Outcome / notes:**

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

**Outcome / notes:**

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

**Outcome / notes:**

---

## 9. Manifest fields and current API version

**What we need:** Confirm the current manifest schema and API version we
should target.

**To verify:**
- Current `api` version value
- `editorType` accepted values – confirm `"figjam"` is current spelling
- `networkAccess` schema (was it once `allowedDomains: []` vs `["none"]`?)
- Any new required fields for Community submission

**Outcome / notes:**

---

## 10. Clipboard and download from the UI iframe

**What we need:** Copy to clipboard and trigger file download from the UI.

**To verify:**
- `navigator.clipboard.writeText` works in the plugin iframe (it should –
  Figma grants clipboard permission to plugins, but confirm current state)
- Standard blob+anchor pattern for file downloads works from the iframe
- Any size limits on clipboard payload (unlikely to matter, but flag)

**Outcome / notes:**

---

## 11. `create-figma-plugin` template currency

**What we need:** Confirm `preact-tailwindcss` template is current and the
recommended Tailwind integration path.

**To verify:**
- Template still exists in the create-figma-plugin repo
- Tailwind version it uses (v3 vs v4 – setup differs)
- Whether the docs example matches the actual generated project

**Outcome / notes:**

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
