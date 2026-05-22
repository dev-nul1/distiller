import { h } from 'preact'
import { LoadingIndicator } from '@create-figma-plugin/ui'
import type { ExportIR, ExportItem, ExportSection, Format } from '../../types'

// ─── helpers ───────────────────────────────────────────────────────────────

function sumVotes(items: ExportItem[]): number {
  return items.reduce((n, i) => n + (i.votes ?? 0), 0)
}

function countVotesInIR(ir: ExportIR): number {
  function walk(sections: ExportSection[]): number {
    return sections.reduce(
      (n, s) => n + sumVotes(s.items) + walk(s.children),
      0
    )
  }
  return sumVotes(ir.orphans) + walk(ir.sections)
}

type Stat = { value: number; label: string }

/** Sections first (structural container), then content types, votes last. */
function buildStats(ir: ExportIR): Stat[] {
  const c = ir.meta.counts
  const votes = countVotesInIR(ir)
  return [
    { value: c.sections, label: c.sections === 1 ? 'section' : 'sections' },
    { value: c.stickies, label: c.stickies === 1 ? 'sticky' : 'stickies' },
    { value: c.text,     label: 'text' },
    { value: c.shapes,   label: c.shapes === 1 ? 'shape' : 'shapes' },
    { value: c.tables,   label: c.tables === 1 ? 'table' : 'tables' },
    { value: votes,      label: votes === 1 ? 'vote' : 'votes' },
  ].filter(s => s.value > 0)
}

// ─── truncation (kept for potential future "compact preview" setting) ────────
// To re-enable: set PREVIEW_LINE_LIMIT to desired line count, call truncate()
// in the component below, swap textarea value to `preview`, and render the
// overflow message when `overflow > 0`.
//
// const PREVIEW_LINE_LIMIT = 15
//
// function truncate(text: string): { preview: string; overflow: number } {
//   const lines = text.split('\n')
//   if (lines.length <= PREVIEW_LINE_LIMIT) return { preview: text, overflow: 0 }
//   return {
//     preview: lines.slice(0, PREVIEW_LINE_LIMIT).join('\n'),
//     overflow: lines.length - PREVIEW_LINE_LIMIT,
//   }
// }

// ─── skeleton widths for badge placeholders ────────────────────────────────
// Chosen to visually approximate a typical result (sections, stickies, text, votes).
const SKELETON_BADGE_WIDTHS = [72, 88, 52, 64]

/**
 * Render content as per-line elements. For markdown/llm formats, lines that
 * begin with one or more '#' characters receive heavier font weight so headings
 * read as headings without full markdown rendering.
 */
function renderLines(content: string, format: Format) {
  const applyHeadings = format === 'markdown' || format === 'llm'
  return content.split('\n').map((line, i) => {
    const isH1    = applyHeadings && /^# /.test(line)
    const isH2up  = applyHeadings && /^#{2,} /.test(line)
    return (
      <div key={i} class={isH1 ? 'font-bold' : isH2up ? 'font-semibold' : undefined}>
        {line || '\u00a0'}
      </div>
    )
  })
}

// ─── component ─────────────────────────────────────────────────────────────

type Props = {
  content: string
  ir: ExportIR | null
  loading: boolean
  format: Format
}

export function PreviewPanel({ content, ir, loading, format }: Props) {
  const stats = ir && !loading ? buildStats(ir) : null

  return (
    <div class="flex flex-col gap-1 px-2">

      {/* Stat badges — skeleton while loading, real chips when ready */}
      {loading ? (
        <div class="flex flex-wrap gap-1 px-1 py-0.5">
          {SKELETON_BADGE_WIDTHS.map((w, i) => (
            <span
              key={i}
              class="inline-block animate-pulse rounded-[3px] bg-[var(--figma-color-border)]"
              style={{ width: w, height: 18 }}
            />
          ))}
        </div>
      ) : stats && stats.length > 0 ? (
        <div class="flex flex-wrap gap-1 px-1 py-0.5">
          {stats.map(({ value, label }) => (
            <span
              key={label}
              class="inline-flex items-baseline gap-[3px] rounded-[3px] border border-[var(--figma-color-border)] bg-[var(--figma-color-bg-secondary)] px-[6px] py-[2px] text-[11px] leading-none"
            >
              <span class="font-semibold text-[var(--figma-color-text)]">{value}</span>
              <span class="text-[var(--figma-color-text-secondary)]">{label}</span>
            </span>
          ))}
        </div>
      ) : null}

      {/* Preview area — honest busy state while loading, styled per-line view when ready */}
      {loading ? (
        <div class="flex h-64 w-full items-center justify-center rounded border border-[var(--figma-color-border)] bg-[var(--figma-color-bg-secondary)]">
          <div class="flex items-center gap-2 text-[11px] text-[var(--figma-color-text-secondary)]">
            <LoadingIndicator />
            <span>Extracting…</span>
          </div>
        </div>
      ) : (
        <div
          class="h-64 w-full cursor-text select-text overflow-y-auto rounded border border-[var(--figma-color-border)] bg-[var(--figma-color-bg-secondary)] p-2 font-mono text-[11px] leading-relaxed text-[var(--figma-color-text)] outline-none"
        >
          {content
            ? renderLines(content, format)
            : <span class="text-[var(--figma-color-text-secondary)]">(preview will update automatically)</span>
          }
        </div>
      )}
    </div>
  )
}

