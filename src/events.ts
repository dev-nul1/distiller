import type { EventHandler } from '@create-figma-plugin/utilities'
import type { ExportIR, ExtractOptions, SelectionMode } from './types'

/** UI → sandbox: begin extraction with the given mode and options */
export interface ExtractRequestHandler extends EventHandler {
  name: 'EXTRACT_REQUEST'
  handler: (mode: SelectionMode, options: ExtractOptions) => void
}

/** sandbox → UI: incremental progress for large pages */
export interface ExtractProgressHandler extends EventHandler {
  name: 'EXTRACT_PROGRESS'
  handler: (progress: { processed: number; total: number }) => void
}

/** sandbox → UI: extraction finished, payload is the full IR */
export interface ExtractCompleteHandler extends EventHandler {
  name: 'EXTRACT_COMPLETE'
  handler: (ir: ExportIR) => void
}

/** sandbox → UI: extraction failed, payload is a human-readable message */
export interface ExtractErrorHandler extends EventHandler {
  name: 'EXTRACT_ERROR'
  handler: (message: string) => void
}

