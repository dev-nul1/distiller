import { h } from 'preact'
import { Button } from '@create-figma-plugin/ui'

type Props = {
  onExtract: () => void
  onCopy: () => void
  onDownload: () => void
}

export function ActionButtons({ onExtract, onCopy, onDownload }: Props) {
  return (
    <div class="flex flex-col gap-2 px-2 pb-2">
      <Button onClick={onExtract} fullWidth>
        Extract
      </Button>
      <div class="flex gap-2">
        <div class="flex-1">
          <Button onClick={onCopy} secondary fullWidth>
            Copy
          </Button>
        </div>
        <div class="flex-1">
          <Button onClick={onDownload} secondary fullWidth>
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}
