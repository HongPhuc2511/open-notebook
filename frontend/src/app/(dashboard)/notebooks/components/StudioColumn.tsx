
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  ClipboardList,
  Layers,
  MoreVertical,
  Network,
  Pencil,
  Sparkles,
  Trash2,
  FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { NoteResponse, SourceListResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import {
  CollapsibleColumn,
  createCollapseButton,
} from '@/components/notebooks/CollapsibleColumn'
import { MindMapDialog } from '@/components/notebooks/MindMapDialog'
import {
  MindMapConfigDialog,
  type MindMapConfigValues,
} from '@/components/notebooks/MindMapConfigDialog'
import { useNotebookColumnsStore } from '@/lib/stores/notebook-columns-store'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useDeleteNote, useUpdateNote } from '@/lib/hooks/use-notes'
import { RenameOutputDialog } from '@/components/notebooks/RenameOutputDialog'
import { useGenerateMindMap } from '@/lib/hooks/use-mindmap'
import { mindmapApi } from '@/lib/api/mindmap'
import { quizApi, parseQuiz, type QuizData } from '@/lib/api/quiz'
import { useGenerateQuiz } from '@/lib/hooks/use-quiz'
import { QuizDialog } from '@/components/notebooks/QuizDialog'
import {
  QuizConfigDialog,
  type QuizConfigValues,
} from '@/components/notebooks/QuizConfigDialog'
import {
  flashcardsApi,
  parseFlashcards,
  type FlashcardsData,
} from '@/lib/api/flashcards'
import { useGenerateFlashcards } from '@/lib/hooks/use-flashcards'
import { FlashcardsDialog } from '@/components/notebooks/FlashcardsDialog'
import {
  FlashcardsConfigDialog,
  type FlashcardsConfigValues,
} from '@/components/notebooks/FlashcardsConfigDialog'
import { getDateLocale } from '@/lib/utils/date-locale'
import { reportsApi, type ReportResponse } from '@/lib/api/reports'
import type { ContextMode, NoteContextMode } from '../[id]/page'
import type { NoteContextDefault } from '@/lib/utils/source-context'
import {
  ReportCreationDialog,
  type ReportGenerationRequest,
} from '@/components/notebooks/ReportCreationDialog'

interface StudioColumnProps {
  sources?: SourceListResponse[]
  sourceContextSelections?: Record<string, ContextMode>
  notes?: NoteResponse[]
  isLoading: boolean
  notebookId: string
  contextSelections?: Record<string, NoteContextMode>
  onContextModeChange?: (noteId: string, mode: NoteContextMode) => void
  onBulkContextModeChange?: (action: NoteContextDefault) => void
  onGenerateReport: (request: ReportGenerationRequest) => void
}

interface StudioTool {
  id: string
  label: string
  icon: LucideIcon
  busy?: boolean
  onClick: () => void
}

type OutputKind = 'mindmap' | 'quiz' | 'flashcards'

const outputKind = (note: NoteResponse): OutputKind | null => {
  if (note.note_type === 'mindmap') return 'mindmap'
  if (note.note_type === 'quiz') return 'quiz'
  if (note.note_type === 'flashcards') return 'flashcards'
  return null
}

