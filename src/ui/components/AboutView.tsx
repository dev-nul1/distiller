import { h } from 'preact'
import { useState } from 'preact/hooks'
import { Button, Divider, IconChevronRight16 } from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import type { OpenExternalHandler } from '../../events'
import pkg from '../../../package.json'
import { DistillerLogo } from '../assets/distiller-logo'

// ── External URL constants — fill in before publish ───────────────────────────
// TODO: replace placeholder Community URL after plugin is listed on Figma Community
const REPORT_BUG_URL     = 'https://github.com/dev-nul1/figjam-exporter/issues/new'
const LEAVE_FEEDBACK_URL = 'https://www.figma.com/community/plugin/TODO'
const VIEW_SOURCE_URL    = 'https://github.com/dev-nul1/figjam-exporter'

// ── Author ────────────────────────────────────────────────────────────────────
const AUTHOR_NAME = 'Philip Scheid'

// ── Logo ─────────────────────────────────────────────────────────────────────
// Corner radius of the logo container in px. Adjust here to restyle; the
// container's overflow:hidden ensures the logo is clipped to this radius.
const LOGO_CORNER_RADIUS = 4   // matches rounded-xl (0.75rem)

// ── Plugin name strings ───────────────────────────────────────────────────────
// Full name: en dash – (U+2013) between brand and descriptor. Keep exact.
// Short form: used in space-constrained surfaces inside the running plugin UI.
const PLUGIN_NAME_FULL  = 'Distiller – FigJam Exporter'
const PLUGIN_NAME_SHORT = 'Distiller'

// ── How-it-works steps ────────────────────────────────────────────────────────
const STEPS = [
  {
    label:       'Choose what to export',
    description: 'The whole page, your current selection, or the current viewport.',
  },
  {
    label:       'Pick a format',
    description: 'Markdown for docs and AI tools, plain text, or CSV.',
  },
  {
    label:       'Refine the output',
    description: 'Use Options to add votes, section labels, and author names.',
  },
  {
    label:       'Copy or download',
    description: 'Send the result to your doc, spreadsheet, or AI chat.',
  },
] as const

// ── External-link icon (no library equivalent at this size) ───────────────────
function IconExternalLink() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M5 2H2v8h8V7M7 2h3v3M10 2 5.5 6.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type Props = {
  onBack: () => void
}

export function AboutView({ onBack }: Props) {
  // Back button interactive state — inline-style pattern required because
  // base.css unlayered button reset overrides @layer utilities for hover/focus.
  const [backHovered, setBackHovered] = useState(false)
  const [backFocused, setBackFocused] = useState(false)

  function openUrl(url: string) {
    emit<OpenExternalHandler>('OPEN_EXTERNAL', url)
  }

  return (
    <div class="flex flex-col">

      {/* ── back button — the entire "‹ About" cluster is one clickable button ── */}
      <div class="px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          onMouseEnter={() => setBackHovered(true)}
          onMouseLeave={() => setBackHovered(false)}
          onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setBackFocused(true) }}
          onBlur={() => setBackFocused(false)}
          aria-label="Back to exporter"
          class="flex cursor-default items-center gap-[3px] rounded"
          style={{
            padding: '4px 8px 4px 4px',
            border: 'none',
            background: backHovered ? 'var(--figma-color-bg-hover)' : 'transparent',
            color: 'var(--figma-color-text-secondary)',
            ...(backFocused
              ? { outline: '2px solid var(--figma-color-border-selected)', outlineOffset: '1px' }
              : { outline: 'none' }),
          }}
        >
          <span style={{ display: 'flex', transform: 'scaleX(-1)' }} aria-hidden="true">
            <IconChevronRight16 />
          </span>
          <span class="text-[11px] font-medium" style={{ color: 'var(--figma-color-text)' }}>
            About
          </span>
        </button>
      </div>

      <Divider />

      {/* ── identity block ────────────────────────────────────────────────── */}
      <div class="flex flex-col items-center gap-2 px-4 pt-6 pb-4">
        <div
          class="h-12 w-12 overflow-hidden"
          style={{ borderRadius: LOGO_CORNER_RADIUS }}
          aria-hidden="true"
        >
          <DistillerLogo />
        </div>
        <div class="flex flex-col items-center gap-[2px]">
          <span class="text-[13px] font-semibold text-[var(--figma-color-text)]">
            {PLUGIN_NAME_FULL}
          </span>
          <span class="text-[11px] text-[var(--figma-color-text-secondary)]">
            v{pkg.version}
          </span>
        </div>
      </div>

      {/* ── description (corrected copy — no "LLM-ready") ─────────────────── */}
      <p class="px-5 pb-4 text-center text-[11px] leading-[1.5] text-[var(--figma-color-text-secondary)]">
        Export stickies, text, and sections from any FigJam board to Markdown,
        plain text, or CSV.
      </p>

      <Divider />

      {/* ── how it works ──────────────────────────────────────────────────── */}
      <div class="flex flex-col gap-3 px-4 pt-3 pb-4">
        {/* Section header: legible uppercase label using secondary-but-readable color */}
        <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--figma-color-text-secondary)]">
          How it works
        </p>
        {STEPS.map((step, i) => (
          <div key={i} class="flex items-start gap-3">
            {/* Numbered badge: brand-tinted, theme-aware via CSS vars */}
            <div
              class="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none"
              style={{
                background: 'var(--figma-color-bg-selected)',
                color: 'var(--figma-color-text-brand)',
              }}
            >
              {i + 1}
            </div>
            {/* Step label (primary text, scannable) + description (secondary, supporting) */}
            <div class="flex flex-col gap-[1px]">
              <span class="text-[11px] font-medium leading-snug text-[var(--figma-color-text)]">
                {step.label}
              </span>
              <span class="text-[10px] leading-snug text-[var(--figma-color-text-secondary)]">
                {step.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      {/* ── action buttons: Report a bug + Leave feedback ─────────────────── */}
      <div class="flex gap-2 px-4 pb-4 pt-4">
        <div class="flex-1">
          <Button onClick={() => openUrl(LEAVE_FEEDBACK_URL)} fullWidth>
            <span class="flex items-center justify-center gap-1">
              Leave feedback
              <IconExternalLink />
            </span>
          </Button>
        </div>
        <div class="flex-1">
          <Button onClick={() => openUrl(REPORT_BUG_URL)} secondary fullWidth>
            <span class="flex items-center justify-center gap-1">
              Report a bug
              <IconExternalLink />
            </span>
          </Button>
        </div>
      </div>

      {/* ── footer: "Created by … · View source ↗" ──────────────────────── */}
      <div class="flex items-center justify-center gap-[4px] pb-4 text-[10px] text-[var(--figma-color-text-secondary)]">
        <span>Created by {AUTHOR_NAME}</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => openUrl(VIEW_SOURCE_URL)}
          class="flex cursor-default items-center gap-[4px] rounded hover:text-[var(--figma-color-text)] hover:underline"
          style={{ background: 'none', border: 'none', outline: 'none', padding: '1px 3px' }}
        >
          View source
          <IconExternalLink />
        </button>
      </div>

    </div>
  )
}
