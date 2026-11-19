'use client'

import { useState, useMemo } from 'react'
import { NoteResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, StickyNote, Bot, User, MoreVertical, Trash2, ListChecks, ChevronDown, Network } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { NoteEditorDialog } from './NoteEditorDialog'
import { getDateLocale } from '@/lib/utils/date-locale'
import { formatDistanceToNow } from 'date-fns'
import type { NoteContextMode } from '../[id]/page'
import type { NoteContextDefault } from '@/lib/utils/source-context'
import { useDeleteNote } from '@/lib/hooks/use-notes'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CollapsibleColumn, createCollapseButton } from '@/components/notebooks/CollapsibleColumn'
import { useNotebookColumnsStore } from '@/lib/stores/notebook-columns-store'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { MindMapDialog } from '@/components/notebooks/MindMapDialog'
import { mindmapApi } from '@/lib/api/mindmap'
import { useGenerateMindMap } from '@/lib/hooks/use-mindmap'

interface NotesColumnProps {
  notes?: NoteResponse[]
  isLoading: boolean
  notebookId: string
  contextSelections?: Record<string, NoteContextMode>
  onContextModeChange?: (noteId: string, mode: NoteContextMode) => void
  onBulkContextModeChange?: (action: NoteContextDefault) => void
}

export function NotesColumn({
  notes,
  isLoading,
  notebookId,
  contextSelections,
  onContextModeChange,
  onBulkContextModeChange
}: NotesColumnProps) {
  const { t, language } = useTranslation()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteResponse | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  const deleteNote = useDeleteNote()

  // Mind map (Studio)
  const [mindMapOpen, setMindMapOpen] = useState(false)
  const [mindMap, setMindMap] = useState<{ title?: string | null; markdown: string } | null>(null)
  const generateMindMap = useGenerateMindMap()
  const mindMapLabel = language?.startsWith('vi') ? 'Sơ đồ tư duy' : 'Mind map'
  const isMindMap = (note: NoteResponse) => (note.note_type as string | undefined) === 'mindmap'

  // Collapsible column state
  const { notesCollapsed, toggleNotes } = useNotebookColumnsStore()
  const notesLabel = t('common.notes')
  const collapseButton = useMemo(
    () => createCollapseButton(toggleNotes, notesLabel, 'right'),
    [toggleNotes, notesLabel]
  )

  const handleDeleteClick = (noteId: string) => {
    setNoteToDelete(noteId)
    setDeleteDialogOpen(true)
  }

  const handleOpenEditor = (note?: NoteResponse) => {
    setEditingNote(note)
    setEditorOpen(true)
  }

  const handleGenerateMindMap = async () => {
    try {
      const note = await generateMindMap.mutateAsync({ notebookId })
      setMindMap({ title: note.title, markdown: note.content ?? '' })
      setMindMapOpen(true)
    } catch {
      // error toast is shown by the hook
    }
  }

  const handleRowClick = async (note: NoteResponse) => {
    if (!isMindMap(note)) {
      handleOpenEditor(note)
      return
    }
    try {
      const full = await mindmapApi.get(note.id)
      setMindMap({ title: full.title, markdown: full.content ?? '' })
      setMindMapOpen(true)
    } catch {
      toast.error('Failed to open mind map')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return

    try {
      await deleteNote.mutateAsync(noteToDelete)
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  return (
    <>
      <CollapsibleColumn
        isCollapsed={notesCollapsed}
        onToggle={toggleNotes}
        collapsedIcon={StickyNote}
        collapsedLabel={notesLabel}
      >
        <Card className="h-full flex flex-col flex-1 gap-3 overflow-hidden rounded-2xl bg-popover py-5">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-normal text-foreground">
                {t('notebooks.studioTitle')}
              </CardTitle>
              <div className="flex shrink-0 items-center gap-1">
                {onBulkContextModeChange && notes && notes.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground" title={t('sources.bulkContext')}>
                        <ListChecks className="h-4 w-4" />
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onBulkContextModeChange('include')}>
                        {t('sources.includeAllInContext')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onBulkContextModeChange('exclude')}>
                        {t('sources.excludeAllFromContext')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  size="sm"
                  variant="tonal"
                  className="rounded-full"
                  aria-label={mindMapLabel}
                  title={mindMapLabel}
                  disabled={generateMindMap.isPending}
                  onClick={handleGenerateMindMap}
                >
                  <Network className={generateMindMap.isPending ? 'h-4 w-4 animate-pulse @[18rem]/card-header:mr-2' : 'h-4 w-4 @[18rem]/card-header:mr-2'} />
                  <span className="hidden @[18rem]/card-header:inline">{mindMapLabel}</span>
                </Button>
                <Button size="sm" variant="tonal" className="rounded-full" aria-label={t('common.writeNote')} onClick={() => handleOpenEditor()}>
                  <Plus className="h-4 w-4 @[18rem]/card-header:mr-2" />
                  <span className="hidden @[18rem]/card-header:inline">{t('common.writeNote')}</span>
                </Button>
                {collapseButton}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : !notes || notes.length === 0 ? (
              <EmptyState
                icon={StickyNote}
                title={t('notebooks.noNotesYet')}
                description={t('sources.createFirstNote')}
              />
            ) : (
              <div className="space-y-1">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                    onClick={() => handleRowClick(note)}
                  >
                    {/* Type icon in a soft square, like Studio items in NotebookLM */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background">
                      {isMindMap(note) ? (
                        <Network className="h-5 w-5 text-teal" />
                      ) : note.note_type === 'ai' ? (
                        <Bot className="h-5 w-5 text-teal" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Title (falls back to the content when the note has no title) + subtitle */}
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-medium">
                        {note.title || note.content || t('sources.untitledNote')}
                      </h4>
                      <p className="truncate text-xs text-muted-foreground">
                        {isMindMap(note) ? mindMapLabel : note.note_type === 'ai' ? t('common.aiGenerated') : t('common.human')}
                        {' · '}
                        {formatDistanceToNow(new Date(note.updated), {
                          addSuffix: true,
                          locale: getDateLocale(language)
                        })}
                      </p>
                    </div>

                    {/* Overflow menu, visible on hover */}
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
                            handleDeleteClick(note.id)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('notebooks.deleteNote')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Context checkbox: checked = included in chat ('full'), unchecked = 'off' */}
                    {onContextModeChange && contextSelections?.[note.id] && (
                      <Checkbox
                        checked={contextSelections[note.id] !== 'off'}
                        onCheckedChange={(checked) => onContextModeChange(note.id, checked ? 'full' : 'off')}
                        onClick={(e) => e.stopPropagation()} // do not open the note editor
                        aria-label="Include in chat context"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleColumn>

      <MindMapDialog
        open={mindMapOpen}
        onOpenChange={setMindMapOpen}
        title={mindMap?.title}
        markdown={mindMap?.markdown ?? ''}
      />

      <NoteEditorDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            setEditingNote(undefined)
          }
        }}
        notebookId={notebookId}
        note={editingNote}
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
