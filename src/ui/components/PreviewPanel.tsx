import { h } from 'preact'

export function PreviewPanel() {
  return (
    <div class="px-2">
      <textarea
        class="w-full h-40 resize-none rounded p-2 font-mono text-[11px] leading-relaxed border border-[var(--figma-color-border)] bg-[var(--figma-color-bg-secondary)] text-[var(--figma-color-text)] outline-none"
        readOnly
        value="(click Extract to generate preview)"
      />
    </div>
  )
}
