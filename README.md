# Distiller – FigJam Exporter

Turn any FigJam board into clean, AI-ready text, votes, sections, formatting and all.

Distiller is a FigJam plugin that reads the board you are looking at and gives you back tidy Markdown, plain text, or CSV, with a live preview and one-click copy or download. It is built for the moment after the workshop, when the sticky notes need to become a doc, a spreadsheet, or a prompt for an AI tool.

![Distiller in action: opening the plugin, the live preview, the options popover, and copying the export](docs/images/Distiller%20FigJam%20Exporter.gif)

![Distiller's About panel, showing the how-it-works steps and links](docs/images/Distiller%20about.png)

---

## What it does

Pick **what** to export, pick a **format**, refine a few options, then copy or download. The preview updates live as you go.

**Three export scopes**

| Scope | What it captures |
|---|---|
| Whole page | Every supported node on the current page |
| Current selection | Whatever is selected on the canvas |
| Current viewport | Top-level nodes visible in your current view |

**Three formats**

| Format | Best for |
|---|---|
| Markdown | Docs, wikis, and AI tools (headings, lists, tables, fenced code) |
| Plain text | Quick pastes into Slack, email, or notes (indented hierarchy, no syntax) |
| CSV | Spreadsheets (one row per item) |

**AI-optimized Markdown.** When the format is Markdown, an AI-optimized option (on by default) prepends a structured context header, the board name, timestamp, scope, a content summary, and which export settings were active, so an AI tool understands what it is reading before it hits the content.

**Refine the output.** A small set of toggles:

- **Votes** add the `+1` stamp counts next to the items that received them.
- **Section hierarchy** keeps the board's sections as headings (turn it off for a flat list).
- **Author names** attribute each sticky to its creator (off by default).
- **Expand tables** (CSV) writes one row per table cell.

Stickies, text, shapes with text, tables, and code blocks are all supported. The export runs entirely on your machine; the plugin makes no network requests.

![Distiller's options popover, showing the votes, section hierarchy, and author-name toggles](docs/images/Distiller%20options.png)

---

## Install and use (end users)

**Install:** from the [Figma Community](https://www.figma.com/community/plugin/1640887971843572997).

**Use** (this mirrors the in-plugin "How it works"):

1. **Choose what to export:** Whole page, Current selection, or Current viewport.
2. **Pick a format:** Markdown, Plain text, or CSV.
3. **Refine the output:** toggle votes, section hierarchy, and author names (and AI-optimized for Markdown).
4. **Copy or download:** send the result to your doc, spreadsheet, or AI chat.

---

## How it's built

Distiller is a TypeScript plugin built on `create-figma-plugin` (Preact + Tailwind). The design has a few deliberate load-bearing decisions:

- **Sandbox / UI split.** The sandbox (`src/main.ts`) is the only side that touches the Figma document: it resolves the scope, walks the tree, and produces a format-neutral intermediate representation (IR). The UI iframe consumes that IR and does everything else.
- **A format-neutral IR.** The IR decouples *reading the document* from *producing output*. Each renderer is a pure function over the IR, so adding a new format never touches extraction, and no renderer's syntax assumptions leak back into traversal.
- **Renderers run in the UI.** Traversal is the expensive, single-threaded part, so the document is read once into the IR; format and option changes then re-render from that IR without re-walking the board.
- **One live-result state model.** All result-derived UI (preview, stat pills, status banner, button state) is derived from a single `LiveResult` discriminated union in the same render, so the pieces cannot drift out of sync.

See [docs/TECHNICAL.md](docs/TECHNICAL.md) for the full technical design (message passing, the IR schema, the extraction pipeline, the ordering heuristic, and the renderers).

---

## Development

**Prerequisites:** Node.js and npm. (No Node version is pinned in `package.json`; the `create-figma-plugin` v4 toolchain is used to build.)

**Install:**

```bash
npm install
```

**Build** (CSS then the JS bundle):

```bash
npm run build
```

**Watch** (rebuild on change during development):

```bash
npm run watch
```

**Test** (Vitest):

```bash
npm test
```

Other scripts (`build:css`, `build:js`, `watch:css`, `watch:js`, `lint`) are defined in [package.json](package.json) if you need them individually.

**Load it in Figma:**

1. Run `npm run build` (or `npm run watch`) first. The build generates `manifest.json` and the `build/` bundles.
2. In the Figma **desktop app**, open a FigJam file and go to **Plugins → Development → Import plugin from manifest…**
3. Select the generated `manifest.json` at the repo root.

Generated files are gitignored and recreated by the build, so they will not be present on a fresh clone: `manifest.json` (generated from the `figma-plugin` field in `package.json`), `src/output.css`, the `build/` directory, and the `*.d.css.ts` / `*.css.d.ts` type stubs. Build before loading the plugin.

---

## Known limitations

Distiller follows a no-data-loss principle: when a format cannot represent something, the *styling* is dropped but the *text* is always preserved. The current trade-offs:

- **Bold is best-effort.** Detected via font weight `>= 700`, so Medium/Semibold (500–600) is not tagged bold.
- **Underline decoration is dropped.** The underlined text is always kept; the underline itself has no clean output equivalent.
- **Some rich text is simplified.** Nested lists are flattened to a single level; color, font size, and styling that changes mid-word are not represented.
- **Code in CSV is signposted, not embedded.** A CSV cell for a code block reads `[code block omitted – N lines; use Markdown export]`; use the Markdown format to get the actual code.
- **Spatial ordering is a heuristic.** Items are grouped into rows by vertical position then sorted left-to-right. This matches intent for most boards but can misorder dense collages or free-form arrangements.
- **Author names depend on visibility.** A name is exported only when the "author names" option is on *and* the sticky's author is visible in FigJam. Only stickies carry authorship; text, shapes, tables, and code blocks do not.

More detail lives in [docs/TECHNICAL.md](docs/TECHNICAL.md) and [docs/PRD.md](docs/PRD.md).

---

## Contributing, feedback, and support

This is an independent project built to fill a gap in FigJam's export tooling, so support is best-effort, but feedback is genuinely welcome.

- **Bug reports** and **feature requests:** open a [GitHub issue](https://github.com/dev-nul1/distiller/issues) using the templates ([bug report](https://github.com/dev-nul1/distiller/issues/new?template=bug_report.yml), [feature request](https://github.com/dev-nul1/distiller/issues/new?template=feature_request.yml)).
- **Questions or general feedback on GitHub:** use the [question / feedback template](https://github.com/dev-nul1/distiller/issues/new?template=question_feedback.yml).
- **Casual feedback off GitHub:** leave a comment on the [Figma Community page](https://www.figma.com/community/plugin/1640887971843572997).

---

## License

MIT. See [LICENSE](LICENSE).
