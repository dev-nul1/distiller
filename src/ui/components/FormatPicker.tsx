import { h } from 'preact'
import { Checkbox, Dropdown } from '@create-figma-plugin/ui'
import type { DropdownOption } from '@create-figma-plugin/ui'
import type { Format } from '../../types'
import { FORMAT_DESCRIPTIONS, MARKDOWN_AI_DESCRIPTION } from '../microcopy'

const OPTIONS: DropdownOption[] = [
  { value: 'markdown',  text: 'Markdown' },
  { value: 'plaintext', text: 'Plain text' },
  { value: 'csv',       text: 'CSV' },
]

type Props = {
  value: Format
  onValueChange: (value: Format) => void
  aiOptimized: boolean
  onAiOptimizedChange: (v: boolean) => void
}

export function FormatPicker({ value, onValueChange, aiOptimized, onAiOptimizedChange }: Props) {
  const description =
    value === 'markdown' && aiOptimized
      ? MARKDOWN_AI_DESCRIPTION
      : FORMAT_DESCRIPTIONS[value]

  return (
    <div class="flex flex-col gap-1 pl-3 pr-6">
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
      {/* AI-optimized checkbox — only visible when Markdown is selected */}
      {value === 'markdown' && (
        <div class="pl-[92px]">
          <Checkbox
            value={aiOptimized}
            onValueChange={onAiOptimizedChange}
            onMouseDown={(e) => e.preventDefault()}
          >
            AI-optimized
          </Checkbox>
        </div>
      )}
      {/* Per-format one-liner, indented to align with the dropdown column.
           When Markdown + AI-optimized, reflects the AI-context description. */}
      <p class="pl-[92px] text-[10px] text-[var(--figma-color-text-disabled)]">
        {description}
      </p>
    </div>
  )
}

