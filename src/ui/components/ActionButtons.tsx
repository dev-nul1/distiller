import { h } from 'preact'
import { Button } from '@create-figma-plugin/ui'

type Props = {
  onExtract: () => void
  onCopy: () => void
  onDownload: () => void
  loading: boolean
  hasIR: boolean
}

export function ActionButtons({ onExtract, onCopy, onDownload, loading, hasIR }: Props) {
  return (
    <div class="flex flex-col gap-2 px-2 pb-2">
      <Button onClick={onExtract} fullWidth disabled={loading}>
        {loading ? 'Extracting…' : 'Extract'}
      </Button>
      <div class="flex gap-2">
        <div class="flex-1">
          <Button onClick={onCopy} secondary fullWidth disabled={!hasIR || loading}>
            Copy
          </Button>
        </div>
        <div class="flex-1">
          <Button onClick={onDownload} secondary fullWidth disabled={!hasIR || loading}>
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}
