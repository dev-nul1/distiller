import { h, Fragment } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { Banner, Button, Divider, Toggle } from '@create-figma-plugin/ui'
import { IconWarning16 } from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import type { SelectionMode, Format, RenderOpts, PluginSettings, ExportIR, ExportItem, ExportSection } from '../types'
import type {
  ClosePluginHandler,
  LoadSettingsRequestHandler,
  NodeCountRequestHandler,
  NodeCountResponseHandler,
  PageChangedHandler,
  ResizeWindowHandler,
  SaveSettingsHandler,
  SelectionChangedHandler,
  SettingsLoadedHandler,
  ViewportChangedHandler,
} from '../events'
import { renderPlaintext } from './renderers/plaintext'
import { renderMarkdown } from './renderers/markdown'
import { renderLlm } from './renderers/llm'
import { renderCsv } from './renderers/csv'
import { useExtraction } from './hooks/useExtraction'
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
    case 'markdown':  return renderMarkdown(ir, opts)
    case 'llm':       return renderLlm(ir, opts)
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
  section:   'No sections selected. Select one or more sections, then they\'ll appear here.',
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

/** Debounce delay (ms) before triggering auto-extract when inputs change. */
const AUTO_EXTRACT_DEBOUNCE_MS = 300

/**
 * If the node count in scope exceeds this threshold, skip auto-extract and
 * show a manual "Generate preview" prompt instead. Prevents debounced
 * auto-extract from blocking the single-threaded Plugin API on large boards.
 */
const AUTO_EXTRACT_NODE_THRESHOLD = 2000

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
  const [settingsReady, setSettingsReady] = useState(false)

  // ── transient UI state ────────────────────────────────────────────────────
  /** Text currently shown in the overlaid success toast. Null = hidden. */
  const [toastText, setToastText] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Ref on the root element; used to measure compact content height for window resize. */
  const containerRef = useRef<HTMLDivElement>(null)
  /** True when auto-extract was skipped because the node count exceeds AUTO_EXTRACT_NODE_THRESHOLD. */
  const [isBoardTooLarge, setIsBoardTooLarge] = useState(false)
  /**
   * Incremented by the SELECTION_CHANGED listener so the auto-extract effect
   * re-runs whenever the canvas selection changes (relevant for 'selection' and
   * 'section' modes).
   */
  const [selectionRevision, setSelectionRevision] = useState(0)

  const { ir, loading, error, extract } = useExtraction()
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
  // retriggers the debounce (for 'selection' and 'section' modes).
  useEffect(() => {
    return on<SelectionChangedHandler>('SELECTION_CHANGED', () => {
      if (mode === 'selection' || mode === 'section') {
        setSelectionRevision((r) => r + 1)
      }
    })
  }, [mode])
  // ── page-change listener ────────────────────────────────────────────────────────
  // Navigating between FigJam pages does not fire selectionchange, so we
  // listen for PAGE_CHANGED specifically and bump for the page-scoped modes.
  useEffect(() => {
    return on<PageChangedHandler>('PAGE_CHANGED', () => {
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
      includeVotes, includeSections, csvExpandTables, showPreview, includeAuthors,
    }
    emit<SaveSettingsHandler>('SAVE_SETTINGS', settings)
  }, [includeVotes, includeSections, csvExpandTables, showPreview, includeAuthors, settingsReady])

  // ── auto-extract (debounced) ──────────────────────────────────────────────
  //
  // Fires whenever any extraction input changes (mode, format, settings, scope).
  // Runs regardless of showPreview so the status header always reflects current
  // scope — previously gated on showPreview, which left the header stale when
  // preview was off and mode/selection changed.
  useEffect(() => {
    if (!settingsReady) return

    // Reset large-board flag so the preview pane stops showing the manual prompt
    // while we re-evaluate.
    setIsBoardTooLarge(false)

    let cancelled = false

    const timer = setTimeout(() => {
      if (cancelled) return

      const offCount = on<NodeCountResponseHandler>('NODE_COUNT_RESPONSE', (count) => {
        offCount()
        if (cancelled) return
        if (count > AUTO_EXTRACT_NODE_THRESHOLD) {
          setIsBoardTooLarge(true)
        } else if (count !== -1) {
          // count === -1 means resolveRoots threw (e.g. no sections selected);
          // the extraction itself will surface the error, so skip it silently here.
          extract(mode)
        }
      })
      emit<NodeCountRequestHandler>('NODE_COUNT_REQUEST', mode)
    }, AUTO_EXTRACT_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, format, includeVotes, includeSections, includeAuthors, settingsReady, selectionRevision])

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        // Enter always triggers the primary Copy action.
        // In preview-on mode: copies the already-extracted output.
        // In preview-off mode: extracts then copies in one step.
        handlePrimaryCopy()
      }
      if (e.key === 'Escape') {
        emit<ClosePluginHandler>('CLOSE_PLUGIN')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, showPreview])   // re-register when mode or showPreview changes so closures are fresh

  const opts: RenderOpts = { includeVotes, includeSections, csvExpandTables, includeAuthors }

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
  }, [loading, error, ir, mode, format, includeVotes, includeSections, csvExpandTables, includeAuthors])

  // ── window resize ─────────────────────────────────────────────────────────
  //
  // Two-mode approach: EXPANDED_HEIGHT when preview is shown (preview text area
  // fills available space via flex-1); compact/measured height when preview is
  // hidden (window hugs its content, no dead gap).
  //
  // Compact height is measured from the DOM (containerRef.scrollHeight) so it
  // automatically accommodates varying result-header heights (pills vs. error
  // banner) without magic numbers. Debounced 50 ms to absorb rapid state
  // transitions (e.g. loading → has-content triggering two renders).
  //
  // The large-board fallback is treated as compact: the preview text area is
  // absent, so the window should be small regardless of showPreview.
  useEffect(() => {
    if (!settingsReady) return
    const isExpandedNow = showPreview && !isBoardTooLarge
    const timer = setTimeout(() => {
      if (isExpandedNow) {
        emit<ResizeWindowHandler>('RESIZE_WINDOW', { width: PANEL_WIDTH, height: EXPANDED_HEIGHT })
      } else {
        const h = containerRef.current?.scrollHeight ?? COMPACT_MIN_HEIGHT
        const clamped = Math.max(COMPACT_MIN_HEIGHT, Math.min(COMPACT_MAX_HEIGHT, h))
        emit<ResizeWindowHandler>('RESIZE_WINDOW', { width: PANEL_WIDTH, height: clamped })
      }
    }, 50)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, isBoardTooLarge, liveResult.kind, settingsReady, view])

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

  // ── manual "Generate preview" trigger (large-board guard bypass) ──────────

  function handleGeneratePreview() {
    setIsBoardTooLarge(false)
    extract(mode)
  }

  // preview-off: buttons always enabled (fresh extract on click)
  // preview-on: enabled only when there is real content
  const hasContent = !showPreview || liveResult.kind === 'has-content'

  // isExpanded drives both the outer layout class and the resize effect.
  // The large-board fallback is treated as compact even when showPreview is on,
  // since the preview text area is absent.
  // The About view is always compact — no expanded layout when browsing About.
  const isExpanded = view === 'exporter' && showPreview && !isBoardTooLarge

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
        <FormatPicker value={format} onValueChange={(v) => setFormat(v)} />

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
      {showPreview && isBoardTooLarge && (
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

