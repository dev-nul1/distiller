import { h } from 'preact'
import { Dropdown } from '@create-figma-plugin/ui'
import type { DropdownOption } from '@create-figma-plugin/ui'
import type { Format } from '../../types'

const OPTIONS: DropdownOption[] = [
  { value: 'plaintext', text: 'Plain text' },
  { value: 'markdown',  text: 'Markdown' },
  { value: 'llm',       text: 'LLM-ready' },
  { value: 'csv',       text: 'CSV' },
]

type Props = {
  value: Format
  onValueChange: (value: Format) => void
}

export function FormatPicker({ value, onValueChange }: Props) {
  return (
    <div class="flex items-center gap-3 px-2">
      <span class="w-20 shrink-0 text-[11px] text-[var(--figma-color-text)]">
        Format
      </span>
      <div class="flex-1">
        <Dropdown
          options={OPTIONS}
          value={value}
          onValueChange={(v) => onValueChange(v as Format)}
        />
      </div>
    </div>
  )
}
