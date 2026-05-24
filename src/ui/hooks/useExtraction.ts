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

  const extract = useCallback((mode: SelectionMode, onComplete?: (ir: ExportIR) => void) => {
    const requestId = ++nextId.current
    setLoading(true)
    setIr(null)       // clear stale IR so buttons disable while extraction runs
    setError(null)

    // Accumulate cleanup functions so all listeners are removed as a unit
    const cleanup: Array<() => void> = []
    const unregister = () => cleanup.forEach((fn) => fn())

    cleanup.push(
      on<ExtractCompleteHandler>('EXTRACT_COMPLETE', (result, rid) => {
        if (rid !== requestId) return  // stale: a newer request is already in flight
        unregister()
        setIr(result)
        setLoading(false)
        onComplete?.(result)
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

  return { ir, loading, error, extract }
}
