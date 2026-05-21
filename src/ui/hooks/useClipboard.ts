import { useCallback, useState } from 'preact/hooks'

/** Copy text using the modern Clipboard API, falling back to execCommand for
 *  sandboxed webviews (Figma plugin UI) where navigator.clipboard is unavailable. */
async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  // execCommand fallback — works inside Figma's sandboxed iframe
  const el = document.createElement('textarea')
  el.value = text
  el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.appendChild(el)
  el.focus()
  el.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(el)
  if (!ok) throw new Error('execCommand copy failed')
}

export function useClipboard() {
  const [copied, setCopied] = useState(false)
  const [clipError, setClipError] = useState<string | null>(null)

  const writeText = useCallback(async (text: string): Promise<boolean> => {
    try {
      await copyToClipboard(text)
      setCopied(true)
      setClipError(null)
      setTimeout(() => setCopied(false), 2500)
      return true
    } catch (err) {
      setClipError(err instanceof Error ? err.message : 'Copy failed')
      setCopied(false)
      return false
    }
  }, [])

  return { copied, clipError, writeText }
}

