import { h, Fragment } from 'preact'
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks'
import { Banner, Button, Divider, Toggle } from '@create-figma-plugin/ui'
import { IconWarning16 } from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import type { SelectionMode, Format, RenderOpts, PluginSettings, ExportIR, ExportItem, ExportSection } from '../types'
import type {
  ClosePluginHandler,
  LoadSettingsRequestHandler,
  PageChangedHandler,
  ResizeWindowHandler,
  SaveSettingsHandler,
  SelectionChangedHandler,
  SettingsLoadedHandler,
  ViewportChangedHandler,
} from '../events'
import { renderPlaintext } from './renderers/plaintext'
import { renderMarkdown } from './renderers/markdown'
import { renderMarkdownAi } from './renderers/markdown-ai'
import { renderCsv } from './renderers/csv'
import { useExtraction } from './hooks/useExtraction'
import { guardReducer, INITIAL_GUARD_STATE, shouldAutoExtract } from './autoExtractGuard'
import { useClipboard } from './hooks/useClipboard'
import { ModePicker } from './components/ModePicker'
import { FormatPicker } from './components/FormatPicker'
import { SettingsPopover } from './components/SettingsPopover'
import { PreviewPanel } from './components/PreviewPanel'
import { ActionButtons } from './components/ActionButtons'
import { AboutView } from './components/AboutView'
import { Toast } from './components/Toast'

// ─── helpers ───────────────────────────────────────────────────────────────

function renderOutput(
  ir: Parameters<typeof renderMarkdown>[0] | null,
  format: Format,
  opts: RenderOpts
): string {
  if (!ir) return ''
  switch (format) {
    case 'plaintext': return renderPlaintext(ir, opts)
    case 'markdown':  return opts.aiOptimized ? renderMarkdownAi(ir, opts) : renderMarkdown(ir, opts)
    case 'csv':       return renderCsv(ir, opts)
  }
}

function countItems(ir: Parameters<typeof renderMarkdown>[0]): number {
  const { stickies, text, shapes, tables, codes } = ir.meta.counts
  return stickies + text + shapes + tables + codes
}

function fileExtension(format: Format): string {
  if (format === 'csv') return 'csv'
  if (format === 'plaintext') return 'txt'
  return 'md'
}

function mimeType(format: Format): string {
  if (format === 'csv') return 'text/csv'
  if (format === 'plaintext') return 'text/plain'
  return 'text/markdown'
}

function safeFilename(ir: Parameters<typeof renderMarkdown>[0], format: Format): string {
  const page = ir.meta.pageName
    .replace(/[^a-z0-9_\-]/gi, '_')
    .toLowerCase()
    .replace(/_+/g, '_')
    .replace(/^[_\-]+|[_\-]+$/g, '') || 'export'
  return `${page}.${fileExtension(format)}`
}

// ─── result state ───────────────────────────────────────────────────────────

/**
 * Single source of truth for the live extraction result. All result-derived
 * UI (preview text, stat pills, state banner, button enabled-state) is derived
 * from this value so they always agree with each other.
 */
type LiveResult =
  | { kind: 'idle' }                              // no extraction run yet
  | { kind: 'loading' }                           // extraction in flight
  | { kind: 'has-content'; ir: ExportIR; rendered: string }  // real content ready
  | { kind: 'empty';   message: string }          // ran fine, found nothing (calm)
  | { kind: 'error';   message: string }          // unexpected failure (warning)

/**
 * Mode-correct message for an empty extraction result.
 * Each message names the fix appropriate to the active mode — never suggests
 * actions that are irrelevant (e.g. "select a section" in selection mode).
 */
const EMPTY_MESSAGES: Record<SelectionMode, string> = {
  page:      'This page is empty. There is nothing to export yet.',
  viewport:  'Nothing in view. Pan or zoom to the content you want to export.',
  selection: 'Nothing selected. Select stickies, text, or sections on the board.',
}

// ─── stat helpers (used by the result-zone status header) ──────────────────

