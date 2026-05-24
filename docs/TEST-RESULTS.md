# Distiller – FigJam Exporter · Testing

**Date:** 2026-05-21

This document covers the automated test suite, what is not yet tested, and the manual validation approach for changes that cannot be unit-tested without a live Figma document.

---

## Automated test suite

Run with `npm test` (Vitest). All tests pass on every CI-equivalent run before merging.

| File | Tests | What it covers |
|---|---|---|
| `ordering.test.ts` | 8 | Spatial sort: row grouping, 40 px tolerance, ties at same y, multi-row ordering, left-to-right within rows |
| `resolve-roots.test.ts` | 10 | `resolveRoots` for `page`, `selection`, and `viewport` modes; viewport intersection geometry (partial overlap, exact edge, null bounding box) |
| `extract/sticky.test.ts` | 7 | Author visibility gate (`authorVisible` must be true to populate `author`), empty-name edge case, whitespace normalisation, empty sticky filtering, vote counting |
| `renderers/plaintext.test.ts` | 30 | All rendering paths: sections, nested sections, orphans, votes, authors, code, tables, rich text (bold, italic, links, lists) |
| `renderers/markdown.test.ts` | 42 | All rendering paths including rich text markup, heading depth capping, GFM table output, code fences |
| `renderers/markdown-ai.test.ts` | 16 | Preamble field values (board, timestamp, scope, content counts, export settings), separator, snapshot of full medium-fixture output |
| `renderers/csv.test.ts` | 27 | Column headers (with and without author), section path separator, table expansion to rows, code signpost, author column, rich-text flattening |

Fixture IRs are shared across the renderer test files via `src/__tests__/renderers/fixtures.ts`. The `resetIds()` call in `beforeEach` ensures deterministic IDs across tests.

### Coverage gaps (accepted)

**Sandbox traversal (`traverse.ts`):** `buildIR` requires a live Figma document for a realistic integration test. `resolve-roots.test.ts` covers `resolveRoots` via a mocked `globalThis.figma`. The extract functions (`extractSticky`, `extractText`, etc.) are covered indirectly through fixture IRs; `sticky.ts` has direct unit tests.

**UI components and hooks:** Not unit-tested. The stateful layer (`App.tsx`, hooks, components) is validated manually against a real plugin run. The renderers — the pure-function core — are fully covered.

**`richtext.ts` (sandbox extractor):** Covered indirectly through renderer tests that exercise `richContent` fixtures. Direct unit tests are not present but the segment-splitting logic is deterministic enough to cover at the renderer level.

---

## Manual validation

### What requires manual testing

- **Figma document access:** traversal of real stickies, sections, tables, code blocks, and nested sections.
- **Vote counting:** `+1` stamps, Voting Widget limitation (widget votes show as 0).
- **Author attribution:** `authorVisible` toggled on/off in real Figma.
- **Settings persistence:** close and reopen the plugin; verify all toggles restore correctly.
- **Window resize behaviour:** expanded mode (640 px) vs. compact (measured height); large-board guard.
- **Keyboard shortcuts:** Enter = Copy, Escape = close.
- **Clipboard and download:** both primary and secondary actions across formats.

### Manual test matrix

Run against a real FigJam file before any release. Mark Pass / Fail / N/A in the Status column.

#### Board A – small (~10 stickies, 0–1 sections)

| Scenario | Expected | Status |
|---|---|---|
| Page / Markdown / defaults | Headings + content, AI preamble present | |
| Page / Markdown / AI-optimized off | No preamble | |
| Page / Plain text | Indented hierarchy | |
| Page / CSV | Correct rows and columns | |
| Viewport / Markdown | Only visible nodes | |
| Selection (select 2 stickies) / Markdown | Only selected stickies | |
| Copy action | Clipboard receives correct text | |
| Download action | File saves with correct name and extension | |
| Enter shortcut | Copies output | |
| Escape shortcut | Plugin closes | |
| Toggle Include votes off | Vote counts absent from output | |
| Toggle Include authors on | Author names present (when authorVisible = true) | |
| Settings persist (reopen plugin) | All options restore | |

#### Board B – medium (~50 stickies, 4 sections)

| Scenario | Expected | Status |
|---|---|---|
| Page / Markdown / defaults | Sections as headings, stat pills correct | |
| Page / Markdown / Include section hierarchy off | Flat list | |
| Page / CSV / Expand tables on | Table rows expanded | |
| Page / CSV / Expand tables off | One row per table | |
| Page / Markdown / AI-optimized | Preamble shows correct counts | |
| Selection (select stickies) / Plain text | Only selected items | |
| Show preview on | Preview updates with options | |
| Show preview off | Header pills still correct | |

#### Board C – large (500+ nodes)

| Scenario | Expected | Status |
|---|---|---|
| Page mode | Large-board guard fires; "Generate preview" shown | |
| Manual "Generate preview" click | Extraction runs, content appears | |
| Viewport mode (pan to small area) | Auto-extract resumes when count drops below threshold | |
| Extraction time (page / Markdown) | Completes in < 1 s; no UI freeze | |

#### Board D – edge cases

| Scenario | Expected | Status |
|---|---|---|
| Deeply nested sections (5+ levels) | Renders without crash; headings capped at `######` | |
| Empty sticky with votes | Shows `(empty)` + vote count | |
| Empty sticky, no votes | Item omitted from output | |
| Sticky with very long text (1 000+ chars) | Rendered without truncation | |
| Section with zero items | Section heading present, no items below | |
| Board with no stickies (only shapes/text/code) | Counts correct; items exported | |
| Board with no sections (orphan stickies only) | Flat output; no headings in Markdown | |
| Author with spaces in name | Whitespace normalised (collapsed runs) | |
| Sticky with authorVisible = false | Author absent from export even when option on | |
| Code block (TypeScript) | Fenced with language tag in Markdown | |
| Code block (no language) | Fenced without language tag in Markdown | |
| Mixed node types (sticky + text + shape + table + code) | All kinds appear; counts correct | |

---

## Known risks

| Risk | Location | Severity | Status |
|---|---|---|---|
| Synchronous traversal on very large boards | `traverse.ts` | Low | Mitigated by the 2 000-node auto-extract guard |
| Stale `on()` listeners if user rapidly re-extracts | `useExtraction.ts` | Low | Each `extract()` call registers a new listener and returns a cleanup function; superseded responses are discarded via `requestId` |
| Clipboard API unavailable in sandboxed iframe | `useClipboard.ts` | Low | `navigator.clipboard.writeText` is available; `execCommand('copy')` fallback removed (deprecated) |
| `figma.clientStorage.getAsync` returns undefined on first run | `main.ts` | Fixed | Spread-merged over `DEFAULT_SETTINGS` |
| Author name leaks when `authorVisible` is false | `extract/sticky.ts` | Fixed | Gate is `node.authorVisible && node.authorName` |
