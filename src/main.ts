import { emit, on, showUI } from '@create-figma-plugin/utilities'
import type {
  ExtractCompleteHandler,
  ExtractErrorHandler,
  ExtractProgressHandler,
  ExtractRequestHandler,
} from './events'
import { resolveRoots } from './sandbox/resolve-roots'
import { buildIR } from './sandbox/traverse'

export default function (): void {
  showUI({ height: 520, width: 400 })

  on<ExtractRequestHandler>('EXTRACT_REQUEST', (mode, _options) => {
    try {
      emit<ExtractProgressHandler>('EXTRACT_PROGRESS', { processed: 0, total: 0 })
      const roots = resolveRoots(mode)
      const ir = buildIR(roots, mode)
      emit<ExtractCompleteHandler>('EXTRACT_COMPLETE', ir)
    } catch (err) {
      emit<ExtractErrorHandler>(
        'EXTRACT_ERROR',
        err instanceof Error ? err.message : String(err)
      )
    }
  })
}

