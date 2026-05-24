# Distiller – FigJam Exporter · Roadmap

**Status:** post-v1, actively maintained  
**Companion to:** `PRD.md`, `TECHNICAL.md`  
**Date:** 2026-05-21

Deferred features and future direction. Items here are explicitly out of v1 scope and kept so architectural decisions in v1 do not accidentally block them.

---

## v2 candidates (next release after v1)

### Color semantics for sticky notes

**The idea:** Sticky note color carries meaning in most workshops. Yellow = idea, pink = blocker, green = decision, etc. Capturing color and letting users map colors to categories or Jira issue types would be a real differentiator.

**Why deferred:** Needs mapping UX (color picker + label assignment), persistence of mappings across runs, and possibly per-workshop templates. That is a real feature on its own. Ship v1 first, see if users ask.

**Implementation sketch:** Extend `ExportItem` with `color?: string` (hex or named). Add a settings tab for color-to-label mapping. Renderers consume the mapping to produce categorized output (Markdown sections by category, CSV column for category, etc.).

---

### Stamps and emoji reactions

**The idea:** Stamps carry priority/reaction signal similar to votes but with more semantic range (thumbs-up, fire, question mark, warning). Capturing them adds another prioritization dimension.

**Why deferred:** Needs API verification (how are stamps exposed beyond `+1` counting?), needs mapping UX (which stamps count as positive signal?), and overlaps conceptually with the existing vote-counting approach.

**Implementation sketch:** Extend `ExportItem` with `stamps?: Record<string, number>` mapping stamp name to count. Renderers either inline them or roll up into a single "reactions" column in CSV.

---

### Connectors and relationships

**The idea:** Connectors in FigJam often represent real relationships: dependencies, cause-effect, sequence. For affinity diagrams, dependency mapping, or process flows, the connector graph is the content.

**Why deferred:** Different mental model from the tree-shaped IR. Needs a graph representation alongside the tree, plus renderer logic for at least two outputs (Markdown adjacency lists, Mermaid syntax). Worth a dedicated design pass.

**Implementation sketch:** Add a `relationships: Edge[]` array to the IR, with `Edge = { fromId, toId, label?, kind: 'connector' }`. Add a "Mermaid flowchart" output format. Markdown could render as an "Outbound:" or "Depends on:" list under each item.

---

### Spatial cluster detection

**The idea:** Facilitators often cluster stickies spatially (affinity diagrams, 2×2 matrices) without putting them in a section. v1 flattens these. A clustering pass could detect them and treat them as implicit groups.

**Why deferred:** Requires a real algorithm (DBSCAN or similar) and UX for naming detected clusters. Easy to get wrong, easy to surprise users.

**Implementation sketch:** Run a clustering pass on items in `orphans` after extraction. Surface detected clusters as a UI prompt: "Detected 4 spatial groups — name them?" Treat as sections downstream.

---

### Preview pane editing

**The idea:** Let the user reorder or exclude items in the preview pane before exporting. Drag-to-reorder would solve the "spatial ordering is not always right" v1 limitation.

**Why deferred:** Real UI work and real interaction design.

**Implementation sketch:** Make `PreviewPanel` editable. Track user reordering/exclusion as overlays on the IR. Apply overlays at render time without mutating the underlying IR.

---

### Saved export configurations

**The idea:** A facilitator who runs the same retro format weekly should be able to save "my retro export" with selection mode, format, and options preset.

**Why deferred:** Needs `figma.clientStorage` persistence for multiple named configs, settings UX (save/load/delete), and optional JSON export/import for sharing across a team.

**Implementation sketch:** `figma.clientStorage.setAsync('configs', ...)` keyed by config name. Settings tab with save/load/delete. Optional JSON export/import.

---

## v3+ ideas (further out)

### Direct Confluence / Jira integration

Skip the copy-paste step. Use Confluence/Jira APIs to push content directly.

**Significant scope:** OAuth flow, network access in the manifest (which triggers more scrutiny in Community review), credential storage, error handling for upstream API failures. Probably worth a separate companion plugin rather than bundling into Distiller.

### Real-time export during the workshop

A persistent FigJam widget that streams structured content to a configured destination as the workshop happens. Requires the widget API, not the plugin API — a different surface and a different UX model.

### Multi-page export

Export from multiple pages in one run. Straightforward conceptually but adds UI complexity: page picker, consistent naming in CSV, hierarchy across pages.

### Templates for common ceremonies

Built-in templates for retros, planning sessions, design sprints. Each template defines expected section names, color mappings, and a target output format.

---

## Things explicitly not planned

These have come up and are not on the roadmap:

- **AI summarization built into the plugin.** Users can already paste AI-optimized exports into Claude/ChatGPT. Bundling an LLM adds cost, latency, network access requirements, and review scrutiny without much marginal value.
- **Slack/Teams direct posting.** Similar reasoning to Confluence/Jira integration: scope creep, and those destination APIs change faster than a plugin should need to track.
- **Image OCR for screenshots or embedded images.** Out of scope.
- **Editing FigJam content from the plugin** (e.g., bulk-renaming stickies). Different problem space; would be a separate plugin.

---

## Decision principles for roadmap items

When evaluating whether to pull a roadmap item forward:

1. Does it require network access? If yes, weigh the Community review cost carefully.
2. Does it require user-side configuration (mappings, templates)? If yes, build the configuration UX as a reusable piece first.
3. Does it change the IR shape in a breaking way? If yes, version the IR or plan a migration.
4. Is it more useful than fixing the v1 known limitations (ordering heuristic, spatial clusters)? If no, fix limitations first.
