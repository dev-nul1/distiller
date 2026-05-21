import { useCallback, useState } from 'preact/hooks'
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

  const extract = useCallback((mode: SelectionMode) => {
    setLoading(true)
    setError(null)
    setProgress(null)

    // Accumulate cleanup functions; resolved before any callback fires (synchronous registration)
    const cleanup: Array<() => void> = []

    const done = () => {
      cleanup.forEach((fn) => fn())
      setLoading(false)
      setProgress(null)
    }

    cleanup.push(
      on<ExtractCompleteHandler>('EXTRACT_COMPLETE', (result) => {
        setIr(result)
        done()
      })
    )

    cleanup.push(
      on<ExtractErrorHandler>('EXTRACT_ERROR', (message) => {
        setError(message)
        done()
      })
    )

    cleanup.push(
      on<ExtractProgressHandler>('EXTRACT_PROGRESS', (p) => {
        setProgress(p)
      })
    )

    emit<ExtractRequestHandler>('EXTRACT_REQUEST', mode, {})
  }, [])

  return { ir, loading, error, progress, extract }
}

