import { h } from 'preact'

type Props = {
  content: string
}

export function PreviewPanel({ content }: Props) {
  return (
    <div class="px-2">
      <textarea
        class="w-full h-40 resize-none rounded p-2 font-mono text-[11px] leading-relaxed border border-[var(--figma-color-border)] bg-[var(--figma-color-bg-secondary)] text-[var(--figma-color-text)] outline-none"
        readOnly
        value={content}
      />
    </div>
  )
}
