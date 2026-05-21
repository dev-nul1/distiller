import { h } from 'preact'
import { Toggle } from '@create-figma-plugin/ui'
import type { Format } from '../../types'

type Props = {
  format: Format
  includeVotes: boolean
  csvExpandTables: boolean
  showPreview: boolean
  onIncludeVotesChange: (value: boolean) => void
  onCsvExpandTablesChange: (value: boolean) => void
  onShowPreviewChange: (value: boolean) => void
}

export function OptionsPanel({
  format,
  includeVotes,
  csvExpandTables,
  showPreview,
  onIncludeVotesChange,
  onCsvExpandTablesChange,
  onShowPreviewChange,
}: Props) {
  return (
    <div class="flex flex-col gap-3 px-2">
      <Toggle value={includeVotes} onValueChange={onIncludeVotesChange}>
        Include votes
      </Toggle>
      {format === 'csv' && (
        <Toggle value={csvExpandTables} onValueChange={onCsvExpandTablesChange}>
          Expand tables to rows
        </Toggle>
      )}
      <Toggle value={showPreview} onValueChange={onShowPreviewChange}>
        Show preview
      </Toggle>
    </div>
  )
}
