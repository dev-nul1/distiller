import { h } from 'preact'
import { Button, Divider, IconChevronRight16, IconLink16 } from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import type { OpenExternalHandler } from '../../events'
import pkg from '../../../package.json'

// TODO: set real GitHub issues URL
const REPORT_BUG_URL = 'https://github.com/dev-nul1/figjam-exporter/issues/new'
// TODO: finalize author details
const AUTHOR_NAME = 'Philip Scheid'
const AUTHOR_ROLE = 'Author & maintainer'
// TODO: finalize tagline
const TAGLINE = 'Make the implicit explicit.'

type Props = {
  onBack: () => void
}

export function AboutView({ onBack }: Props) {
  function handleReportBug() {
    emit<OpenExternalHandler>('OPEN_EXTERNAL', REPORT_BUG_URL)
  }

  return (
    <div class="flex flex-col">
      {/* ── header row: back arrow + title ─────────────────────────────── */}
      <div class="flex items-center gap-1 px-2 py-2">
        <button
          class="flex cursor-pointer items-center justify-center rounded p-1 text-[var(--figma-color-text-secondary)] outline-none transition-colors hover:bg-[var(--figma-color-bg-hover)] hover:text-[var(--figma-color-text)]"
          onClick={onBack}
          aria-label="Back"
          style={{ background: 'none', border: 'none' }}
        >
          <span style={{ display: 'flex', transform: 'scaleX(-1)' }}>
            <IconChevronRight16 />
          </span>
        </button>
        <span class="text-[11px] font-medium text-[var(--figma-color-text)]">About</span>
      </div>

      <Divider />

      {/* ── identity block ─────────────────────────────────────────────── */}
      <div class="flex flex-col items-center gap-2 px-4 pt-6 pb-4">
        {/* Plugin icon — "FE" monogram in a rounded square */}
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl text-[17px] font-bold tracking-tight text-white"
          style={{ background: 'var(--figma-color-bg-brand)' }}
          aria-hidden="true"
        >
          FE
        </div>
        <div class="flex flex-col items-center gap-[2px]">
          <span class="text-[13px] font-semibold text-[var(--figma-color-text)]">
            FigJam Exporter
          </span>
          <span class="text-[11px] text-[var(--figma-color-text-secondary)]">
            v{pkg.version}
          </span>
        </div>
      </div>

      {/* ── description ────────────────────────────────────────────────── */}
      <p class="px-5 pb-5 text-center text-[11px] leading-[1.5] text-[var(--figma-color-text-secondary)]">
        Export stickies, text, and sections from any FigJam board to Markdown,
        plain text, CSV, or an LLM-ready format.
      </p>

      <Divider />

      {/* ── author block ────────────────────────────────────────────────── */}
      <div class="flex items-center gap-3 px-4 py-3">
        <div
          class="flex h-8 w-8 flex-shrink-0 select-none items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{ background: 'var(--figma-color-bg-brand)' }}
          aria-hidden="true"
        >
          PS
        </div>
        <div class="flex flex-col gap-[1px]">
          <span class="text-[11px] font-medium text-[var(--figma-color-text)]">{AUTHOR_NAME}</span>
          <span class="text-[10px] text-[var(--figma-color-text-secondary)]">{AUTHOR_ROLE}</span>
        </div>
      </div>

      {/* ── report a bug ────────────────────────────────────────────────── */}
      <div class="px-4 pb-4">
        <Button onClick={handleReportBug} secondary fullWidth>
          <span class="flex items-center justify-center gap-1">
            <IconLink16 />
            Report a bug
          </span>
        </Button>
      </div>

      {/* ── tagline footnote ────────────────────────────────────────────── */}
      <p class="pb-5 text-center text-[10px] text-[var(--figma-color-text-disabled)]">
        {TAGLINE}
      </p>
    </div>
  )
}
