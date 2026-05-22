import { h } from 'preact'
import type { ExportIR, ExportItem, ExportSection } from '../../types'

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

function buildSummary(ir: ExportIR): string {
  const c = ir.meta.counts
  const votes = countVotesInIR(ir)
  const parts: string[] = []
  if (c.stickies > 0) parts.push(`${c.stickies} ${c.stickies === 1 ? 'sticky' : 'stickies'}`)
  if (c.text > 0)     parts.push(`${c.text} text`)
  if (c.shapes > 0)   parts.push(`${c.shapes} ${c.shapes === 1 ? 'shape' : 'shapes'}`)
  if (c.tables > 0)   parts.push(`${c.tables} ${c.tables === 1 ? 'table' : 'tables'}`)
  if (c.sections > 0) parts.push(`${c.sections} ${c.sections === 1 ? 'section' : 'sections'}`)
  if (votes > 0)      parts.push(`${votes} ${votes === 1 ? 'vote' : 'votes'}`)
  return parts.join(' · ')
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

// ─── component ─────────────────────────────────────────────────────────────

type Props = {
  content: string
  ir: ExportIR | null
}

export function PreviewPanel({ content, ir }: Props) {
  const summary = ir ? buildSummary(ir) : null

  return (
    <div class="flex flex-col gap-1 px-2">
      {summary && (
        <p class="text-[11px] text-[var(--figma-color-text-secondary)] px-1">
          {summary}
        </p>
      )}
      <textarea
        class="w-full h-64 resize-none overflow-y-auto rounded p-2 font-mono text-[11px] leading-relaxed border border-[var(--figma-color-border)] bg-[var(--figma-color-bg-secondary)] text-[var(--figma-color-text)] outline-none"
        readOnly
        value={content || '(click Extract to generate preview)'}
      />
    </div>
  )
}

