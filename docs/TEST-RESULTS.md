# FigJam Exporter – Manual Test Results

**Status:** pending
**Tester:** —
**Build:** —
**Date:** —

---

## Test boards

| # | Board | Nodes | Sections | Notes |
|---|---|---|---|---|
| A | Small | ~10 stickies | 0–1 | Baseline sanity check |
| B | Medium | ~50 stickies | 4 | Typical retro/sprint board |
| C | Large | 500+ nodes | 10+ | Stress test; perf focus |
| D | Pathological | Variable | 5+ levels deep | Edge cases (see below) |

---

## Test matrix

For each board run the full matrix unless a column is marked N/A.

### Board A – Small

| Mode | Format | includeVotes | includeSections | Result | Notes |
|---|---|---|---|---|---|
| Page | Markdown | on | on | | |
| Page | Plaintext | on | off | | |
| Page | CSV | on | on | | |
| Page | LLM | on | on | | |
| Viewport | Markdown | on | on | | |
| Selection | Markdown | on | on | | |
| Copy action | — | — | — | | |
| Download action | — | — | — | | |
| Keyboard Enter | — | — | — | | |
| Keyboard Esc | — | — | — | | |
| Settings persist (reopen plugin) | — | — | — | | |

### Board B – Medium

| Mode | Format | Options | Result | Notes |
|---|---|---|---|---|
| Page | Markdown | defaults | | |
| Page | Markdown | includeSections off | | |
| Page | CSV | expandTables on | | |
| Page | LLM | defaults | | |
| Section (select 1 section) | Markdown | defaults | | |
| Selection (select stickies) | Plaintext | defaults | | |
| Preview panel | — | showPreview on | | counts summary correct? |

### Board C – Large (perf focus)

| Scenario | Expected | Actual ms | Notes |
|---|---|---|---|
| Page / Markdown extraction | < 500 ms | | |
| Page / CSV extraction | < 500 ms | | |
| Preview render on format change | instant | | |
| Copy (large string) | < 200 ms | | |
| Download | instant | | |

### Board D – Pathological

| Scenario | Expected | Result | Notes |
|---|---|---|---|
| Deeply nested sections (5+ levels) | Renders without crash | | |
| Empty sticky with votes | Shows `(empty) *(N votes)*` | | |
| Empty sticky no votes | Omitted from output | | |
| Sticky with very long text (1000+ chars) | Renders; no truncation | | |
| Section with zero items | Section heading present, no items | | |
| Board with zero stickies (only shapes/text) | Counts correct | | |
| Board with only orphan stickies (no sections) | Flat output, no headings | | |
| Mixed node types (sticky + text + shape + table) | All kinds captured | | |
| Vote counts (stamps) | All stamp types counted | | |

---

## Known risks identified during code review

| Risk | Location | Severity | Mitigation |
|---|---|---|---|
| Synchronous traversal on very large boards | `src/sandbox/traverse.ts` | Low | Benchmarked on test board C; no `setTimeout` available in sandbox |
| `on()` listener not cleaned up if user rapidly re-extracts | `useExtraction.ts` | Low | Previous listeners cleaned up via `cleanup[]` array in `done()` |
| `execCommand('copy')` deprecated in modern browsers | `useClipboard.ts` | Low | Fallback only; `navigator.clipboard` preferred when available |
| Figma Clipboard API unavailable in sandboxed iframe | `useClipboard.ts` | Fixed | execCommand fallback added |
| `figma.clientStorage` `getAsync` may return `undefined` on first run | `src/main.ts` | Fixed | Spread over `DEFAULT_SETTINGS` |
| Keyboard shortcut `Enter` may fire inside Disclosure toggle | `App.tsx` | Low | Tag check guards INPUT/TEXTAREA/SELECT; test with OPTIONS open |

---

## Issues found

_Fill in during test pass._

| # | Severity | Description | Reproduction | Status |
|---|---|---|---|---|
| | | | | |

---

## Sign-off

- [ ] All Board A tests pass
- [ ] All Board B tests pass
- [ ] Board C perf within targets
- [ ] Board D edge cases handled
- [ ] No console errors during any test run
- [ ] Settings persist correctly across plugin close/reopen
- [ ] Build green (`npm run build && npm test`)
