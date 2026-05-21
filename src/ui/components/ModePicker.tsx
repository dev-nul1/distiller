import { h } from 'preact'
import { Dropdown } from '@create-figma-plugin/ui'
import type { DropdownOption } from '@create-figma-plugin/ui'
import type { SelectionMode } from '../../types'

const OPTIONS: DropdownOption[] = [
  { value: 'page',      text: 'Whole page' },
  { value: 'section',   text: 'Selected sections' },
  { value: 'selection', text: 'Current selection' },
  { value: 'viewport',  text: 'Current viewport' },
]

type Props = {
  value: SelectionMode
  onValueChange: (value: SelectionMode) => void
}

export function ModePicker({ value, onValueChange }: Props) {
  return (
    <div class="flex items-center gap-3 px-2">
      <span class="w-20 shrink-0 text-[11px] text-[var(--figma-color-text)]">
        Extract from
      </span>
      <div class="flex-1">
        <Dropdown
          options={OPTIONS}
          value={value}
          onValueChange={(v) => onValueChange(v as SelectionMode)}
        />
      </div>
    </div>
  )
}
