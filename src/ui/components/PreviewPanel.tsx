import { h } from 'preact'
import { LoadingIndicator } from '@create-figma-plugin/ui'
import type { Format } from '../../types'

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

/**
 * Render content as per-line elements. For markdown/llm formats, lines that
 * begin with one or more '#' characters receive heavier font weight so headings
 * read as headings without full markdown rendering.
 */
function renderLines(content: string, format: Format) {
  const applyHeadings = format === 'markdown'
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
  loading: boolean
  format: Format
}

export function PreviewPanel({ content, loading, format }: Props) {
  return loading ? (
    <div class="flex min-h-0 flex-1 items-center justify-center bg-[var(--figma-color-bg-secondary)]">
      <div class="flex items-center gap-2 text-[11px] text-[var(--figma-color-text-secondary)]">
        <LoadingIndicator />
        <span>Extracting…</span>
      </div>
    </div>
  ) : (
    <div class="min-h-0 flex-1 cursor-text select-text overflow-y-auto bg-[var(--figma-color-bg-secondary)] p-2 font-mono text-[11px] leading-relaxed text-[var(--figma-color-text)] outline-none">
      {content ? renderLines(content, format) : null}
    </div>
  )
}

