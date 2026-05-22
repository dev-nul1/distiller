import { h } from 'preact'
import { Disclosure, Toggle } from '@create-figma-plugin/ui'
import type { Format } from '../../types'

type Props = {
  open: boolean
  onToggle: () => void
  format: Format
  includeVotes: boolean
  includeSections: boolean
  csvExpandTables: boolean
  showPreview: boolean
  onIncludeVotesChange: (value: boolean) => void
  onIncludeSectionsChange: (value: boolean) => void
  onCsvExpandTablesChange: (value: boolean) => void
  onShowPreviewChange: (value: boolean) => void
}

export function OptionsPanel({
  open,
  onToggle,
  format,
  includeVotes,
  includeSections,
  csvExpandTables,
  showPreview,
  onIncludeVotesChange,
  onIncludeSectionsChange,
  onCsvExpandTablesChange,
  onShowPreviewChange,
}: Props) {
  return (
    <Disclosure title="Options" open={open} onClick={onToggle}>
      <div class="flex flex-col gap-3 px-2 pb-3 pt-1">
        <Toggle value={includeVotes} onValueChange={onIncludeVotesChange}>
          Include votes
        </Toggle>
        <Toggle value={includeSections} onValueChange={onIncludeSectionsChange}>
          Include section hierarchy
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
    </Disclosure>
  )
}

