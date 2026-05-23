import { h } from 'preact'
import { Button, IconButton, IconHelp16 } from '@create-figma-plugin/ui'

type Props = {
  showPreview: boolean
  onCopy: () => void
  onDownload: () => void
  onOpenAbout: () => void
  loading: boolean
  /** True when there is real content to act on (or when preview is off). */
  hasContent: boolean
}

export function ActionButtons({ showPreview, onCopy, onDownload, onOpenAbout, loading, hasContent }: Props) {
  // Only disable Copy when there is genuinely nothing to copy AND we are not
  // loading. Combining loading+disabled on this library's Button renders it grey
  // instead of showing a blue spinner — so never disable while in-flight.
  const copyDisabled = !loading && showPreview && !hasContent
  const downDisabled = loading || (showPreview && !hasContent)

  return (
    <div class="flex items-center gap-2 px-2 pt-3 pb-2">
      <div class="flex-1">
        <Button onClick={onCopy} fullWidth loading={loading} disabled={copyDisabled}>
          Copy
        </Button>
      </div>
      <div class="flex-1">
        <Button onClick={onDownload} secondary fullWidth disabled={downDisabled}>
          Download
        </Button>
      </div>
      <IconButton onClick={onOpenAbout} title="Help & feedback">
        <IconHelp16 />
      </IconButton>
    </div>
  )
}
