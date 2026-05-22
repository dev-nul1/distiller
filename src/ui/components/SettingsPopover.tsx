import { h } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { IconAdjust16, Toggle } from '@create-figma-plugin/ui'
import type { Format } from '../../types'

/**
 * Content-toggle defaults — what the plugin ships with out of the box.
 * The active-state cue is computed against these values, so it correctly
 * reflects restored configs (not just in-session changes). Only the three
 * content toggles are tracked here; csvExpandTables is a format-rendering
 * option and is excluded from the cue count.
 */
const CONTENT_DEFAULTS = {
  includeVotes:    true,
  includeSections: true,
  includeAuthors:  false,
} as const

type Props = {
  format: Format
  includeVotes: boolean
  includeSections: boolean
  csvExpandTables: boolean
  includeAuthors: boolean
  onIncludeVotesChange: (v: boolean) => void
  onIncludeSectionsChange: (v: boolean) => void
  onCsvExpandTablesChange: (v: boolean) => void
  onIncludeAuthorsChange: (v: boolean) => void
}

export function SettingsPopover({
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
  const [open, setOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Count content toggles that differ from their shipped default.
  // Drives the active-state label suffix ("Options · N") and button tint.
  const nonDefaultCount =
    (includeVotes    !== CONTENT_DEFAULTS.includeVotes    ? 1 : 0) +
    (includeSections !== CONTENT_DEFAULTS.includeSections ? 1 : 0) +
    (includeAuthors  !== CONTENT_DEFAULTS.includeAuthors  ? 1 : 0)
  const isActive = nonDefaultCount > 0

  function close() {
    setOpen(false)
  }

  function toggle() {
    if (open) {
      close()
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      // Position fixed below the trigger, right-aligned to its right edge.
      // The panel is narrow (400 px) so right-alignment keeps the popover
      // within bounds naturally — no flip logic needed here.
      setPopoverPos({
        top:   rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(true)
  }

  // Outside-click and Escape dismissal — registered only while open.
  useEffect(() => {
    if (!open) return

    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (
        !popoverRef.current?.contains(t) &&
        !triggerRef.current?.contains(t)
      ) {
        close()
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Stop propagation so App.tsx's window-level Escape handler
        // (which closes the whole plugin) does not also fire.
        e.stopPropagation()
        close()
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const label = isActive ? `Options · ${nonDefaultCount}` : 'Options'

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        class="flex cursor-default items-center gap-1 rounded px-2 py-1 text-[11px] leading-none"
        style={isActive ? {
          background: 'var(--figma-color-bg-selected)',
          color:      'var(--figma-color-text-brand)',
        } : {
          background: 'var(--figma-color-bg-secondary)',
          color:      'var(--figma-color-text-secondary)',
        }}
      >
        <IconAdjust16 />
        <span>{label}</span>
      </button>

      {open && popoverPos && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Options"
          class="fixed z-40 min-w-[196px] rounded"
          style={{
            top:       popoverPos.top,
            right:     popoverPos.right,
            background: 'var(--figma-color-bg)',
            border:    '1px solid var(--figma-color-border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.14)',
          }}
        >
          <div class="flex flex-col gap-2 px-2 pb-3 pt-2">
            <span class="px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--figma-color-text-secondary)]">
              Content
            </span>
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
        </div>
      )}
    </div>
  )
}