function sumVotes(items: ExportItem[]): number {
  return items.reduce((n, i) => n + (i.votes ?? 0), 0)
}

function countVotesInIR(ir: ExportIR): number {
  function walk(sections: ExportSection[]): number {
    return sections.reduce((n, s) => n + sumVotes(s.items) + walk(s.children), 0)
  }
  return sumVotes(ir.orphans) + walk(ir.sections)
}

type Stat = { value: number; label: string }

function buildStats(ir: ExportIR): Stat[] {
  const c = ir.meta.counts
  const votes = countVotesInIR(ir)
  return [
    { value: c.sections, label: c.sections === 1 ? 'section' : 'sections' },
    { value: c.stickies, label: c.stickies === 1 ? 'sticky' : 'stickies' },
    { value: c.text,     label: 'text' },
    { value: c.shapes,   label: c.shapes === 1 ? 'shape' : 'shapes' },
    { value: c.tables,   label: c.tables === 1 ? 'table' : 'tables' },
    { value: c.codes,    label: c.codes === 1 ? 'code block' : 'code blocks' },
    { value: votes,      label: votes === 1 ? 'vote' : 'votes' },
  ].filter(s => s.value > 0)
}

const SKELETON_BADGE_WIDTHS = [72, 88, 52, 64]

// ─── constants ─────────────────────────────────────────────────────────────

/**
 * Debounce delay (ms) before triggering auto-extract when inputs change.
 *
 * Viewport mode uses a longer debounce that outlasts the sandbox's 500 ms
 * viewport-bounds polling interval. With a shorter debounce, sustained panning
 * fires VIEWPORT_CHANGED faster than the debounce resets, so extract runs once
 * per poll and locks the single-threaded Plugin API during the pan. 600 ms
 * means the debounce always resets before the next poll arrives, so extract
 * only runs once the user stops moving the canvas.
 *
 * Page and selection modes receive discrete, user-driven events (no polling),
 * so the snappier 300 ms feels responsive without thrashing.
 */
const AUTO_EXTRACT_DEBOUNCE_MS: Record<SelectionMode, number> = {
  page: 300,
  selection: 300,
  viewport: 600,
}

/** Fixed panel width — Figma plugin width never changes. */
const PANEL_WIDTH = 400

/**
 * Window height when the preview is visible. The preview text area fills
 * the space between the result header and the sticky footer.
 */
const EXPANDED_HEIGHT = 640

/**
 * Floor for window height in compact (preview-off) mode so the window never
 * becomes awkwardly tiny even on the minimal idle state.
 */
const COMPACT_MIN_HEIGHT = 200

/**
 * Ceiling for compact-mode window height (safety clamp; in practice the
 * measured content height stays well below this).
 */
const COMPACT_MAX_HEIGHT = 480

/**
 * Belt-and-suspenders padding added to the measured scrollHeight before
 * clamping, so minor sub-pixel rounding never triggers a transient scrollbar.
 */
const COMPACT_HEIGHT_BUFFER = 4

