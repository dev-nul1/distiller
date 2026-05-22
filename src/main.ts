import { emit, on, showUI } from '@create-figma-plugin/utilities'
import type {
  ClosePluginHandler,
  ExtractCompleteHandler,
  ExtractErrorHandler,
  ExtractProgressHandler,
  ExtractRequestHandler,
  LoadSettingsRequestHandler,
  SaveSettingsHandler,
  SettingsLoadedHandler,
} from './events'
import type { PluginSettings } from './types'
import { resolveRoots } from './sandbox/resolve-roots'
import { buildIR } from './sandbox/traverse'

const SETTINGS_KEY = 'pluginSettings'

const DEFAULT_SETTINGS: PluginSettings = {
  includeVotes: true,
  includeSections: true,
  csvExpandTables: true,
  showPreview: false,
}

export default function (): void {
  showUI({ height: 640, width: 400 })

  on<LoadSettingsRequestHandler>('LOAD_SETTINGS_REQUEST', async () => {
    const stored = await figma.clientStorage.getAsync(SETTINGS_KEY) as Partial<PluginSettings> | undefined
    const settings: PluginSettings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
    const hasSelection = figma.currentPage.selection.length > 0
    emit<SettingsLoadedHandler>('SETTINGS_LOADED', settings, hasSelection)
  })

  on<SaveSettingsHandler>('SAVE_SETTINGS', async (settings) => {
    await figma.clientStorage.setAsync(SETTINGS_KEY, settings)
  })

  on<ClosePluginHandler>('CLOSE_PLUGIN', () => {
    figma.closePlugin()
  })

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

