import { h } from 'preact'
import { Dropdown } from '@create-figma-plugin/ui'
import type { DropdownOption } from '@create-figma-plugin/ui'
import type { Format } from '../../types'
import { FORMAT_DESCRIPTIONS } from '../microcopy'

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
    <div class="flex flex-col gap-1 px-2">
      <div class="flex items-center gap-3">
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
      {/* Per-format one-liner, indented to align with the dropdown column */}
      <p class="pl-[92px] text-[10px] text-[var(--figma-color-text-disabled)]">
        {FORMAT_DESCRIPTIONS[value]}
      </p>
    </div>
  )
}
