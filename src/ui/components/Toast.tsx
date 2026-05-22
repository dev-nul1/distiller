import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { IconApprovedCheckmark16 } from '@create-figma-plugin/ui'

type Props = {
  /** Message to show. Set to null to dismiss — the exit animation plays before
   *  the element becomes invisible. */
  text: string | null
}

/**
 * Transient success confirmation overlay.
 *
 * Always stays in the DOM so CSS transitions can run in both directions:
 *   Entry  240 ms  cubic-bezier(0.16, 1, 0.3, 1)  — spring-out, slides up 8 px + fades in
 *   Exit   180 ms  ease-in                          — quicker, sinks down + fades out
 *
 * `label` is preserved through the exit animation so the text stays readable
 * while the toast is fading out. `visible` is the sole driver of opacity /
 * transform so there are no split-render inconsistencies.
 *
 * Accessibility: role="status" + aria-live="polite" announces the confirmation
 * to assistive technologies without interrupting the user.
 */
export function Toast({ text }: Props) {
  // Single atomic state — both fields update together in one commit
  const [{ label, visible }, setToast] = useState({ label: '', visible: false })

  useEffect(() => {
    if (text !== null) {
      // New message: show immediately (if already visible the label swaps
      // while staying visible, which is fine for same-message rapid triggers)
      setToast({ label: text, visible: true })
    } else {
      // Dismiss: animate out while keeping the label readable during exit
      setToast(prev => prev.visible ? { ...prev, visible: false } : prev)
    }
  }, [text])

  // Asymmetric timing: springy entry feels snappy; faster ease-in exit keeps
  // it from lingering. Switching the transition string on the same render as
  // the opacity/transform change is correct — browsers apply the incoming
  // transition property to the outgoing → incoming value change.
  const transition = visible
    ? 'opacity 240ms cubic-bezier(0.16,1,0.3,1), transform 240ms cubic-bezier(0.16,1,0.3,1)'
    : 'opacity 180ms ease-in, transform 180ms ease-in'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="pointer-events-none fixed bottom-[60px] left-[8px] right-[8px] z-50 flex items-center gap-1.5 rounded px-3 py-2 text-[11px] leading-tight"
      style={{
        background: '#1a7a50',
        color: '#ffffff',
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? 0 : 8}px)`,
        transition,
      }}
    >
      <IconApprovedCheckmark16 />
      <span>{label}</span>
    </div>
  )
}
