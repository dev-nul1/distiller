import { useCallback, useRef, useState } from 'preact/hooks'
import { emit, on } from '@create-figma-plugin/utilities'
import type {
  ExtractCompleteHandler,
  ExtractErrorHandler,
  ExtractProgressHandler,
  ExtractRequestHandler,
} from '../../events'
import type { ExportIR, SelectionMode } from '../../types'

export type ExtractionProgress = { processed: number; total: number }

export function useExtraction() {
  const [ir, setIr] = useState<ExportIR | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ExtractionProgress | null>(null)
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
    setProgress(null)

    // Accumulate cleanup functions so all listeners are removed as a unit
    const cleanup: Array<() => void> = []
    const unregister = () => cleanup.forEach((fn) => fn())

    cleanup.push(
      on<ExtractCompleteHandler>('EXTRACT_COMPLETE', (result, rid) => {
        if (rid !== requestId) return  // stale: a newer request is already in flight
        unregister()
        setIr(result)
        setLoading(false)
        setProgress(null)
        onComplete?.(result)
      })
    )

    cleanup.push(
      on<ExtractErrorHandler>('EXTRACT_ERROR', (message, rid) => {
        if (rid !== requestId) return  // stale
        unregister()
        setError(message)
        setLoading(false)
        setProgress(null)
      })
    )

    cleanup.push(
      on<ExtractProgressHandler>('EXTRACT_PROGRESS', (p) => {
        if (p.requestId !== requestId) return  // stale
        setProgress(p)
      })
    )

    emit<ExtractRequestHandler>('EXTRACT_REQUEST', mode, {}, requestId)
  }, [])

  return { ir, loading, error, progress, extract }
}

