'use client'

import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'

interface RenameOutputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTitle: string
  isSaving?: boolean
  onSubmit: (title: string) => void
}

// The form lives inside DialogContent, which unmounts when the dialog closes,
// so the input starts from the current title every time it opens.
function RenameForm({
  initialTitle,
  isSaving,
  onCancel,
  onSubmit,
}: {
  initialTitle: string
  isSaving?: boolean
  onCancel: () => void
  onSubmit: (title: string) => void
}) {
  const { language } = useTranslation()
  const tr = (vi: string, en: string) => (language?.startsWith('vi') ? vi : en)

  const [value, setValue] = useState(initialTitle)
  const trimmed = value.trim()
  const canSave = trimmed.length > 0 && trimmed !== initialTitle.trim() && !isSaving

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) onSubmit(trimmed)
      }}
    >
      <input
        autoFocus
        value={value}
        maxLength={120}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={tr('Tên mới', 'New name')}
        placeholder={tr('Nhập tên mới', 'Enter a new name')}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" className="rounded-full" onClick={onCancel}>
          {tr('Hủy', 'Cancel')}
        </Button>
        <Button type="submit" variant="tonal" className="rounded-full" disabled={!canSave}>
          {tr('Lưu', 'Save')}
        </Button>
      </div>
    </form>
  )
}

export function RenameOutputDialog({
  open,
  onOpenChange,
  initialTitle,
  isSaving,
  onSubmit,
}: RenameOutputDialogProps) {
  const { language } = useTranslation()
  const tr = (vi: string, en: string) => (language?.startsWith('vi') ? vi : en)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-4 p-6"
        style={{
          width: 'calc(100% - 2rem)',
          maxWidth: '26rem',
          borderRadius: 28,
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-normal">
            <Pencil className="h-5 w-5 text-teal" />
            {tr('Đổi tên', 'Rename')}
          </DialogTitle>
        </DialogHeader>

        <RenameForm
          initialTitle={initialTitle}
          isSaving={isSaving}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
