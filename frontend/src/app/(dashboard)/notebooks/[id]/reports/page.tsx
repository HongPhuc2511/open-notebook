
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'

import {
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Save,
  ArrowLeft,
  Clock,
} from 'lucide-react'

type ReportStatus =
  | 'draft'
  | 'collecting'
  | 'analyzing'
  | 'generating'
  | 'review'
  | 'completed'
  | 'failed'

interface Report {
  id: string
  notebook_id: string
  title: string
  description: string
  status: ReportStatus
  config: Record<string, unknown>
  current_version: number
  created: string
  updated: string
}

const statuses: ReportStatus[] = [
  'draft',
  'collecting',
  'analyzing',
  'generating',
  'review',
  'completed',
  'failed',
]

const statusLabels: Record<ReportStatus, string> = {
  draft: 'Bản nháp',
  collecting: 'Đang thu thập',
  analyzing: 'Đang phân tích',
  generating: 'Đang tạo báo cáo',
  review: 'Chờ duyệt',
  completed: 'Hoàn thành',
  failed: 'Thất bại',
}

export default function NotebookReportsPage() {
  const params = useParams()
  const router = useRouter()
  const notebookId = decodeURIComponent(params.id as string)

  const [reports, setReports] = useState<Report[]>([])
  const [selected, setSelected] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState<ReportStatus>('draft')

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.get<Report[]>(
        `/notebooks/${encodeURIComponent(notebookId)}/reports`
      )

      setReports(response.data)

      setSelected((current) => {
        if (!current) return null
        return response.data.find((item) => item.id === current.id) ?? null
      })
    } catch {
      setError('Không thể tải danh sách báo cáo. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [notebookId])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  useEffect(() => {
    if (!selected) return
    setEditTitle(selected.title)
    setEditDescription(selected.description)
    setEditStatus(selected.status)
  }, [selected])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!newTitle.trim()) return

    setSaving(true)
    setError('')

    try {
      const response = await apiClient.post<Report>('/reports', {
        notebook_id: notebookId,
        title: newTitle.trim(),
        description: newDescription.trim(),
        config: {},
      })

      setReports((previous) => [response.data, ...previous])
      setSelected(response.data)
      setNewTitle('')
      setNewDescription('')
    } catch {
      setError('Không thể tạo báo cáo. Vui lòng kiểm tra lại.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected || !editTitle.trim()) return

    setSaving(true)
    setError('')

    try {
      const response = await apiClient.put<Report>(
        `/reports/${encodeURIComponent(selected.id)}`,
        {
          title: editTitle.trim(),
          description: editDescription.trim(),
          status: editStatus,
        }
      )

      setReports((previous) =>
        previous.map((item) =>
          item.id === response.data.id ? response.data : item
        )
      )
      setSelected(response.data)
    } catch {
      setError('Không thể cập nhật báo cáo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (report: Report) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${report.title}"?`)) return

    setSaving(true)
    setError('')

    try {
      await apiClient.delete(`/reports/${encodeURIComponent(report.id)}`)
      setReports((previous) =>
        previous.filter((item) => item.id !== report.id)
      )

      if (selected?.id === report.id) {
        setSelected(null)
      }
    } catch {
      setError('Không thể xóa báo cáo.')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (value: string) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleString('vi-VN')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/notebooks/${encodeURIComponent(notebookId)}`)}
              aria-label="Quay lại Notebook"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Reports
              </h1>
              <p className="text-sm text-muted-foreground">
                Quản lý các báo cáo trong Notebook này
              </p>
            </div>
          </div>

          <Button variant="outline" onClick={() => void loadReports()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-5">
            <section className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                <h2 className="font-semibold">Tạo báo cáo mới</h2>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Tên báo cáo..."
                  maxLength={300}
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />

                <textarea
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  placeholder="Mô tả báo cáo..."
                  rows={3}
                  className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />

                <Button type="submit" disabled={saving || !newTitle.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo báo cáo
                </Button>
              </form>
            </section>

            <section className="rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="font-semibold">Danh sách báo cáo</h2>
                <span className="text-xs text-muted-foreground">
                  {reports.length} báo cáo
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Đang tải báo cáo...
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Chưa có báo cáo nào trong Notebook này.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => setSelected(report)}
                      className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                        selected?.id === report.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium">
                              {report.title}
                            </span>
                          </div>

                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {report.description || 'Chưa có mô tả'}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full bg-muted px-2 py-1">
                              {statusLabels[report.status]}
                            </span>
                            <span>v{report.current_version}</span>
                            <span>{formatDate(report.updated)}</span>
                          </div>
                        </div>

                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Xóa ${report.title}`}
                          className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDelete(report)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleDelete(report)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="min-h-[400px] rounded-xl border bg-card">
            {selected ? (
              <>
                <div className="flex items-center justify-between border-b p-5">
                  <div>
                    <h2 className="font-semibold">Thông tin báo cáo</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Chỉnh sửa thông tin và trạng thái
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelected(null)}
                    aria-label="Đóng chi tiết"
                  >
                    ×
                  </Button>
                </div>

                <form onSubmit={handleUpdate} className="space-y-5 p-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tên báo cáo</label>
                    <input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      maxLength={300}
                      required
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mô tả</label>
                    <textarea
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      rows={5}
                      className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trạng thái</label>
                    <select
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(event.target.value as ReportStatus)
                      }
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <div className="mb-2 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Cập nhật: {formatDate(selected.updated)}
                    </div>
                    <div>Phiên bản hiện tại: v{selected.current_version}</div>
                    <div className="mt-1 break-all">ID: {selected.id}</div>
                  </div>

                  <Button
                    type="submit"
                    disabled={saving || !editTitle.trim()}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Lưu thay đổi
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/40" />
                <h2 className="font-medium">Chi tiết báo cáo</h2>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Chọn một báo cáo trong danh sách để xem và chỉnh sửa thông tin.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
