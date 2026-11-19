'use client'

import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MoreVertical, Network, Sparkles, Trash2 } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CollapsibleColumn, createCollapseButton } from '@/components/notebooks/CollapsibleColumn'
import { MindMapDialog } from '@/components/notebooks/MindMapDialog'
import { MindMapConfigDialog, type MindMapConfigValues } from '@/components/notebooks/MindMapConfigDialog'
import { useNotebookColumnsStore } from '@/lib/stores/notebook-columns-store'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useDeleteNote } from '@/lib/hooks/use-notes'
import { useGenerateMindMap } from '@/lib/hooks/use-mindmap'
import { mindmapApi } from '@/lib/api/mindmap'
import { getDateLocale } from '@/lib/utils/date-locale'
import type { ContextMode, NoteContextMode } from '../[id]/page'
import type { NoteContextDefault } from '@/lib/utils/source-context'

interface StudioColumnProps {
  sources?: SourceListResponse[]
  sourceContextSelections?: Record<string, ContextMode>
  notes?: NoteResponse[]
  isLoading: boolean
  notebookId: string
  contextSelections?: Record<string, NoteContextMode>
  onContextModeChange?: (noteId: string, mode: NoteContextMode) => void
  onBulkContextModeChange?: (action: NoteContextDefault) => void
}

interface StudioTool {
  id: string
  label: string
  icon: LucideIcon
  busy?: boolean
  onClick: () => void
}

const isMindMap = (note: NoteResponse) => (note.note_type as string | undefined) === 'mindmap'
const sourceTitle = (s: SourceListResponse) =>
  (s as unknown as { title?: string | null }).title || s.id

export function StudioColumn({
  sources,
  sourceContextSelections,
  notes,
  isLoading,
  notebookId,
  contextSelections,
  onContextModeChange,
}: StudioColumnProps) {
  const { t, language } = useTranslation()
  const tr = (vi: string, en: string) => (language?.startsWith('vi') ? vi : en)
  const studioLabel = t('notebooks.studioTitle')
  const mindMapLabel = tr('Sơ đồ tư duy', 'Mind map')

  const { notesCollapsed, toggleNotes } = useNotebookColumnsStore()
  const collapseButton = useMemo(
    () => createCollapseButton(toggleNotes, studioLabel, 'right'),
    [toggleNotes, studioLabel]
  )

  const [configOpen, setConfigOpen] = useState(false)
  const [mindMapOpen, setMindMapOpen] = useState(false)
  const [mindMap, setMindMap] = useState<{ title?: string | null; markdown: string } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  const generateMindMap = useGenerateMindMap()
  const deleteNote = useDeleteNote()

  // Only generated outputs live in Studio; regular notes are in the Sources column
  const mindMaps = useMemo(() => (notes ?? []).filter(isMindMap), [notes])

  // Sources offered in the config dialog, pre-selected like the Sources column
  const configSources = useMemo(
    () => (sources ?? []).map((s) => ({ id: s.id, title: sourceTitle(s) })),
    [sources]
  )
  const defaultSelectedIds = useMemo(
    () => (sources ?? []).filter((s) => sourceContextSelections?.[s.id] !== 'off').map((s) => s.id),
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
        setMindMap({ title: note.title, markdown: note.content ?? '' })
        setMindMapOpen(true)
      } else {
        toast.success(tr('Sơ đồ tư duy đã sẵn sàng trong Studio', 'Your mind map is ready in Studio'))
      }
    } catch {
      // error toast is shown by the hook
    }
  }

  const handleOpenMindMap = async (note: NoteResponse) => {
    try {
      // The notes list omits content, so load the full note
      const full = await mindmapApi.get(note.id)
      setMindMap({ title: full.title, markdown: full.content ?? '' })
      setMindMapOpen(true)
    } catch {
      toast.error(tr('Không mở được sơ đồ tư duy', 'Failed to open mind map'))
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

  // Add more Studio tools here later (audio overview, report, quiz...)
  const tools: StudioTool[] = [
    {
      id: 'mindmap',
      label: mindMapLabel,
      icon: Network,
      busy: generateMindMap.isPending,
      onClick: () => setConfigOpen(true),
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
              <CardTitle className="text-lg font-normal text-foreground">{studioLabel}</CardTitle>
              {collapseButton}
            </div>
          </CardHeader>

          <CardContent className="flex-1 min-h-0 space-y-4 overflow-y-auto">
            {/* Tool tiles */}
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
                    <span className="min-w-0 flex-1 truncate">{tool.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Generated outputs */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-1">
                {generateMindMap.isPending && (
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Network className="h-5 w-5 animate-pulse text-teal" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-medium">
                        {tr('Đang tạo sơ đồ tư duy...', 'Generating mind map...')}
                      </h4>
                      <p className="truncate text-xs text-muted-foreground">
                        {tr('Có thể mất đến một phút', 'This can take up to a minute')}
                      </p>
                    </div>
                  </div>
                )}

                {mindMaps.map((note) => (
                  <div
                    key={note.id}
                    className="group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                    onClick={() => handleOpenMindMap(note)}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background">
                      <Network className="h-5 w-5 text-teal" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-medium">
                        {note.title || mindMapLabel}
                      </h4>
                      <p className="truncate text-xs text-muted-foreground">
                        {mindMapLabel}
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

                    {onContextModeChange && contextSelections?.[note.id] && (
                      <Checkbox
                        checked={contextSelections[note.id] !== 'off'}
                        onCheckedChange={(checked) => onContextModeChange(note.id, checked ? 'full' : 'off')}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Include in chat context"
                      />
                    )}
                  </div>
                ))}

                {mindMaps.length === 0 && !generateMindMap.isPending && (
                  <p className="px-1 pt-2 text-xs text-muted-foreground">
                    {tr(
                      'Kết quả bạn tạo trong Studio sẽ được lưu ở đây. Bấm "Sơ đồ tư duy" để bắt đầu.',
                      'Outputs you create in Studio are saved here. Click "Mind map" to get started.'
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
    </>
  )
}
