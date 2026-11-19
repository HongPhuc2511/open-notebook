'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Network } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/lib/hooks/use-translation'

export interface MindMapConfigValues {
  sourceIds: string[]
  language: string
  topic: string
  openWhenDone: boolean
}

interface MindMapConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sources: { id: string; title: string }[]
  defaultSelectedIds: string[]
  onSubmit: (values: MindMapConfigValues) => void
}

// value = language name sent to the backend; label = how it shows in the list
const LANGUAGES = [
  { value: 'Vietnamese', label: 'Tiếng Việt' },
  { value: 'English', label: 'English' },
  { value: 'Chinese', label: '中文' },
  { value: 'Japanese', label: '日本語' },
  { value: 'Korean', label: '한국어' },
  { value: 'French', label: 'Français' },
  { value: 'German', label: 'Deutsch' },
  { value: 'Spanish', label: 'Español' },
  { value: 'Portuguese', label: 'Português' },
  { value: 'Russian', label: 'Русский' },
  { value: 'Thai', label: 'ไทย' },
]

export function MindMapConfigDialog({
  open,
  onOpenChange,
  sources,
  defaultSelectedIds,
  onSubmit,
}: MindMapConfigDialogProps) {
  const { language: uiLanguage } = useTranslation()
  const tr = (vi: string, en: string) => (uiLanguage?.startsWith('vi') ? vi : en)

  const [lang, setLang] = useState('auto')
  const [selected, setSelected] = useState<string[]>([])
  const [topic, setTopic] = useState('')

  // Start from the sources currently ticked in the Sources column each time the dialog opens
  useEffect(() => {
    if (open) setSelected(defaultSelectedIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const allSelected = sources.length > 0 && selected.length === sources.length
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const submit = (openWhenDone: boolean) =>
    onSubmit({ sourceIds: selected, language: lang, topic: topic.trim(), openWhenDone })

  const canSubmit = selected.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-6" style={{ width: 'calc(100% - 2rem)', maxWidth: '32rem', borderRadius: 28 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-normal">
            <Network className="h-5 w-5 text-teal" />
            {tr('Sơ đồ tư duy', 'Mind map')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{tr('Chọn ngôn ngữ', 'Choose language')}</label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{tr('Giống ngôn ngữ của nguồn', 'Same as sources')}</SelectItem>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{tr('Nguồn', 'Sources')}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 w-full justify-between rounded-full font-normal">
                  <span className="truncate">
                    {selected.length} {tr('nguồn', 'sources')}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-2">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted">
                  {tr('Chọn tất cả', 'Select all')}
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => setSelected(checked ? sources.map((s) => s.id) : [])}
                  />
                </label>
                <div className="max-h-64 overflow-y-auto">
                  {sources.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted"
                    >
                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">{tr('Chủ đề nên là gì?', 'What should the topic be?')}</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder={tr(
              'Những điều nên thử\n• Giới hạn trong một nguồn cụ thể (ví dụ: "bài viết về nước Ý")\n• Tập trung vào các khái niệm chính\n• Tạo sơ đồ giúp tôi tìm hiểu các nguyên nhân dẫn đến một sự kiện',
              'Things to try\n• Limit it to one specific source (e.g. "the article about Italy")\n• Focus on the key concepts\n• Build a map that helps me study the causes of an event'
            )}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" className="rounded-full" disabled={!canSubmit} onClick={() => submit(false)}>
            {tr('Tạo sau', 'Create later')}
          </Button>
          <Button variant="tonal" className="rounded-full" disabled={!canSubmit} onClick={() => submit(true)}>
            {tr('Tạo ngay', 'Create now')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