function PendingRow({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon
  title: string
  hint: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5 animate-pulse text-teal" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium">{title}</h4>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}

const sourceTitle = (s: SourceListResponse) =>
  (s as unknown as { title?: string | null }).title || s.id

export function StudioColumn({
  sources,
  sourceContextSelections,
  notes,
  isLoading,
  notebookId,
  onGenerateReport,
}: StudioColumnProps) {
  const { t, language } = useTranslation()

  const tr = (vi: string, en: string) =>
    language?.startsWith('vi') ? vi : en

  const studioLabel = t('notebooks.studioTitle')
  const mindMapLabel = tr('Sơ đồ tư duy', 'Mind map')
  const quizLabel = tr('Bài kiểm tra', 'Quiz')
  const flashcardsLabel = tr('Thẻ ghi nhớ', 'Flashcards')

  const { notesCollapsed, toggleNotes } = useNotebookColumnsStore()

  const collapseButton = useMemo(
    () => createCollapseButton(toggleNotes, studioLabel, 'right'),
    [toggleNotes, studioLabel]
  )

  const [configOpen, setConfigOpen] = useState(false)
  const [mindMapOpen, setMindMapOpen] = useState(false)
  const [mindMap, setMindMap] = useState<{
    title?: string | null
    markdown: string
  } | null>(null)

  const [flashConfigOpen, setFlashConfigOpen] = useState(false)
  const [flashOpen, setFlashOpen] = useState(false)
  const [flash, setFlash] = useState<{
    title?: string | null
    data: FlashcardsData
  } | null>(null)

  const [quizConfigOpen, setQuizConfigOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [quiz, setQuiz] = useState<{
    title?: string | null
    data: QuizData
  } | null>(null)

  const [reportConfigOpen, setReportConfigOpen] = useState(false)

  // Saved Reports
  const [reports, setReports] = useState<ReportResponse[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  const loadReports = useCallback(async () => {
    try {
      const items = await reportsApi.list(notebookId)
      setReports(items)
    } catch (error) {
      console.error('Failed to load notebook reports:', error)
    } finally {
      setReportsLoading(false)
    }
  }, [notebookId])

  useEffect(() => {
    void loadReports()

    const handleReportsUpdated = () => {
      void loadReports()
    }

    window.addEventListener('notebook-reports-updated', handleReportsUpdated)

    return () => {
      window.removeEventListener(
        'notebook-reports-updated',
        handleReportsUpdated
      )
    }
  }, [loadReports])

  const handleOpenReport = (report: ReportResponse) => {
    setSelectedReportId((current) =>
      current === report.id ? null : report.id
    )
  }

  const getReportContent = (report: ReportResponse) => {
    const content = report.config?.content
    return typeof content === 'string' ? content : ''
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)
  const [noteToRename, setNoteToRename] = useState<NoteResponse | null>(null)

  const generateMindMap = useGenerateMindMap()
  const generateQuiz = useGenerateQuiz()
  const generateFlashcards = useGenerateFlashcards()
  const deleteNote = useDeleteNote()
  const updateNote = useUpdateNote()

  const outputs = useMemo(
    () =>
      (notes ?? []).flatMap((note) => {
        const kind = outputKind(note)
        return kind ? [{ note, kind }] : []
      }),
    [notes]
  )

  const configSources = useMemo(
    () => (sources ?? []).map((s) => ({ id: s.id, title: sourceTitle(s) })),
    [sources]
  )

  const defaultSelectedIds = useMemo(
    () =>
      (sources ?? [])
        .filter((s) => sourceContextSelections?.[s.id] !== 'off')
        .map((s) => s.id),
    [sources, sourceContextSelections]
  )

  const handleSubmitConfig = async (values: MindMapConfigValues) => {
    setConfigOpen(false)

    try {
      const note = await generateMindMap.mutateAsync({
        notebookId,
        sourceIds: values.sourceIds,
        language: values.language,
        topic: values.topic,
      })

      if (values.openWhenDone) {
        setMindMap({
          title: note.title,
          markdown: note.content ?? '',
        })
        setMindMapOpen(true)
      } else {
        toast.success(
          tr(
            'Sơ đồ tư duy đã sẵn sàng trong Studio',
            'Your mind map is ready in Studio'
          )
        )
      }
    } catch {
      // Error toast is shown by the hook.
    }
  }

  const handleOpenMindMap = async (note: NoteResponse) => {
    try {
      const full = await mindmapApi.get(note.id)

      setMindMap({
        title: full.title,
        markdown: full.content ?? '',
      })
      setMindMapOpen(true)
    } catch {
      toast.error(
        tr('Không mở được sơ đồ tư duy', 'Failed to open mind map')
      )
    }
  }

  const showQuiz = (title: string | null, content: string | null) => {
    const data = parseQuiz(content)

    if (!data) {
      toast.error(
        tr('Không mở được bài kiểm tra', 'Failed to open quiz')
      )
      return
    }

    setQuiz({ title, data })
    setQuizOpen(true)
  }

  const handleSubmitQuizConfig = async (values: QuizConfigValues) => {
    setQuizConfigOpen(false)

    try {
      const note = await generateQuiz.mutateAsync({
        notebookId,
        sourceIds: values.sourceIds,
        language: values.language,
        topic: values.topic,
        questionCount: values.questionCount,
        difficulty: values.difficulty,
        questionTypes: values.questionTypes,
      })

      if (values.openWhenDone) {
        showQuiz(note.title, note.content)
      } else {
        toast.success(
          tr(
            'Bài kiểm tra đã sẵn sàng trong Studio',
            'Your quiz is ready in Studio'
          )
        )
      }
    } catch {
      // Error toast is shown by the hook.
    }
  }

  const handleOpenQuiz = async (note: NoteResponse) => {
    try {
      const full = await quizApi.get(note.id)
      showQuiz(full.title, full.content)
    } catch {
      toast.error(
        tr('Không mở được bài kiểm tra', 'Failed to open quiz')
      )
    }
  }

  const showFlashcards = (
    title: string | null,
    content: string | null
  ) => {
    const data = parseFlashcards(content)

    if (!data) {
      toast.error(
        tr('Không mở được thẻ ghi nhớ', 'Failed to open flashcards')
      )
      return
    }

    setFlash({ title, data })
    setFlashOpen(true)
  }

  const handleSubmitFlashConfig = async (
    values: FlashcardsConfigValues
  ) => {
    setFlashConfigOpen(false)

    try {
      const note = await generateFlashcards.mutateAsync({
        notebookId,
        sourceIds: values.sourceIds,
        language: values.language,
        topic: values.topic,
        cardCount: values.cardCount,
        difficulty: values.difficulty,
      })

      if (values.openWhenDone) {
        showFlashcards(note.title, note.content)
      } else {
        toast.success(
          tr(
            'Thẻ ghi nhớ đã sẵn sàng trong Studio',
            'Your flashcards are ready in Studio'
          )
        )
      }
    } catch {
      // Error toast is shown by the hook.
    }
  }

  const handleOpenFlashcards = async (note: NoteResponse) => {
    try {
      const full = await flashcardsApi.get(note.id)
      showFlashcards(full.title, full.content)
    } catch {
      toast.error(
        tr('Không mở được thẻ ghi nhớ', 'Failed to open flashcards')
      )
    }
  }

  const handleOpenOutput = (
    note: NoteResponse,
    kind: OutputKind
  ) => {
    if (kind === 'quiz') return handleOpenQuiz(note)
    if (kind === 'flashcards') return handleOpenFlashcards(note)
    return handleOpenMindMap(note)
  }

  const handleRenameSubmit = async (title: string) => {
    if (!noteToRename) return

    try {
      await updateNote.mutateAsync({
        id: noteToRename.id,
        data: { title },
      })
      setNoteToRename(null)
    } catch {
      // Error toast is shown by the hook.
    }
  }

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return

    try {
      await deleteNote.mutateAsync(noteToDelete)
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
    } catch (error) {
      console.error('Failed to delete mind map:', error)
    }
  }

  const tools: StudioTool[] = [
    {
      id: 'mindmap',
      label: mindMapLabel,
      icon: Network,
      busy: generateMindMap.isPending,
      onClick: () => setConfigOpen(true),
    },
    {
      id: 'quiz',
      label: quizLabel,
      icon: ClipboardList,
      busy: generateQuiz.isPending,
      onClick: () => setQuizConfigOpen(true),
    },
    {
      id: 'flashcards',
      label: flashcardsLabel,
      icon: Layers,
      busy: generateFlashcards.isPending,
      onClick: () => setFlashConfigOpen(true),
    },
    {
      id: 'reports',
      label: tr('Báo cáo', 'Reports'),
      icon: FileText,
      onClick: () => setReportConfigOpen(true),
    },
  ]

  return (
    <>
      <CollapsibleColumn
        isCollapsed={notesCollapsed}
        onToggle={toggleNotes}
        collapsedIcon={Sparkles}
        collapsedLabel={studioLabel}
      >
        <Card className="h-full flex flex-col flex-1 gap-3 overflow-hidden rounded-2xl bg-popover py-5">
          <CardHeader className="pb-0 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-normal text-foreground">
                {studioLabel}
              </CardTitle>
              {collapseButton}
            </div>
          </CardHeader>

          <CardContent className="flex-1 min-h-0 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {tools.map((tool) => {
                const Icon = tool.icon

                return (
                  <button
                    key={tool.id}
                    type="button"
                    disabled={tool.busy}
                    onClick={tool.onClick}
                    className="flex items-center gap-3 rounded-xl border bg-muted/40 px-3 py-3 text-left text-sm transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    <Icon
                      className={
                        tool.busy
                          ? 'h-5 w-5 shrink-0 animate-pulse text-teal'
                          : 'h-5 w-5 shrink-0 text-teal'
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {tool.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-1">
                {generateMindMap.isPending && (
                  <PendingRow
                    icon={Network}
                    title={tr(
                      'Đang tạo sơ đồ tư duy...',
                      'Generating mind map...'
                    )}
                    hint={tr(
                      'Có thể mất đến một phút',
                      'This can take up to a minute'
                    )}
                  />
                )}

                {generateQuiz.isPending && (
                  <PendingRow
                    icon={ClipboardList}
                    title={tr(
                      'Đang tạo bài kiểm tra...',
                      'Generating quiz...'
                    )}
                    hint={tr(
                      'Có thể mất đến một phút',
                      'This can take up to a minute'
                    )}
                  />
                )}

                {generateFlashcards.isPending && (
                  <PendingRow
                    icon={Layers}
                    title={tr(
                      'Đang tạo thẻ ghi nhớ...',
                      'Generating flashcards...'
                    )}
                    hint={tr(
                      'Có thể mất đến một phút',
                      'This can take up to a minute'
                    )}
                  />
                )}

                {outputs.map(({ note, kind }) => {
                  const OutputIcon =
                    kind === 'quiz'
                      ? ClipboardList
                      : kind === 'flashcards'
                        ? Layers
                        : Network

                  const kindLabel =
                    kind === 'quiz'
                      ? quizLabel
                      : kind === 'flashcards'
                        ? flashcardsLabel
                        : mindMapLabel

                  return (
                    <div
                      key={note.id}
                      className="group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                      onClick={() => handleOpenOutput(note, kind)}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background">
                        <OutputIcon className="h-5 w-5 text-teal" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium">
                          {note.title || kindLabel}
                        </h4>
                        <p className="truncate text-xs text-muted-foreground">
                          {kindLabel}
                          {' · '}
                          {formatDistanceToNow(new Date(note.updated), {
                            addSuffix: true,
                            locale: getDateLocale(language),
                          })}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 shrink-0 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setNoteToRename(note)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {tr('Đổi tên', 'Rename')}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setNoteToDelete(note.id)
                              setDeleteDialogOpen(true)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('notebooks.deleteNote')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })}

                {/* Saved AI Reports */}
                <div className="pt-3">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {tr('Báo cáo đã lưu', 'Saved reports')}
                    </h3>
                    {reportsLoading && <LoadingSpinner />}
                  </div>

                  {reports.map((report) => {
                    const isSelected = selectedReportId === report.id
                    const content = getReportContent(report)

                    return (
                      <div
                        key={report.id}
                        className="mb-2 overflow-hidden rounded-xl border"
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenReport(report)}
                          className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <FileText className="h-5 w-5 text-teal" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-medium">
                              {report.title || tr('Báo cáo không có tiêu đề', 'Untitled report')}
                            </h4>
                            <p className="truncate text-xs text-muted-foreground">
                              {tr('Báo cáo AI', 'AI report')}
                              {' · '}
                              {formatDistanceToNow(
                                new Date(report.updated || report.created),
                                {
                                  addSuffix: true,
                                  locale: getDateLocale(language),
                                }
                              )}
                            </p>
                          </div>

                          <span className="text-xs text-muted-foreground">
                            {isSelected ? '−' : '+'}
                          </span>
                        </button>

                        {isSelected && (
                          <div className="border-t bg-muted/20 px-3 py-3">
                            {content ? (
                              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-xs leading-6 font-sans">
                                {content}
                              </pre>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                {tr(
                                  'Report chưa có nội dung được lưu.',
                                  'No saved report content was found.'
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {!reportsLoading && reports.length === 0 && (
                    <p className="px-1 py-2 text-xs text-muted-foreground">
                      {tr(
                        'Chưa có báo cáo nào được lưu.',
                        'No reports saved yet.'
                      )}
                    </p>
                  )}
                </div>

                {outputs.length === 0 &&
                  !generateMindMap.isPending &&
                  !generateQuiz.isPending &&
                  !generateFlashcards.isPending && (
                    <p className="px-1 pt-2 text-xs text-muted-foreground">
                      {tr(
                        'Kết quả bạn tạo trong Studio sẽ được lưu ở đây. Chọn một công cụ ở trên để bắt đầu.',
                        'Outputs you create in Studio are saved here. Pick a tool above to get started.'
                      )}
                    </p>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleColumn>

      <MindMapConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        sources={configSources}
        defaultSelectedIds={defaultSelectedIds}
        onSubmit={handleSubmitConfig}
      />

      <MindMapDialog
        open={mindMapOpen}
        onOpenChange={setMindMapOpen}
        title={mindMap?.title}
        markdown={mindMap?.markdown ?? ''}
      />

      <QuizConfigDialog
        open={quizConfigOpen}
        onOpenChange={setQuizConfigOpen}
        sources={configSources}
        defaultSelectedIds={defaultSelectedIds}
        onSubmit={handleSubmitQuizConfig}
      />

      <QuizDialog
        open={quizOpen}
        onOpenChange={setQuizOpen}
        title={quiz?.title}
        quiz={quiz?.data ?? null}
      />

      <FlashcardsConfigDialog
        open={flashConfigOpen}
        onOpenChange={setFlashConfigOpen}
        sources={configSources}
        defaultSelectedIds={defaultSelectedIds}
        onSubmit={handleSubmitFlashConfig}
      />

      <FlashcardsDialog
        open={flashOpen}
        onOpenChange={setFlashOpen}
        title={flash?.title}
        data={flash?.data ?? null}
      />

      <RenameOutputDialog
        open={noteToRename !== null}
        onOpenChange={(open) => {
          if (!open) setNoteToRename(null)
        }}
        initialTitle={noteToRename?.title ?? ''}
        isSaving={updateNote.isPending}
        onSubmit={handleRenameSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('notebooks.deleteNote')}
        description={t('notebooks.deleteNoteConfirm')}
        confirmText={t('common.delete')}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteNote.isPending}
        confirmVariant="destructive"
      />

      <ReportCreationDialog
        open={reportConfigOpen}
        onOpenChange={setReportConfigOpen}
        sources={sources ?? []}
        defaultSelectedIds={defaultSelectedIds}
        onSubmit={onGenerateReport}
      />
    </>
  )
}
