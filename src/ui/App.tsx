import { h } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { Banner, Button, Divider, Toggle } from '@create-figma-plugin/ui'
import { IconWarning16 } from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import type { SelectionMode, Format, RenderOpts, PluginSettings, ExportIR } from '../types'
import type {
  ClosePluginHandler,
  LoadSettingsRequestHandler,
  NodeCountRequestHandler,
  NodeCountResponseHandler,
  PageChangedHandler,
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
import { OptionsPanel } from './components/OptionsPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { ActionButtons } from './components/ActionButtons'
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
  const { stickies, text, shapes, tables } = ir.meta.counts
  return stickies + text + shapes + tables
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
  const page = ir.meta.pageName.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase()
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

// ─── constants ─────────────────────────────────────────────────────────────

/** Debounce delay (ms) before triggering auto-extract when inputs change. */
const AUTO_EXTRACT_DEBOUNCE_MS = 300

/**
 * If the node count in scope exceeds this threshold, skip auto-extract and
 * show a manual "Generate preview" prompt instead. Prevents debounced
 * auto-extract from blocking the single-threaded Plugin API on large boards.
 */
const AUTO_EXTRACT_NODE_THRESHOLD = 2000

// ─── component ─────────────────────────────────────────────────────────────
//
// TODO (future): auto-resize the plugin window to fit content.
// @create-figma-plugin/ui exports `useWindowResize` which:
//   - renders a drag handle in the webview so users can resize manually
//   - returns `setWindowSize({ width, height })` for programmatic resize
// Pair it with a `ResizeObserver` on `document.body`:
//   const setWindowSize = useWindowResize(
//     ({ width, height }) => emit<ResizeWindowHandler>('RESIZE_WINDOW', { width, height }),
//     { minHeight: 380, maxHeight: 720, resizeDirection: 'vertical' }  // width stays fixed
//   )
//   useEffect(() => {
//     const ro = new ResizeObserver(() =>
//       setWindowSize({ height: document.body.scrollHeight })
//     )
//     ro.observe(document.body)
//     return () => ro.disconnect()
//   }, [setWindowSize])
// Also needs: ResizeWindowHandler in events.ts +
//   on('RESIZE_WINDOW', ({w,h}) => figma.ui.resize(w,h)) in main.ts.
// Width stays fixed at 400 — only height resize is desirable here.

export function App() {
  // ── core state ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<SelectionMode>('page')
  const [format, setFormat] = useState<Format>('markdown')

  // ── settings (persisted) ──────────────────────────────────────────────────
  const [includeVotes, setIncludeVotes] = useState(true)
  const [includeSections, setIncludeSections] = useState(true)
  const [csvExpandTables, setCsvExpandTables] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [includeAuthors, setIncludeAuthors] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [settingsReady, setSettingsReady] = useState(false)

  // ── transient UI state ────────────────────────────────────────────────────
  /** Text currently shown in the overlaid success toast. Null = hidden. */
  const [toastText, setToastText] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  // ── auto-extract (debounced, preview-on only) ─────────────────────────────
  //
  // Fires whenever any extraction input changes while preview is visible.
  // Before starting extraction, requests a node count from the sandbox; if the
  // count exceeds AUTO_EXTRACT_NODE_THRESHOLD we show a manual prompt instead
  // to avoid blocking the single-threaded Plugin API on pathological boards.
  useEffect(() => {
    if (!showPreview || !settingsReady) return

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
  }, [mode, format, includeVotes, includeSections, includeAuthors, showPreview, settingsReady, selectionRevision])

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

  // ── render ────────────────────────────────────────────────────────────────
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

  return (
    <div class="flex flex-col gap-3 py-4">
      <ModePicker value={mode} onValueChange={setMode} />
      <FormatPicker value={format} onValueChange={(v) => setFormat(v)} />
      <Divider />
      <OptionsPanel
        open={optionsOpen}
        onToggle={() => setOptionsOpen((o) => !o)}
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

      {/* Error state — unexpected failure, warm warning banner + Retry */}
      {liveResult.kind === 'error' && (
        <div class="flex flex-col gap-2 px-2">
          <Banner icon={<IconWarning16 />} variant="warning">
            {liveResult.message}
          </Banner>
          <Button onClick={handlePrimaryCopy} secondary fullWidth>
            Retry
          </Button>
        </div>
      )}

      {/* Empty state — calm informational message, mode-correct copy */}
      {liveResult.kind === 'empty' && (
        <div class="px-2">
          <div class="rounded-[3px] bg-[var(--figma-color-bg-secondary)] px-3 py-2 text-[11px] text-[var(--figma-color-text-secondary)]">
            {liveResult.message}
          </div>
        </div>
      )}

      {/* Clipboard error — persistent inline warning (rare; clipboard API failure) */}
      {clipError && (
        <div class="px-2">
          <Banner icon={<IconWarning16 />} variant="warning">
            {clipError}
          </Banner>
        </div>
      )}

      {/* Preview area — toggle is grouped with the pane it controls */}
      <div class="px-2">
        <Toggle value={showPreview} onValueChange={setShowPreview}>
          Show preview
        </Toggle>
      </div>
      {showPreview && (
        isBoardTooLarge ? (
          <div class="flex flex-col gap-2 px-2">
            <Banner icon={<IconWarning16 />} variant="warning">
              Large board — auto-preview skipped. Click to generate once.
            </Banner>
            <Button onClick={handleGeneratePreview} secondary fullWidth disabled={loading}>
              Generate preview
            </Button>
          </div>
        ) : (
          <PreviewPanel
            content={liveResult.kind === 'has-content' ? liveResult.rendered : ''}
            ir={liveResult.kind === 'has-content' ? liveResult.ir : null}
            loading={liveResult.kind === 'loading'}
            format={format}
          />
        )
      )}

      <div class="flex-1" />
      <Divider />
      <ActionButtons
        showPreview={showPreview}
        onCopy={showPreview ? handleCopy : handleCopyAction}
        onDownload={showPreview ? handleDownload : handleDownloadAction}
        loading={loading}
        hasContent={hasContent}
      />

      {/* Success toast — overlaid, no layout shift */}
      <Toast text={toastText} />
    </div>
  )
}

