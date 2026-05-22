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

/**
 * sandbox → UI: the Figma canvas selection changed.
 * The UI uses this to re-trigger auto-extract when mode is 'selection' or 'section'.
 */
export interface SelectionChangedHandler extends EventHandler {
  name: 'SELECTION_CHANGED'
  handler: () => void
}

/** UI → sandbox: lightweight pre-flight count of nodes for a given mode */
export interface NodeCountRequestHandler extends EventHandler {
  name: 'NODE_COUNT_REQUEST'
  handler: (mode: SelectionMode) => void
}

/**
 * sandbox → UI: result of a NODE_COUNT_REQUEST.
 * count is the total number of scene nodes in scope; -1 means resolveRoots threw
 * (e.g. no sections selected when mode === 'section').
 */
export interface NodeCountResponseHandler extends EventHandler {
  name: 'NODE_COUNT_RESPONSE'
  handler: (count: number) => void
}

/**
 * sandbox → UI: the user navigated to a different FigJam page.
 * The UI uses this to re-trigger auto-extract for 'page' and 'viewport' modes
 * (selection-change events don't fire on page navigation).
 */
export interface PageChangedHandler extends EventHandler {
  name: 'PAGE_CHANGED'
  handler: () => void
}

/**
 * sandbox → UI: the visible canvas area changed (pan or zoom).
 * Emitted by a polling loop in main.ts because the Plugin API has no native
 * viewport-change event. The UI uses this to re-trigger auto-extract when
 * mode is 'viewport'.
 */
export interface ViewportChangedHandler extends EventHandler {
  name: 'VIEWPORT_CHANGED'
  handler: () => void
}

