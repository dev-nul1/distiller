import type { ExportIR, RenderOpts } from '../../types'
import { renderMarkdown } from './markdown'

export function renderLlm(ir: ExportIR, opts: RenderOpts): string {
  const { fileName, pageName, extractedAt } = ir.meta

  const preamble = [
    '# FigJam Workshop Export',
    '',
    'This is an export from a FigJam collaborative session. The structure below',
    'reflects the workshop\'s organization:',
    '- Headings are sections the facilitator created',
    '- Bullet items are sticky notes, text, or labeled shapes',
    '- Vote counts (when present) indicate participant prioritization',
    '',
    `Source: ${fileName} / ${pageName}`,
    `Exported: ${extractedAt}`,
    '',
    '---',
    '',
  ].join('\n')

  return preamble + renderMarkdown(ir, opts)
}

