'use client'

import { useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'

interface MindMapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string | null
  markdown: string
}

export function MindMapDialog({ open, onOpenChange, title, markdown }: MindMapDialogProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mmRef = useRef<any>(null)

  useEffect(() => {
    if (!open || !markdown) return
    let cancelled = false

    ;(async () => {
      // Dynamic import: markmap touches document, so keep it out of SSR
      const [{ Transformer }, { Markmap }] = await Promise.all([
        import('markmap-lib'),
        import('markmap-view'),
      ])
      if (cancelled || !svgRef.current) return
      const { root } = new Transformer().transform(markdown)
      svgRef.current.innerHTML = ''
      mmRef.current = Markmap.create(svgRef.current, { autoFit: true, duration: 300 }, root)
    })()

    return () => {
      cancelled = true
      mmRef.current?.destroy?.()
      mmRef.current = null
    }
  }, [open, markdown])

  const downloadSvg = () => {
    if (!svgRef.current) return
    const xml = new XMLSerializer().serializeToString(svgRef.current)
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
    const a = document.createElement('a')
    a.href = url
    a.download = (title || 'mindmap') + '.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-w-5xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="truncate">{title || 'Mind map'}</DialogTitle>
        </DialogHeader>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-muted/30">
          <svg ref={svgRef} className="h-full w-full" />
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            <Button size="icon" variant="outline" onClick={() => mmRef.current?.fit()}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => mmRef.current?.rescale(1.25)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => mmRef.current?.rescale(0.8)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={downloadSvg}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
