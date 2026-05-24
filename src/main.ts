import { emit, on, showUI } from '@create-figma-plugin/utilities'
import type {
  ClosePluginHandler,
  ExtractCompleteHandler,
  ExtractErrorHandler,
  ExtractRequestHandler,
  LoadSettingsRequestHandler,
  NodeCountRequestHandler,
  NodeCountResponseHandler,
  OpenExternalHandler,
  PageChangedHandler,
  ResizeWindowHandler,
  SaveSettingsHandler,
  SelectionChangedHandler,
  SettingsLoadedHandler,
  ViewportChangedHandler,
} from './events'
import type { PluginSettings } from './types'
import { resolveRoots } from './sandbox/resolve-roots'
import { buildIR } from './sandbox/traverse'

const SETTINGS_KEY = 'pluginSettings'

/**
 * Schema version for persisted settings. Bump when a field is added or renamed.
 * v1 (unversioned): includeVotes, includeSections, csvExpandTables, showPreview, includeAuthors
 * v2: added aiOptimized (default true). Also retires the 'llm' format — users who
 *     had that format selected get Markdown + AI-optimized-on (equivalent output).
 */
const SETTINGS_SCHEMA_VERSION = 2

const DEFAULT_SETTINGS: PluginSettings = {
  includeVotes: true,
  includeSections: true,
  csvExpandTables: true,
  showPreview: false,
  includeAuthors: false,
  aiOptimized: true,
}

export default function (): void {
  showUI({ height: 640, width: 400 })

  // Forward canvas selection changes to the UI so it can re-trigger auto-extract.
  figma.on('selectionchange', () => {
    emit<SelectionChangedHandler>('SELECTION_CHANGED')
  })

  // Forward page navigation to the UI so 'page' and 'viewport' modes re-extract.
  // selectionchange does not fire when the user switches pages.
  figma.on('currentpagechange', () => {
    emit<PageChangedHandler>('PAGE_CHANGED')
  })

  // The Plugin API has no viewport-change event, so we poll bounds every 500 ms.
  // Math.round avoids false positives from sub-pixel floating-point drift.
  // The UI only reacts when mode === 'viewport'; all other modes ignore this event.
  let lastVP = (() => {
    const { x, y, width, height } = figma.viewport.bounds
    return { x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }
  })()
  setInterval(() => {
    const { x, y, width, height } = figma.viewport.bounds
    const nx = Math.round(x), ny = Math.round(y), nw = Math.round(width), nh = Math.round(height)
    if (nx !== lastVP.x || ny !== lastVP.y || nw !== lastVP.w || nh !== lastVP.h) {
      lastVP = { x: nx, y: ny, w: nw, h: nh }
      emit<ViewportChangedHandler>('VIEWPORT_CHANGED')
    }
  }, 500)

  on<LoadSettingsRequestHandler>('LOAD_SETTINGS_REQUEST', async () => {
    type StoredConfig = PluginSettings & { schemaVersion?: number }
    const raw = await figma.clientStorage.getAsync(SETTINGS_KEY) as StoredConfig | undefined
    // Spread-merge: any missing field (e.g. aiOptimized for v1 stored data) takes its
    // DEFAULT_SETTINGS value. This is the v1→v2 migration: old users get aiOptimized:true.
    const settings: PluginSettings = { ...DEFAULT_SETTINGS, ...(raw ?? {}) }
    // Stamp the current schema version on the stored record if it's out of date.
    if ((raw?.schemaVersion ?? 0) < SETTINGS_SCHEMA_VERSION) {
      await figma.clientStorage.setAsync(SETTINGS_KEY, { ...settings, schemaVersion: SETTINGS_SCHEMA_VERSION })
    }
    const hasSelection = figma.currentPage.selection.length > 0
    emit<SettingsLoadedHandler>('SETTINGS_LOADED', settings, hasSelection)
  })

  on<SaveSettingsHandler>('SAVE_SETTINGS', async (settings) => {
    await figma.clientStorage.setAsync(SETTINGS_KEY, settings)
  })

  on<ClosePluginHandler>('CLOSE_PLUGIN', () => {
    figma.closePlugin()
  })

  on<ResizeWindowHandler>('RESIZE_WINDOW', ({ width, height }) => {
    figma.ui.resize(width, height)
  })

  on<OpenExternalHandler>('OPEN_EXTERNAL', (url) => {
    figma.openExternal(url)
  })

  on<NodeCountRequestHandler>('NODE_COUNT_REQUEST', (mode) => {
    try {
      const roots = resolveRoots(mode)
      let count = roots.length
      for (const root of roots) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ('findAll' in root && typeof (root as any).findAll === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          count += (root as any).findAll().length
        }
      }
      emit<NodeCountResponseHandler>('NODE_COUNT_RESPONSE', count)
    } catch {
      emit<NodeCountResponseHandler>('NODE_COUNT_RESPONSE', -1)
    }
  })

  on<ExtractRequestHandler>('EXTRACT_REQUEST', (mode, requestId) => {
    try {
      const roots = resolveRoots(mode)
      const ir = buildIR(roots, mode)
      emit<ExtractCompleteHandler>('EXTRACT_COMPLETE', ir, requestId)
    } catch (err) {
      emit<ExtractErrorHandler>(
        'EXTRACT_ERROR',
        err instanceof Error ? err.message : String(err),
        requestId
      )
    }
  })
}

