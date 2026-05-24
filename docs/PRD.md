# Distiller – FigJam Exporter · PRD

**Status:** v1 shipped  
**Product:** Distiller – FigJam Exporter  
**Surface:** FigJam plugin  
**Date:** 2026-05-21

## Problem

After a workshop, retro, or planning session, teams end up with a board full of sticky notes, sections, and votes that someone has to manually transcribe into Confluence, Jira, a status update, or an AI prompt for synthesis. Existing plugins dump sticky text as flat lists and lose the structural signal (sections, votes, hierarchy) that makes the export actually useful.

## Goal

Let a facilitator export a FigJam page (or a controlled subset) into a clean, structured format ready for Confluence, Jira, plain communications, or AI-driven synthesis, with hierarchy and vote signal preserved.

## Target user

Workshop facilitators, scrum masters, product managers, designers — anyone who runs collaborative FigJam sessions and has to write something up afterward.

Primary scenarios:

1. **AI synthesis** – paste a structured export into Claude/ChatGPT for summarization, theming, or action-item extraction.
2. **Confluence / docs** – paste Markdown directly into a wiki page.
3. **Jira import** – CSV rows mapping to issues for bulk import.
4. **Quick communications** – plain text for Slack updates, emails, status notes.

---

## v1 scope

### Selection modes

| Mode | Description |
|---|---|
| Whole page | Every supported node on the current page |
| Current selection | Whatever is currently selected on the canvas |
| Current viewport | Nodes whose bounding box intersects the visible viewport |

### Formats

| Format | Primary action | Description |
|---|---|---|
| Markdown | Copy to clipboard | Standard Markdown headings, lists, tables, and code fences. An optional **AI-optimized** mode (on by default) prepends a structured context header — board name, timestamp, scope, content summary, and active export settings — formatted for AI tools. |
| Plain text | Copy to clipboard | Indented hierarchy, no Markdown syntax. |
| CSV | Download file | Flat rows with columns for section path, kind, content, votes, and optional author. Tables expand to one row per cell (with a `cell_ref` column) by default. Code block content is signposted rather than inlined. |

Each format has both a Copy and a Download action; the primary differs by format (Copy for text/Markdown, Download for CSV).

### Options (user-configurable)

| Option | Default | Notes |
|---|---|---|
| Include votes | On | Append vote counts to items that received `+1` stamps. |
| Include section hierarchy | On | Render sections as headings / indentation in text formats; include `section_path` in CSV. |
| Include author names | Off | Attribute each sticky to its creator. Author is included only when the user enables this option AND the sticky's author has enabled their name visibility in FigJam (`authorVisible === true`). Only stickies carry author data; other node types do not expose authorship. |
| Expand tables to rows (CSV) | On | One CSV row per table cell instead of one row per table item. |
| AI-optimized (Markdown) | On | Prepend a context preamble to Markdown output. Persisted across sessions. |

Settings persist across plugin close/reopen via `figma.clientStorage`.

### Node types captured

| FigJam type | Exported as |
|---|---|
| `STICKY` | kind: `sticky` |
| `TEXT` | kind: `text` |
| `SHAPE_WITH_TEXT` | kind: `shape` |
| `TABLE` | kind: `table` |
| `CODE_BLOCK` | kind: `code` |
| `SECTION` | Hierarchy marker (`ExportSection`) |

Unsupported: images, drawings, FRAME, GROUP, CONNECTOR, WIDGET nodes, unlabeled shapes (empty `text.characters`), empty stickies with no votes.

### UX flow

1. Plugin opens at 400 × ~200 px; persisted settings load from `figma.clientStorage`.
2. If the canvas has a non-empty selection, the mode defaults to "Current selection"; otherwise "Whole page".
3. Extraction runs automatically, debounced 300 ms, whenever mode, format, or options change. On large boards (>2 000 canvas nodes in scope) auto-extract is skipped and a "Generate preview" button is offered instead.
4. A result-zone header shows the current scope at a glance: pill badges with item counts when content is found; a quiet message when the board is empty; an error banner with a Retry button on failure. The header is always visible regardless of the preview toggle.
5. "Show preview" toggle enables a scrollable preview text area; the window expands to 640 px.
6. Options gear button opens a floating popover with the four content toggles. An active-state badge counts non-default options at a glance.
7. Copy and Download buttons in the sticky footer. In preview-off mode, clicking either button runs a fresh extraction then acts immediately.
8. Keyboard shortcuts: **Enter** triggers the primary Copy action; **Escape** closes the plugin.
9. Success toast auto-dismisses after 2 s.

### Vote counting

Distiller counts `+1` stamp nodes stuck to each sticky (`stuckNodes` where `name === '+1'`), which covers the common dot-voting pattern. The official FigJam Voting Widget stores its totals in `WidgetNode.widgetSyncedState`, which is only readable by a plugin whose manifest `id` matches the widget's own — an external plugin cannot access those counts. Boards using the Voting Widget will show 0 votes even if widget votes are present.

---

## Known v1 limitations

- **Sticky ordering is heuristic.** Items are sorted spatially: grouped into rows by y-coordinate (40 px tolerance), then top-to-bottom, left-to-right within each row. This does not always match the facilitator's intent in dense collages.
- **Spatially clustered stickies without a section are not grouped.** Items arranged visually in clusters but not placed inside a FigJam section are exported flat.
- **Color, non-`+1` stamps, and connectors are not captured.** Sticky note color, stamp reactions other than `+1`, and connector-based relationships are not included in v1.
- **FigJam Voting Widget votes are inaccessible.** See Vote counting above.
- **Rich text: best-effort extraction.** Bold, italic, strikethrough, hyperlinks, and list structure are captured and rendered per format. Known gaps:
  - **Bold is heuristic:** `fontWeight >= 700`. Medium/Semibold (500–600) weights are not tagged bold.
  - **Italic is heuristic:** detected via `fontName.style` containing "italic". Unusual fonts may produce false positives or misses.
  - **Underline is captured but not represented in output.** Text is preserved; the decoration is silently dropped in all formats.
  - **Color, font size, and mixed-within-word styling** have no output representation.
  - **Nested lists are flattened** to a single level.
  - **Partial-word links** (where a hyperlink spans only part of a word) are supported but may look odd in plain text.
- **Code blocks in CSV.** Code content is signposted (`[code block omitted – N lines; use Markdown export]`) rather than inlined, because raw multi-line code in a CSV cell is rarely useful.
- **Author attribution requires opt-in and Figma-side visibility.** The "Include author names" option must be enabled, and the sticky author must have enabled their name visibility in FigJam. Stickies with visibility off export without an author field regardless of the option setting.

---

## Non-goals for v1

- Two-way sync (no import back into FigJam)
- Direct integration with Confluence, Jira, or Slack APIs
- Real-time export during the workshop
- Multi-page export in one run
- Templates or saved export configurations
- Authentication or any account system

---

## Success criteria

- A facilitator can run the plugin, pick a format, and get usable output in under 30 seconds for a typical retro board (~50 stickies, 4–6 sections).
- Markdown output pastes cleanly into Confluence with hierarchy intact.
- CSV output imports into Jira without manual cleanup for the common case (title column maps to Jira summary).
- Markdown + AI-optimized output, when pasted into Claude/ChatGPT with a "summarize this retro" prompt, produces a useful summary on the first try.
