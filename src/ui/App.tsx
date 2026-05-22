import { h } from 'preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { Banner, Button, Divider, LoadingIndicator } from '@create-figma-plugin/ui'
import { IconApprovedCheckmark16, IconWarning16 } from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import type { SelectionMode, Format, RenderOpts, PluginSettings } from '../types'
import type {
  ClosePluginHandler,
  LoadSettingsRequestHandler,
  SaveSettingsHandler,
  SettingsLoadedHandler,
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
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [settingsReady, setSettingsReady] = useState(false)

  // ── transient UI state ────────────────────────────────────────────────────
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null)

  const { ir, loading, error, progress, extract } = useExtraction()
  const { copied, clipError, writeText } = useClipboard()

  // ── load settings from clientStorage once on mount ────────────────────────
  useEffect(() => {
    const off = on<SettingsLoadedHandler>('SETTINGS_LOADED', (s, hasSelection) => {
      setIncludeVotes(s.includeVotes)
      setIncludeSections(s.includeSections)
      setCsvExpandTables(s.csvExpandTables)
      setShowPreview(s.showPreview)
      if (hasSelection) setMode('selection')
      setSettingsReady(true)
      off()
    })
    emit<LoadSettingsRequestHandler>('LOAD_SETTINGS_REQUEST')
    return off
  }, [])

  // ── persist settings whenever they change (after initial load) ────────────
  useEffect(() => {
    if (!settingsReady) return
    const settings: PluginSettings = {
      includeVotes, includeSections, csvExpandTables, showPreview,
    }
    emit<SaveSettingsHandler>('SAVE_SETTINGS', settings)
  }, [includeVotes, includeSections, csvExpandTables, showPreview, settingsReady])

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        handleExtract()
      }
      if (e.key === 'Escape') {
        emit<ClosePluginHandler>('CLOSE_PLUGIN')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])   // re-register when mode changes so handleExtract closure is fresh

  // ── render ────────────────────────────────────────────────────────────────
  const opts: RenderOpts = { includeVotes, includeSections, csvExpandTables }

  const rendered = useMemo(
    () => renderOutput(ir, format, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ir, format, includeVotes, includeSections, csvExpandTables]
  )

  const isEmpty = ir !== null && countItems(ir) === 0

  function handleExtract() {
    extract(mode)
  }

  async function handleCopy() {
    if (!ir) return
    await writeText(rendered)
  }

  function handleDownload() {
    if (!ir) return
    const filename = safeFilename(ir, format)
    const blob = new Blob([rendered], { type: mimeType(format) })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setDownloadedFile(filename)
    setTimeout(() => setDownloadedFile(null), 2500)
  }

  const progressLabel =
    progress && progress.total > 0
      ? `Extracting… ${progress.processed}/${progress.total}`
      : 'Extracting…'

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
        showPreview={showPreview}
        onIncludeVotesChange={setIncludeVotes}
        onIncludeSectionsChange={setIncludeSections}
        onCsvExpandTablesChange={setCsvExpandTables}
        onShowPreviewChange={setShowPreview}
      />

      {/* Progress indicator */}
      {loading && (
        <div class="flex items-center gap-2 px-2">
          <LoadingIndicator />
          <span class="text-[11px] text-[var(--figma-color-text-secondary)]">
            {progressLabel}
          </span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div class="flex flex-col gap-2 px-2">
          <Banner icon={<IconWarning16 />} variant="warning">
            {error}
          </Banner>
          <Button onClick={handleExtract} secondary fullWidth>
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && isEmpty && (
        <div class="px-2">
          <Banner icon={<IconWarning16 />} variant="warning">
            No items found. Try a different mode or select a section.
          </Banner>
        </div>
      )}

      {/* Toasts */}
      {copied && (
        <div class="px-2">
          <Banner icon={<IconApprovedCheckmark16 />} variant="success">
            Copied to clipboard
          </Banner>
        </div>
      )}
      {clipError && (
        <div class="px-2">
          <Banner icon={<IconWarning16 />} variant="warning">
            {clipError}
          </Banner>
        </div>
      )}
      {downloadedFile && (
        <div class="px-2">
          <Banner icon={<IconApprovedCheckmark16 />} variant="success">
            Downloaded {downloadedFile}
          </Banner>
        </div>
      )}

      {/* Preview */}
      {showPreview && (
        <PreviewPanel content={ir ? rendered : ''} ir={ir} />
      )}

      <div class="flex-1" />
      <Divider />
      <ActionButtons
        onExtract={handleExtract}
        onCopy={handleCopy}
        onDownload={handleDownload}
        loading={loading}
        hasIR={ir !== null && !isEmpty}
      />
    </div>
  )
}

