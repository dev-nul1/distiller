import { h } from 'preact'
import { Button } from '@create-figma-plugin/ui'

type Props = {
  showPreview: boolean
  onCopy: () => void
  onDownload: () => void
  loading: boolean
  hasIR: boolean
}

export function ActionButtons({ showPreview, onCopy, onDownload, loading, hasIR }: Props) {
  // Only disable Copy when there is genuinely nothing to copy AND we are not
  // loading. Combining loading+disabled on this library's Button renders it grey
  // instead of showing a blue spinner — so never disable while in-flight.
  const copyDisabled = !loading && showPreview && !hasIR
  const downDisabled = loading || (showPreview && !hasIR)

  return (
    <div class="flex gap-2 px-2 pb-2">
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
    </div>
  )
}