export function App() {
  // ── core state ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<SelectionMode>('page')
  const [format, setFormat] = useState<Format>('markdown')
  const [view, setView] = useState<'exporter' | 'about'>('exporter')

  // ── settings (persisted) ──────────────────────────────────────────────────
  const [includeVotes, setIncludeVotes] = useState(true)
  const [includeSections, setIncludeSections] = useState(true)
  const [csvExpandTables, setCsvExpandTables] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [includeAuthors, setIncludeAuthors] = useState(false)
  const [aiOptimized, setAiOptimized] = useState(true)
  const [settingsReady, setSettingsReady] = useState(false)

  // ── transient UI state ────────────────────────────────────────────────────
  /** Text currently shown in the overlaid success toast. Null = hidden. */
  const [toastText, setToastText] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Ref on the root element; used to measure compact content height for window resize. */
  const containerRef = useRef<HTMLDivElement>(null)
  /**
   * Slow-scope guard (see autoExtractGuard.ts). `guard.slow[mode]` suppresses
   * auto-extract for a scope whose last extraction was over budget;
   * `guard.awaitingManual` is true only when an auto-extract was actually
   * skipped, and is the one thing that swaps the preview for the
   * "Generate preview" prompt. A result already on screen is never hidden
   * just because it was slow to produce.
   */
  const [guard, dispatchGuard] = useReducer(guardReducer, INITIAL_GUARD_STATE)
  /**
   * Incremented by SELECTION_CHANGED / VIEWPORT_CHANGED listeners so the
   * auto-extract effect re-runs when the relevant canvas state changes.
   * Does NOT clear slow flags (per-pan / per-selection thrash would be bad).
   */
  const [selectionRevision, setSelectionRevision] = useState(0)

  const { ir, loading, error, extract: runExtraction, reset: resetExtraction } = useExtraction()

  /** Every extraction goes through here so a fresh result always clears the manual prompt. */
  function extract(...args: Parameters<typeof runExtraction>) {
    dispatchGuard({ type: 'extract-started' })
    runExtraction(...args)
  }

  /** Records an auto/manual extraction's round trip against the budget. */
  function recordTiming(scope: SelectionMode, elapsedMs: number) {
    dispatchGuard({ type: 'extract-timed', mode: scope, elapsedMs })
  }
  const { clipError, writeText } = useClipboard()

  // ── toast helper ──────────────────────────────────────────────────────────
  // Replaces/refreshes the toast on rapid triggers; auto-dismisses after 2 s.
  function showToast(text: string) {
    if (toastTimerRef.current !== null) clearTimeout(toastTimerRef.current)
    setToastText(text)
    toastTimerRef.current = setTimeout(() => {
      setToastText(null)
      toastTimerRef.current = null
    }, 2000)
  }

  // ── load settings from clientStorage once on mount ────────────────────────
  useEffect(() => {
    const off = on<SettingsLoadedHandler>('SETTINGS_LOADED', (s, hasSelection) => {
      setIncludeVotes(s.includeVotes)
      setIncludeSections(s.includeSections)
      setCsvExpandTables(s.csvExpandTables)
      setShowPreview(s.showPreview)
      setIncludeAuthors(s.includeAuthors)
      setAiOptimized(s.aiOptimized)
      if (hasSelection) setMode('selection')
      setSettingsReady(true)
      off()
    })
    emit<LoadSettingsRequestHandler>('LOAD_SETTINGS_REQUEST')
    return off
  }, [])

  // ── selection-change listener ─────────────────────────────────────────────
  // Bump selectionRevision whenever the canvas selection changes. This is a
  // dep of the auto-extract effect, so changing the selection in Figma
  // retriggers the debounce (relevant for 'selection' mode).
  useEffect(() => {
    return on<SelectionChangedHandler>('SELECTION_CHANGED', () => {
      if (mode === 'selection') {
        setSelectionRevision((r) => r + 1)
      }
    })
  }, [mode])
  // ── page-change listener ────────────────────────────────────────────────────────
  // Navigating between FigJam pages does not fire selectionchange, so we
  // listen for PAGE_CHANGED specifically. Page navigation also clears all
  // slow-scope flags: a new page is a new ball game, and stale per-scope
  // backoff from the previous page shouldn't carry over.
  useEffect(() => {
    return on<PageChangedHandler>('PAGE_CHANGED', () => {
      dispatchGuard({ type: 'page-changed' })
      if (mode === 'page' || mode === 'viewport') {
        setSelectionRevision((r) => r + 1)
      }
    })
  }, [mode])

  // ── viewport-change listener ──────────────────────────────────────────────────
  // Emitted by a 500 ms polling loop in main.ts (no native API event exists).
  // Only reacts when mode is 'viewport'; panning has no effect on other modes.
  useEffect(() => {
    return on<ViewportChangedHandler>('VIEWPORT_CHANGED', () => {
      if (mode === 'viewport') {
        setSelectionRevision((r) => r + 1)
      }
    })
  }, [mode])
  // ── persist settings whenever they change (after initial load) ────────────
  useEffect(() => {
    if (!settingsReady) return
    const settings: PluginSettings = {
      includeVotes, includeSections, csvExpandTables, showPreview, includeAuthors, aiOptimized,
    }
    emit<SaveSettingsHandler>('SAVE_SETTINGS', settings)
  }, [includeVotes, includeSections, csvExpandTables, showPreview, includeAuthors, aiOptimized, settingsReady])

  // ── auto-extract (debounced) ──────────────────────────────────────────────
  //
  // Fires whenever IR-affecting inputs change (mode, scope state). Format and
  // render options are intentionally NOT deps: the renderers consume them
  // reactively via useMemo, so toggling format / includeVotes / etc. updates
  // the preview without re-walking the tree.
  //
  // Per-scope backoff: if the last extraction for this scope was over budget,
  // the scope's slow flag suppresses auto-extract. Skipping clears the now
  // out-of-date result (so Copy/Enter can't copy stale content) and shows the
  // manual "Generate preview" prompt. Entering a mode (mode itself changed, not
  // selectionRevision) grants one fresh attempt by clearing that scope's flag.
  const prevModeRef = useRef<SelectionMode>(mode)
  useEffect(() => {
    if (!settingsReady) return

    const modeJustChanged = prevModeRef.current !== mode
    prevModeRef.current = mode

    if (!shouldAutoExtract(guard, mode, modeJustChanged)) {
      resetExtraction()
      dispatchGuard({ type: 'auto-skipped' })
      return
    }
    // selectionRevision bumps (pan / selection change) do NOT clear the flag.
    if (modeJustChanged) dispatchGuard({ type: 'mode-entered', mode })

    let cancelled = false

    const timer = setTimeout(() => {
      if (cancelled) return
      extract(mode, (_ir, elapsedMs) => recordTiming(mode, elapsedMs))
    }, AUTO_EXTRACT_DEBOUNCE_MS[mode])

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, settingsReady, selectionRevision])

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  //
  // The keydown listener is registered once, so it must not close over render
  // state directly (it would keep reading the preview, format and options from
  // whichever render registered it). Instead it calls through a ref that is
  // pointed at this render's handlePrimaryCopy every time the component renders.
  const primaryCopyRef = useRef(handlePrimaryCopy)
  primaryCopyRef.current = handlePrimaryCopy

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        // Enter always triggers the primary Copy action.
        // In preview-on mode: copies the already-extracted output.
        // In preview-off mode: extracts then copies in one step.
        primaryCopyRef.current()
      }
      if (e.key === 'Escape') {
        emit<ClosePluginHandler>('CLOSE_PLUGIN')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const opts: RenderOpts = { includeVotes, includeSections, csvExpandTables, includeAuthors, aiOptimized }

  /** True when auto-extract was skipped and the user must ask for a preview. */
  const awaitingManual = guard.awaitingManual

  /**
   * Single source of truth for the live extraction result.
   * Every result-derived UI element (preview, pills, banner, button state) is
   * derived from this value so they always agree — no partial updates.
   */
  const liveResult = useMemo((): LiveResult => {
    if (loading) return { kind: 'loading' }
    if (error)   return { kind: 'error', message: error }
    if (ir === null) return { kind: 'idle' }
    if (countItems(ir) === 0) return { kind: 'empty', message: EMPTY_MESSAGES[mode] }
    return { kind: 'has-content', ir, rendered: renderOutput(ir, format, opts) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, ir, mode, format, aiOptimized, includeVotes, includeSections, csvExpandTables, includeAuthors])

  // ── window resize ─────────────────────────────────────────────────────────
  //
  // Two-mode approach: EXPANDED_HEIGHT when preview is shown (preview text area
  // fills available space via flex-1); compact/measured height when preview is
  // hidden (window hugs its content, no dead gap).
  //
  // Compact height is measured from the DOM (containerRef.scrollHeight) so it
  // automatically accommodates varying result-header heights (pills vs. error
  // banner) without magic numbers. useLayoutEffect runs synchronously after DOM
  // mutations and before the browser paints, so the resize request is sent
  // before any transient-overflow frame can appear.
  //
  // The large-board fallback is treated as compact: the preview text area is
  // absent, so the window should be small regardless of showPreview.
  useLayoutEffect(() => {
    if (!settingsReady) return
    // About view sizes to its own content, independent of exporter state.
    // Use EXPANDED_HEIGHT as the ceiling so the full panel is never clipped.
    if (view === 'about') {
      const h = containerRef.current?.scrollHeight ?? COMPACT_MIN_HEIGHT
      const clamped = Math.max(COMPACT_MIN_HEIGHT, Math.min(EXPANDED_HEIGHT, h + COMPACT_HEIGHT_BUFFER))
      emit<ResizeWindowHandler>('RESIZE_WINDOW', { width: PANEL_WIDTH, height: clamped })
      return
    }
    const isExpandedNow = showPreview && !awaitingManual
    if (isExpandedNow) {
      emit<ResizeWindowHandler>('RESIZE_WINDOW', { width: PANEL_WIDTH, height: EXPANDED_HEIGHT })
    } else {
      const h = containerRef.current?.scrollHeight ?? COMPACT_MIN_HEIGHT
      const clamped = Math.max(COMPACT_MIN_HEIGHT, Math.min(COMPACT_MAX_HEIGHT, h + COMPACT_HEIGHT_BUFFER))
      emit<ResizeWindowHandler>('RESIZE_WINDOW', { width: PANEL_WIDTH, height: clamped })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, awaitingManual, liveResult.kind, settingsReady, view])

  // ── preview-on actions (IR already exists from auto-extract) ─────────────

  async function handleCopy() {
    if (liveResult.kind !== 'has-content') return
    const ok = await writeText(liveResult.rendered)
    if (ok) showToast('Copied to clipboard')
  }

  function handleDownload() {
    if (liveResult.kind !== 'has-content') return
    const { ir: contentIr, rendered } = liveResult
    const filename = safeFilename(contentIr, format)
    const blob = new Blob([rendered], { type: mimeType(format) })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Downloaded ${filename}`)
  }

  // ── preview-off actions (extract then act in one step) ────────────────────

  function handleCopyAction() {
    if (loading) return
    extract(mode, async (freshIr) => {
      if (countItems(freshIr) === 0) return  // state banner will show; nothing to copy
      const freshRendered = renderOutput(freshIr, format, opts)
      const ok = await writeText(freshRendered)
      if (ok) showToast('Copied to clipboard')
    })
  }

  function handleDownloadAction() {
    if (loading) return
    extract(mode, (freshIr) => {
      if (countItems(freshIr) === 0) return  // nothing to download; state banner shows
      const freshRendered = renderOutput(freshIr, format, opts)
      const filename = safeFilename(freshIr, format)
      const blob = new Blob([freshRendered], { type: mimeType(format) })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      showToast(`Downloaded ${filename}`)
    })
  }

  // ── shared primary Copy (used by keyboard shortcut) ───────────────────────

  function handlePrimaryCopy() {
    if (showPreview) {
      handleCopy()
    } else {
      handleCopyAction()
    }
  }

  // ── manual "Generate preview" trigger (slow-scope guard bypass) ───────────
  //
  // Starting the extraction clears the prompt, and the generated preview stays
  // on screen however long it took. The measured time only decides whether the
  // NEXT scope change auto-extracts (under budget) or prompts again (over).
  function handleGeneratePreview() {
    extract(mode, (_ir, elapsedMs) => recordTiming(mode, elapsedMs))
  }

  // preview-off: buttons always enabled (fresh extract on click)
  // preview-on: enabled only when there is real content
  const hasContent = !showPreview || liveResult.kind === 'has-content'

  // isExpanded drives both the outer layout class and the resize effect.
  // The large-board fallback is treated as compact even when showPreview is on,
  // since the preview text area is absent.
  // The About view is always compact — no expanded layout when browsing About.
  const isExpanded = view === 'exporter' && showPreview && !awaitingManual

  // ── preview status dot ────────────────────────────────────────────────────
  // State derives from liveResult so it always agrees with the rest of the UI.
  // has-content → green/live (gentle 2 s pulse)
  // loading     → amber/updating (quicker pulse; resolves when extract lands)
  // idle/empty/error → grey/no-content (static)
  const previewDotColor =
    liveResult.kind === 'has-content' ? '#1a7a50'
    : liveResult.kind === 'loading'   ? '#c47400'
    : 'var(--figma-color-text-disabled)'
  const previewDotClass =
    liveResult.kind === 'has-content' ? 'status-dot-live'
    : liveResult.kind === 'loading'   ? 'status-dot-updating'
    : ''
  const previewDotLabel =
    liveResult.kind === 'has-content' ? 'live'
    : liveResult.kind === 'loading'   ? 'updating'
    : 'no content'

  return (
    <div ref={containerRef} class={isExpanded ? 'flex h-screen flex-col' : 'flex flex-col'}>

      {view === 'about' ? (
        <AboutView onBack={() => setView('exporter')} />
      ) : (
        <Fragment>
      {/* ── fixed inputs section ───────────────────────────────────────────
           flex-shrink-0 keeps this section at natural height in expanded mode
           so the preview text area below can claim the remaining flex-1 space.
           In compact mode the outer div has no height constraint, so this
           section determines window height (measured via containerRef).
      ────────────────────────────────────────────────────────────────────── */}
      <div class="flex flex-shrink-0 flex-col gap-3 py-4">
        <ModePicker value={mode} onValueChange={setMode} />
        <FormatPicker
          value={format}
          onValueChange={(v) => setFormat(v)}
          aiOptimized={aiOptimized}
          onAiOptimizedChange={setAiOptimized}
        />

        {/* Clipboard error — persistent inline warning (rare; clipboard API failure) */}
        {clipError && (
          <div class="px-3">
            <Banner icon={<IconWarning16 />} variant="warning">
              {clipError}
            </Banner>
          </div>
        )}

        {/* Full-bleed zone divider: separates inputs (mode/format) from preview controls. */}
        <Divider />

        {/* Preview + settings row: Show preview toggle left, Options gear button right */}
        <div class="flex items-center px-3">
          <Toggle value={showPreview} onValueChange={setShowPreview}>
            Show preview
          </Toggle>
          <div class="ml-auto">
            <SettingsPopover
              format={format}
              includeVotes={includeVotes}
              includeSections={includeSections}
              csvExpandTables={csvExpandTables}
              includeAuthors={includeAuthors}
              onIncludeVotesChange={setIncludeVotes}
              onIncludeSectionsChange={setIncludeSections}
              onCsvExpandTablesChange={setCsvExpandTables}
              onIncludeAuthorsChange={setIncludeAuthors}
            />
          </div>
        </div>

        {/* ── result zone header ─────────────────────────────────────────────
             Always visible, independent of Show preview toggle. Show preview
             hides ONLY the text area below; the header is a sibling, not a child.

             idle        → hidden (clean initial load, avoids phantom gap).
             loading     → skeleton badge placeholders.
             has-content → stat pills (scope at a glance; visible even preview-off).
             empty       → quiet muted text.
             error       → Banner + Retry; earns the weight because action needed. */}
        {liveResult.kind !== 'idle' && (
          <div class="px-2">
            {liveResult.kind === 'loading' && (
              <div class="flex flex-wrap gap-1 px-1 py-0.5">
                {SKELETON_BADGE_WIDTHS.map((w, i) => (
                  <span
                    key={i}
                    class="inline-block animate-pulse rounded-[3px] bg-[var(--figma-color-border)]"
                    style={{ width: w, height: 18 }}
                  />
                ))}
              </div>
            )}
            {liveResult.kind === 'has-content' && (
              <div class="flex flex-wrap gap-1 px-1 py-0.5">
                {buildStats(liveResult.ir).map(({ value, label }) => (
                  <span
                    key={label}
                    class="inline-flex items-baseline gap-[3px] rounded-[3px] border border-[var(--figma-color-border)] bg-[var(--figma-color-bg-secondary)] px-[6px] py-[2px] text-[11px] leading-none"
                  >
                    <span class="font-semibold text-[var(--figma-color-text)]">{value}</span>
                    <span class="text-[var(--figma-color-text-secondary)]">{label}</span>
                  </span>
                ))}
              </div>
            )}
            {liveResult.kind === 'empty' && (
              <p class="px-1 py-0.5 text-[11px] text-[var(--figma-color-text-secondary)]">
                {liveResult.message}
              </p>
            )}
            {liveResult.kind === 'error' && (
              <div class="flex flex-col gap-2">
                <Banner icon={<IconWarning16 />} variant="warning">
                  {liveResult.message}
                </Banner>
                <Button onClick={handlePrimaryCopy} secondary fullWidth>
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── preview text area ──────────────────────────────────────────────
           Only this section is gated by showPreview. flex-1 + min-h-0 lets it
           fill all remaining space between the inputs section and the footer.
           The bordered frame with a header strip makes the region intentional.

           Large-board fallback: shown when showPreview is on but the board
           exceeded the auto-extract threshold. Treated as compact (no flex-1).
      ────────────────────────────────────────────────────────────────────── */}
      {showPreview && awaitingManual && (
        <div class="flex flex-shrink-0 flex-col gap-2 px-2 pb-3">
          <Banner icon={<IconWarning16 />} variant="warning">
            Large board — auto-preview skipped. Click to generate once.
          </Banner>
          <Button onClick={handleGeneratePreview} secondary fullWidth disabled={loading}>
            Generate preview
          </Button>
        </div>
      )}
      {isExpanded && (
        <div class="flex min-h-0 flex-1 flex-col px-2 pb-3">
          {/* Bordered preview frame */}
          <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-[var(--figma-color-border)]">
            {/* Header strip: "Preview" title + state-driven status dot, left-aligned.
                 Dot states: green/live (has-content), amber/updating (loading),
                 grey/no-content (idle | empty | error). Animations in input.css;
                 suspended automatically via @media (prefers-reduced-motion: reduce). */}
            <div class="flex flex-shrink-0 items-center gap-[5px] border-b border-[var(--figma-color-border)] bg-[var(--figma-color-bg-secondary)] px-2 py-[3px]">
              <span class="text-[10px] font-medium text-[var(--figma-color-text-secondary)]">Preview</span>
              <span class="text-[10px] text-[var(--figma-color-text-disabled)]">·</span>
              <span
                class={`h-[6px] w-[6px] flex-shrink-0 rounded-full ${previewDotClass}`}
                style={{ background: previewDotColor }}
              />
              <span class="text-[10px] text-[var(--figma-color-text-disabled)]">{previewDotLabel}</span>
            </div>
            {/* Preview text fills remaining height */}
            <PreviewPanel
              content={liveResult.kind === 'has-content' ? liveResult.rendered : ''}
              loading={liveResult.kind === 'loading'}
              format={format}
            />
          </div>
        </div>
      )}

      {/* ── sticky footer ──────────────────────────────────────────────────
           flex-shrink-0 keeps the footer anchored regardless of content height.
      ────────────────────────────────────────────────────────────────────── */}
      <div class="flex-shrink-0">
        <Divider />
        <ActionButtons
          showPreview={showPreview}
          onCopy={showPreview ? handleCopy : handleCopyAction}
          onDownload={showPreview ? handleDownload : handleDownloadAction}
          onOpenAbout={() => setView('about')}
          loading={loading}
          hasContent={hasContent}
        />
      </div>

      {/* Success toast — fixed overlay; bottom-[60px] clears the ~53 px footer */}
      <Toast text={toastText} />
        </Fragment>
      )}
    </div>
  )
}

