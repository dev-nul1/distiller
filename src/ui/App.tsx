import { h } from 'preact'
import { useMemo, useState } from 'preact/hooks'
import { Banner, Button, Divider, LoadingIndicator } from '@create-figma-plugin/ui'
import { IconApprovedCheckmark16, IconWarning16 } from '@create-figma-plugin/ui'
import type { SelectionMode, Format, RenderOpts } from '../types'
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

export function App() {
  const [mode, setMode] = useState<SelectionMode>('page')
  const [format, setFormat] = useState<Format>('markdown')
  const [includeVotes, setIncludeVotes] = useState(true)
  const [csvExpandTables, setCsvExpandTables] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null)

  const { ir, loading, error, progress, extract } = useExtraction()
  const { copied, clipError, writeText } = useClipboard()

  const opts: RenderOpts = { includeVotes, csvExpandTables }

  const rendered = useMemo(
    () => renderOutput(ir, format, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ir, format, includeVotes, csvExpandTables]
  )

  const isEmpty = ir !== null && countItems(ir) === 0

  async function handleExtract() {
    extract(mode)
  }

  async function handleCopy() {
    if (!ir) return
    const ok = await writeText(rendered)
    if (!ok) return
    // copied state handled by useClipboard
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

  const previewContent = showPreview
    ? (ir ? rendered : '(click Extract to generate preview)')
    : ''

  // Progress label
  const progressLabel =
    progress && progress.total > 0
      ? `Extracting… ${progress.processed}/${progress.total}`
      : 'Extracting…'

  return (
    <div class="flex flex-col gap-4 py-4">
      <ModePicker value={mode} onValueChange={setMode} />
      <FormatPicker value={format} onValueChange={(v) => setFormat(v)} />
      <Divider />
      <OptionsPanel
        format={format}
        includeVotes={includeVotes}
        csvExpandTables={csvExpandTables}
        showPreview={showPreview}
        onIncludeVotesChange={setIncludeVotes}
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

      {/* Toast: copy */}
      {copied && (
        <div class="px-2">
          <Banner icon={<IconApprovedCheckmark16 />} variant="success">
            Copied to clipboard
          </Banner>
        </div>
      )}

      {/* Toast: clipboard error */}
      {clipError && (
        <div class="px-2">
          <Banner icon={<IconWarning16 />} variant="warning">
            {clipError}
          </Banner>
        </div>
      )}

      {/* Toast: download */}
      {downloadedFile && (
        <div class="px-2">
          <Banner icon={<IconApprovedCheckmark16 />} variant="success">
            Downloaded {downloadedFile}
          </Banner>
        </div>
      )}

      {showPreview && <PreviewPanel content={previewContent} />}
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

