import type { EventHandler } from '@create-figma-plugin/utilities'
import type { ExportIR, ExtractOptions, PluginSettings, SelectionMode } from './types'

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

/** UI → sandbox: request stored settings (sent once on mount) */
export interface LoadSettingsRequestHandler extends EventHandler {
  name: 'LOAD_SETTINGS_REQUEST'
  handler: () => void
}

/** sandbox → UI: persisted settings + whether the user has a non-empty selection */
export interface SettingsLoadedHandler extends EventHandler {
  name: 'SETTINGS_LOADED'
  handler: (settings: PluginSettings, hasSelection: boolean) => void
}

/** UI → sandbox: persist updated settings */
export interface SaveSettingsHandler extends EventHandler {
  name: 'SAVE_SETTINGS'
  handler: (settings: PluginSettings) => void
}

/** UI → sandbox: user dismissed the plugin */
export interface ClosePluginHandler extends EventHandler {
  name: 'CLOSE_PLUGIN'
  handler: () => void
}

