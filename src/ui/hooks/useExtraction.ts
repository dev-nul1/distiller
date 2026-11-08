import { useCallback, useRef, useState } from 'preact/hooks'
import { emit, on } from '@create-figma-plugin/utilities'
import type {
  ExtractCompleteHandler,
  ExtractErrorHandler,
  ExtractRequestHandler,
} from '../../events'
import type { ExportIR, SelectionMode } from '../../types'

export function useExtraction() {
  const [ir, setIr] = useState<ExportIR | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * Monotonic counter. Each extract() call increments this and stamps the
   * request. The sandbox echoes the id back in every response, so we can
   * discard responses that belong to a superseded (stale) request.
   */
  const nextId = useRef(0)
  /** Removes the listeners of the in-flight request, if any. */
  const cancelInFlight = useRef<(() => void) | null>(null)

  const extract = useCallback((mode: SelectionMode, onComplete?: (ir: ExportIR, elapsedMs: number) => void) => {
    // A newer request supersedes the old one; drop its listeners so they don't
    // linger (its response would be discarded by the requestId check anyway).
    cancelInFlight.current?.()
    const requestId = ++nextId.current
    setLoading(true)
    setIr(null)       // clear stale IR so buttons disable while extraction runs
    setError(null)

    // UI-side wall-clock timer. Captures the full round-trip (sandbox walk + IR
    // serialization + postMessage), which is the cost we actually care about when
    // deciding whether a scope is too heavy to auto-extract.
    const t0 = performance.now()

    // Accumulate cleanup functions so all listeners are removed as a unit
    const cleanup: Array<() => void> = []
    const unregister = () => {
      cleanup.forEach((fn) => fn())
      if (cancelInFlight.current === unregister) cancelInFlight.current = null
    }
    cancelInFlight.current = unregister

    cleanup.push(
      on<ExtractCompleteHandler>('EXTRACT_COMPLETE', (result, rid) => {
        if (rid !== requestId) return  // stale: a newer request is already in flight
        unregister()
        const elapsedMs = performance.now() - t0
        setIr(result)
        setLoading(false)
        onComplete?.(result, elapsedMs)
      })
    )

    cleanup.push(
      on<ExtractErrorHandler>('EXTRACT_ERROR', (message, rid) => {
        if (rid !== requestId) return  // stale
        unregister()
        setError(message)
        setLoading(false)
      })
    )

    emit<ExtractRequestHandler>('EXTRACT_REQUEST', mode, requestId)
  }, [])

  /**
   * Clears the current result and abandons any in-flight request. Used when
   * auto-extract is skipped, so an out-of-date result can't be copied.
   */
  const reset = useCallback(() => {
    cancelInFlight.current?.()
    nextId.current++
    setIr(null)
    setError(null)
    setLoading(false)
  }, [])

  return { ir, loading, error, extract, reset }
}
