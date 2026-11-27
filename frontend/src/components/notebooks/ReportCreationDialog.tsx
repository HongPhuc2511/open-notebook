
'use client'

import { useEffect, useState } from 'react'
import {
  BookOpen,
  FileText,
  GraduationCap,
  ChartNoAxesCombined,
  Sparkles,
  Check,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import type { SourceListResponse } from '@/lib/types/api'

export type ReportFormat = 'interactive' | 'document'

export interface ReportGenerationRequest {
  title: string
  format: ReportFormat
  template: string
  instructions: string
  sourceIds: string[]
}

interface ReportCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sources: SourceListResponse[]
  defaultSelectedIds: string[]
  onSubmit: (request: ReportGenerationRequest) => void
}

const templates = [
  {
    id: 'research',
    title: 'Research report',
    description: 'Structured research with findings and evidence.',
    icon: BookOpen,
  },
  {
    id: 'analytical',
    title: 'In-depth analysis',
    description: 'Analyze themes, trends and implications.',
    icon: ChartNoAxesCombined,
  },
  {
    id: 'learning',
    title: 'Study guide',
    description: 'Organize concepts into a learning document.',
    icon: GraduationCap,
  },
  {
    id: 'custom',
    title: 'Custom report',
    description: 'Create a report based on your instructions.',
    icon: FileText,
  },
]

const getSourceTitle = (source: SourceListResponse) =>
  (source as SourceListResponse & { title?: string | null }).title ||
  source.id

export function ReportCreationDialog({
  open,
  onOpenChange,
  sources,
  defaultSelectedIds,
  onSubmit,
}: ReportCreationDialogProps) {
  const [format, setFormat] = useState<ReportFormat>('interactive')
  const [template, setTemplate] = useState('research')
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedIds)

  useEffect(() => {
    if (open) {
      setSelectedIds(defaultSelectedIds)
    }
  }, [open, defaultSelectedIds])

  const toggleSource = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  const handleSubmit = () => {
    if (selectedIds.length === 0) return

    onSubmit({
      title: title.trim() || 'New report',
      format,
      template,
      instructions: instructions.trim(),
      sourceIds: selectedIds,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>

            <div>
              <DialogTitle>Tạo báo cáo</DialogTitle>
              <DialogDescription>
                Tạo báo cáo từ các nguồn dữ liệu trong Notebook.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-2">
            <label className="text-sm font-medium">
              Tên báo cáo
            </label>

            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Nhập tên báo cáo..."
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              Định dạng báo cáo
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('interactive')}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  format === 'interactive'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {format === 'interactive' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>

                <p className="text-sm font-medium">
                  Interactive report
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Báo cáo có cấu trúc, dễ đọc và tương tác.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('document')}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  format === 'document'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <FileText className="h-5 w-5 text-primary" />
                  {format === 'document' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>

                <p className="text-sm font-medium">Document</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tài liệu văn bản có chương mục.
                </p>
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              Mẫu báo cáo
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {templates.map((item) => {
                const Icon = item.icon
                const active = template === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id)}
                    className={`flex gap-3 rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                    <span>
                      <span className="block text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Nguồn dữ liệu
              </h3>

              <span className="text-xs text-muted-foreground">
                {selectedIds.length}/{sources.length} đã chọn
              </span>
            </div>

            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2">
              {sources.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Notebook chưa có nguồn dữ liệu.
                </p>
              ) : (
                sources.map((source) => (
                  <label
                    key={source.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedIds.includes(source.id)}
                      onCheckedChange={() => toggleSource(source.id)}
                    />

                    <span className="truncate text-sm">
                      {getSourceTitle(source)}
                    </span>
                  </label>
                ))
              )}
            </div>
          </section>

          <section className="space-y-2">
            <label className="text-sm font-medium">
              Yêu cầu bổ sung
            </label>

            <Textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={4}
              placeholder="Ví dụ: tập trung vào xu hướng chính, phân tích số liệu, đưa ra nhận định và đề xuất..."
            />
          </section>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={selectedIds.length === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Tạo báo cáo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
