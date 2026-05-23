import { h } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { IconAdjust16, Toggle } from '@create-figma-plugin/ui'
import type { Format } from '../../types'
import { TOGGLE_HELPERS } from '../microcopy'

// ─── placement ─────────────────────────────────────────────────────────────

/**
 * Conservative upper bound on the popover's rendered height (px).
 * Covers: "Content" label + 3 toggle+helper groups + optional CSV toggle + padding/gaps.
 * Used to choose placement before the popover mounts so the first paint lands at the
 * correct position — no measure-then-reposition pass, no one-frame flash.
 */
const POPOVER_ESTIMATED_HEIGHT = 260
/** Gap (px) between the trigger edge and the nearest popover edge. */
const POPOVER_GAP = 4
/** Minimum gap (px) between the popover edge and the window edge. */
const WINDOW_MARGIN = 8

/** Computed position for the popover. maxHeight is defined only when the backstop engages. */
type PopoverPos = { top: number; right: number; maxHeight?: number }

/**
 * Choose the best placement for the popover without mounting it first.
 *
 * Priority:
 *   1. Below the trigger, right-aligned — preferred; fits in expanded (preview-on) mode.
 *   2. Above the trigger, right-aligned — if below would clip the window bottom.
 *   3. Left of the trigger, vertically centered + clamped — compact (preview-off) mode,
 *      where the window is too short for above/below but horizontal space is ample.
 *
 * If even the best placement can't fit the full estimated height, a maxHeight backstop
 * is returned; the caller applies overflow-y:auto so content scrolls internally instead
 * of being clipped by the iframe edge. Should not engage with current 3–4 toggles.
 */
function computePlacement(rect: DOMRect): PopoverPos {
  const winH = window.innerHeight
  const winW = window.innerWidth
  const popH = POPOVER_ESTIMATED_HEIGHT

  // 1. Below
  if (rect.bottom + POPOVER_GAP + popH + WINDOW_MARGIN <= winH) {
    return { top: rect.bottom + POPOVER_GAP, right: winW - rect.right }
  }
  // 2. Above
  if (rect.top - POPOVER_GAP - popH - WINDOW_MARGIN >= 0) {
    return { top: rect.top - POPOVER_GAP - popH, right: winW - rect.right }
  }
  // 3. Left — vertically centered on the trigger, clamped to window bounds.
  // Used when the window is too short for above or below (compact/preview-off mode).
  const centerY = rect.top + rect.height / 2
  const idealTop = centerY - popH / 2
  const clampedTop = Math.max(WINDOW_MARGIN, Math.min(winH - popH - WINDOW_MARGIN, idealTop))
  const available = winH - clampedTop - WINDOW_MARGIN
  if (available < popH) {
    // Backstop: cap and enable internal scroll so content is never clipped by the iframe.
    return { top: clampedTop, right: winW - rect.left + POPOVER_GAP, maxHeight: available }
  }
  return { top: clampedTop, right: winW - rect.left + POPOVER_GAP }
}

// ─── defaults / types ──────────────────────────────────────────────────────

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
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Count content toggles that differ from their shipped default.
  // Drives the active-state label suffix ("Options · N") and button tint.
  const nonDefaultCount =
    (includeVotes    !== CONTENT_DEFAULTS.includeVotes    ? 1 : 0) +
    (includeSections !== CONTENT_DEFAULTS.includeSections ? 1 : 0) +
    (includeAuthors  !== CONTENT_DEFAULTS.includeAuthors  ? 1 : 0)
  const isActive = nonDefaultCount > 0
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

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
      setPopoverPos(computePlacement(rect))
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

  // Close when the window resizes so a stale fixed position cannot strand the popover.
  // Window height changes when Show preview is toggled — closing avoids reposition-while-visible flicker.
  useEffect(() => {
    if (!open) return
    function onResize() { setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setFocused(true) }}
        onBlur={() => setFocused(false)}
        class="flex cursor-default items-center gap-1 rounded text-[11px] leading-none transition-colors"
        style={{
          padding: '4px 10px 4px 6px',
          border: '1px solid var(--figma-color-border)',
          color: isActive ? 'var(--figma-color-text-brand)' : 'var(--figma-color-text-secondary)',
          background: hovered
            ? (isActive ? 'var(--figma-color-bg-selected-hover)' : 'var(--figma-color-bg-tertiary)')
            : (isActive ? 'var(--figma-color-bg-selected)' : 'var(--figma-color-bg-secondary)'),
          ...(focused ? { outline: '2px solid var(--figma-color-border-selected)', outlineOffset: '2px' } : {}),
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
          // position:fixed anchors to the iframe viewport because no ancestor has
          // transform/filter/will-change. If any ancestor ever gains one of those CSS
          // properties, fixed positioning will silently break and placement must be revisited.
          class="fixed z-40 min-w-[196px] rounded"
          style={{
            top:       popoverPos.top,
            right:     popoverPos.right,
            background: 'var(--figma-color-bg)',
            border:    '1px solid var(--figma-color-border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.14)',
            ...(popoverPos.maxHeight !== undefined ? {
              maxHeight: popoverPos.maxHeight,
              overflowY: 'auto' as const,
            } : {}),
          }}
        >
          <div class="flex flex-col gap-3 px-2 pb-3 pt-2">
            <span class="px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--figma-color-text-secondary)]">
              Content
            </span>
            <div class="flex flex-col gap-0.5">
              <Toggle value={includeVotes} onValueChange={onIncludeVotesChange}>
                Include votes
              </Toggle>
              <p class="px-1 text-[10px] text-[var(--figma-color-text-disabled)]">{TOGGLE_HELPERS.includeVotes}</p>
            </div>
            <div class="flex flex-col gap-0.5">
              <Toggle value={includeSections} onValueChange={onIncludeSectionsChange}>
                Include section hierarchy
              </Toggle>
              <p class="px-1 text-[10px] text-[var(--figma-color-text-disabled)]">{TOGGLE_HELPERS.includeSections}</p>
            </div>
            <div class="flex flex-col gap-0.5">
              <Toggle value={includeAuthors} onValueChange={onIncludeAuthorsChange}>
                Include author names
              </Toggle>
              <p class="px-1 text-[10px] text-[var(--figma-color-text-disabled)]">{TOGGLE_HELPERS.includeAuthors}</p>
            </div>
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
