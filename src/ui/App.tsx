import { h } from 'preact'
import { useState } from 'preact/hooks'
import { Divider } from '@create-figma-plugin/ui'
import type { SelectionMode, Format } from '../types'
import { ModePicker } from './components/ModePicker'
import { FormatPicker } from './components/FormatPicker'
import { OptionsPanel } from './components/OptionsPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { ActionButtons } from './components/ActionButtons'

export function App() {
  const [mode, setMode] = useState<SelectionMode>('page')
  const [format, setFormat] = useState<Format>('markdown')
  const [includeVotes, setIncludeVotes] = useState(true)
  const [csvExpandTables, setCsvExpandTables] = useState(true)
  const [showPreview, setShowPreview] = useState(false)

  function handleExtract() {
    console.log('[FigJam Exporter] EXTRACT_REQUEST', { mode, options: {} })
  }

  function handleCopy() {
    console.log('[FigJam Exporter] Copy', { format, opts: { includeVotes, csvExpandTables } })
  }

  function handleDownload() {
    console.log('[FigJam Exporter] Download', { format, opts: { includeVotes, csvExpandTables } })
  }

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
      {showPreview && <PreviewPanel />}
      <div class="flex-1" />
      <Divider />
      <ActionButtons
        onExtract={handleExtract}
        onCopy={handleCopy}
        onDownload={handleDownload}
      />
    </div>
  )
}
