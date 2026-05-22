# FigJam Exporter – PRD

**Status:** v1 scoping
**Audience:** Figma Community (public release)
**Surface:** FigJam
**Date:** [05/21/26]

## Problem

After a workshop, retro, planning session, or any FigJam ceremony, teams end up
with a board full of sticky notes, sections, votes, and notes that someone has
to manually transcribe into Confluence, Jira, a status update, or an LLM prompt
for synthesis. Existing plugins dump sticky text as flat lists and lose the
structural signal (sections, votes, hierarchy) that makes the export actually
useful downstream.

## Goal

Let a facilitator export a FigJam page (or a controlled subset of it) into a
clean, structured format ready for Confluence, Jira, plain communications, or
LLM-driven synthesis, with the hierarchy and vote signal preserved.

## Target user

Workshop facilitators, scrum masters, product managers, designers, and anyone
who runs collaborative FigJam sessions and has to write something up afterward.

Primary scenarios:

1. **LLM synthesis** – paste a structured export into Claude/ChatGPT for
   summarization, theming, action item extraction.
2. **Confluence / docs** – paste markdown directly into a wiki page.
3. **Jira import** – CSV with rows mapping to issues for bulk import.
4. **Quick communications** – plaintext for Slack updates, emails, status notes.

## v1 scope

### Selection modes

| Mode | Description |
|---|---|
| Whole page | Every supported node on the current page |
| Selected section(s) | One or more sections highlighted by the user |
| Selected nodes | Whatever is currently selected |
| Current viewport | Nodes intersecting the visible viewport (cheap-to-add, ship if straightforward) |

### Formats

| Format | Primary action | Notes |
|---|---|---|
| Plaintext | Copy to clipboard | Indented hierarchy, minimal decoration |
| Markdown | Copy to clipboard | Standard markdown headings, lists |
| LLM-ready markdown | Copy to clipboard | Markdown plus framing preamble and explicit structural cues for LLM consumption |
| CSV | Download file | Flat rows with columns for section path, content, vote count, etc. |

Each format has a secondary action (download for clipboard-default formats,
copy raw text for CSV).

### Structural metadata captured in v1

- **Sections as hierarchy** – on by default. Nested sections become nested
  headings in markdown, dot-path in CSV.
- **Vote counts** – on by default when any votes are detected on the page.
  Rendered as `(N votes)` suffix in text formats, as a column in CSV.

### Structural metadata explicitly out of v1 (see ROADMAP)

- Sticky note color semantics
- Stamps / emoji reactions
- Connectors and connector-based relationships
- Spatial cluster detection (stickies grouped without a section)

### Node types captured in v1

- Sticky notes
- Text nodes (free text on the canvas)
- Shapes with text (labeled rectangles, ellipses, etc.)
- Section titles (as hierarchy markers)
- **FigJam tables – pending API verification.** If the API exposes table cell
  text cleanly, include in v1. Otherwise drop to roadmap.

Out: images, drawings, code blocks, non-voting widgets, stickies inside
widgets we don't recognize.

### UX flow

1. User runs plugin from the FigJam plugin menu after their session ends.
2. Plugin opens with selection-mode picker defaulting to "whole page" (or
   "selected" if a non-empty selection exists).
3. Format picker (4 options).
4. Optional toggles: include vote counts (auto-on if votes present), include
   section hierarchy (auto-on if sections present).
5. **Optional preview panel** (on by default, togglable in settings) – shows
   "47 stickies, 3 sections, 12 votes" plus first 5 items for sanity check.
6. Primary action button (Copy or Download depending on format), with the
   alternate action as a secondary.
7. Toast/confirmation on success.

### Known v1 limitations

These should be documented in the README and acknowledged in the Community
listing so users have correct expectations:

- **Sticky ordering is heuristic.** Stickies are ordered by spatial position
  (top-to-bottom, then left-to-right within rows with a y-tolerance). This
  won't perfectly match human intent in all cases, especially in dense
  collages.
- **Spatially clustered stickies without a section aren't grouped.** If a
  facilitator clusters stickies visually but doesn't put them inside a
  section, the export will flatten them.
- **Color, stamps, connectors not captured.** These carry semantic signal in
  many workshops but require mapping UX that's deferred to v2.
- **Rich text formatting in stickies/text nodes is flattened to plain text.**

## Non-goals for v1

- Two-way sync (no import back into FigJam)
- Integration with Confluence/Jira APIs directly (export-only, user pastes/uploads)
- Real-time export as the workshop happens
- Multi-page export in one run
- Templates or saved export configurations
- Authentication or any account system

## Success criteria

- A facilitator can run the plugin, pick a format, and get usable output in
  under 30 seconds for a typical retro board (~50 stickies, 4-6 sections).
- Markdown output pastes cleanly into Confluence with hierarchy intact.
- CSV output imports into Jira without manual cleanup for the common case
  (title column maps to summary).
- LLM-ready output, when pasted into Claude/ChatGPT with a "summarize this
  retro" prompt, produces a useful summary on the first try.

## Open questions

- Plugin display name for the Community listing (folder is `figjam-exporter`,
  but a friendlier name like "Workshop Export" or "JamOut" may serve better
  for discoverability).
- Final default for "current viewport" mode – ship if cheap (likely yes),
  otherwise roadmap.
- Vote rendering convention in text formats: `(3 votes)` vs `[+++]` vs
  `★3` – test with users.
