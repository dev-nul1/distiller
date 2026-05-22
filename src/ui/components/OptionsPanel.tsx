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
  includeAuthors: boolean
  onIncludeVotesChange: (value: boolean) => void
  onIncludeSectionsChange: (value: boolean) => void
  onCsvExpandTablesChange: (value: boolean) => void
  onIncludeAuthorsChange: (value: boolean) => void
}

export function OptionsPanel({
  open,
  onToggle,
  format,
  includeVotes,
  includeSections,
  csvExpandTables,
  includeAuthors,
  onIncludeVotesChange,
  onIncludeSectionsChange,
  onCsvExpandTablesChange,
  onIncludeAuthorsChange,
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
        <Toggle value={includeAuthors} onValueChange={onIncludeAuthorsChange}>
          Include author names
        </Toggle>
        {format === 'csv' && (
          <Toggle value={csvExpandTables} onValueChange={onCsvExpandTablesChange}>
            Expand tables to rows
          </Toggle>
        )}
      </div>
    </Disclosure>
  )
}

