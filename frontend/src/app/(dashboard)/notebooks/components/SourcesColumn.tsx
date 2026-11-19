'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { NoteResponse, SourceListResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  FileText,
  Link2,
  ChevronDown,
  ChevronRight,
  Loader2,
  ListChecks,
  Globe,
  Sparkles,
  ArrowRight,
  Bot,
  StickyNote,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { AddSourceDialog } from '@/components/sources/AddSourceDialog'
import { AddExistingSourceDialog } from '@/components/sources/AddExistingSourceDialog'
import { SourceCard } from '@/components/sources/SourceCard'
import { useDeleteSource, useRetrySource, useRemoveSourceFromNotebook } from '@/lib/hooks/use-sources'
import { useDeleteNote } from '@/lib/hooks/use-notes'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { ContextMode } from '../[id]/page'
import type { NoteContextMode } from '../[id]/page'
import type { SourceBulkAction, NoteContextDefault } from '@/lib/utils/source-context'
import { CollapsibleColumn, createCollapseButton } from '@/components/notebooks/CollapsibleColumn'
import { useNotebookColumnsStore } from '@/lib/stores/notebook-columns-store'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Checkbox } from '@/components/ui/checkbox'
import { NoteEditorDialog } from './NoteEditorDialog'

interface SourcesColumnProps {
  sources?: SourceListResponse[]
  isLoading: boolean
  notebookId: string
  notebookName?: string
  onRefresh?: () => void
  contextSelections?: Record<string, ContextMode>
  onContextModeChange?: (sourceId: string, mode: ContextMode) => void
  onBulkContextModeChange?: (action: SourceBulkAction) => void
  notes?: NoteResponse[]
  notesLoading?: boolean
  noteContextSelections?: Record<string, NoteContextMode>
  onNoteContextModeChange?: (noteId: string, mode: NoteContextMode) => void
  onBulkNoteContextModeChange?: (action: NoteContextDefault) => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
}

export function SourcesColumn({
  sources,
  isLoading,
  notebookId,
  onRefresh,
  contextSelections,
  onContextModeChange,
  onBulkContextModeChange,
  notes,
  notesLoading = false,
  noteContextSelections,
  onNoteContextModeChange,
  onBulkNoteContextModeChange,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: SourcesColumnProps) {
  const { t } = useTranslation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addExistingDialogOpen, setAddExistingDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [sourceToRemove, setSourceToRemove] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteResponse | undefined>()
  const [noteDeleteDialogOpen, setNoteDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(true)

  const { openModal } = useModalManager()
  const deleteSource = useDeleteSource()
  const retrySource = useRetrySource()
  const removeFromNotebook = useRemoveSourceFromNotebook()
  const deleteNote = useDeleteNote()

  const { sourcesCollapsed, toggleSources } = useNotebookColumnsStore()
  const sourcesLabel = t('navigation.sources')
  const collapseButton = useMemo(
    () => createCollapseButton(toggleSources, sourcesLabel),
    [toggleSources, sourcesLabel]
  )

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || !hasNextPage || isFetchingNextPage || !fetchNextPage) return

    const { scrollTop, scrollHeight, clientHeight } = container
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const sourcesAllSelected =
    !sources?.length ||
    sources.every((s) => contextSelections?.[s.id] && contextSelections[s.id] !== 'off')
  const notesAllSelected =
    !notes?.length ||
    notes.every((n) => noteContextSelections?.[n.id] && noteContextSelections[n.id] !== 'off')
  const hasItems = (sources?.length ?? 0) + (notes?.length ?? 0) > 0
  const allSelected = hasItems && sourcesAllSelected && notesAllSelected

  const handleToggleAll = () => {
    onBulkContextModeChange?.(allSelected ? 'exclude' : 'full')
    onBulkNoteContextModeChange?.(allSelected ? 'exclude' : 'include')
  }

  const handleDeleteClick = (sourceId: string) => {
    setSourceToDelete(sourceId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!sourceToDelete) return

    try {
      await deleteSource.mutateAsync(sourceToDelete)
      setDeleteDialogOpen(false)
      setSourceToDelete(null)
      onRefresh?.()
    } catch (error) {
      console.error('Failed to delete source:', error)
    }
  }

  const handleRemoveFromNotebook = (sourceId: string) => {
    setSourceToRemove(sourceId)
    setRemoveDialogOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!sourceToRemove) return

    try {
      await removeFromNotebook.mutateAsync({
        notebookId,
        sourceId: sourceToRemove
      })
      setRemoveDialogOpen(false)
      setSourceToRemove(null)
    } catch (error) {
      console.error('Failed to remove source from notebook:', error)
    }
  }

  const handleRetry = async (sourceId: string) => {
    try {
      await retrySource.mutateAsync(sourceId)
    } catch (error) {
      console.error('Failed to retry source:', error)
    }
  }

  const handleSourceClick = (sourceId: string) => {
    openModal('source', sourceId)
  }

  const handleOpenEditor = (note?: NoteResponse) => {
    setEditingNote(note)
    setEditorOpen(true)
  }

  const handleNoteDeleteClick = (noteId: string) => {
    setNoteToDelete(noteId)
    setNoteDeleteDialogOpen(true)
  }

  const handleNoteDeleteConfirm = async () => {
    if (!noteToDelete) return

    try {
      await deleteNote.mutateAsync(noteToDelete)
      setNoteDeleteDialogOpen(false)
      setNoteToDelete(null)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  return (
    <>
      <CollapsibleColumn
        isCollapsed={sourcesCollapsed}
        onToggle={toggleSources}
        collapsedIcon={FileText}
        collapsedLabel={sourcesLabel}
      >
        <Card className="h-full flex flex-col gap-3 overflow-hidden rounded-3xl bg-popover py-5">
          <CardHeader className="flex-shrink-0 pb-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-normal text-foreground">
                {sourcesLabel}
              </CardTitle>
              {collapseButton}
            </div>
          </CardHeader>

          <div className="flex flex-shrink-0 gap-2 px-6">
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="h-10 min-w-0 flex-1 rounded-full">
                  <Plus className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{t('sources.addSource')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => { setDropdownOpen(false); setAddDialogOpen(true) }}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('sources.addSource')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setDropdownOpen(false); setAddExistingDialogOpen(true) }}>
                  <Link2 className="mr-2 h-4 w-4" />
                  {t('sources.addExistingTitle')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="secondary"
              className="h-10 min-w-0 flex-1 rounded-full"
              onClick={() => handleOpenEditor()}
            >
              <Plus className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">{t('common.writeNote')}</span>
            </Button>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1 px-6">
            {onBulkContextModeChange && sources && sources.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title={t('sources.bulkContext')}>
                    <ListChecks className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => onBulkContextModeChange('insights')}>
                    {t('sources.includeAllInsights')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkContextModeChange('full')}>
                    {t('sources.includeAllFull')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkContextModeChange('exclude')}>
                    {t('sources.excludeAllFromContext')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onBulkContextModeChange && hasItems && (
              <label className="ml-auto flex cursor-pointer items-center gap-3 py-1 pr-3 text-sm text-muted-foreground">
                {t('sources.selectAll')}
                <Checkbox checked={allSelected} onCheckedChange={handleToggleAll} />
              </label>
            )}
          </div>

          <CardContent ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
            {isLoading || notesLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : !hasItems ? (
              <EmptyState
                icon={FileText}
                title={t('sources.noSourcesYet')}
                description={t('sources.createFirstSource')}
              />
            ) : (
              <div className="space-y-1">
                {notes && notes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 py-1 pl-1 pr-3">
                      <Button
                        variant="ghost"
                        className="h-8 flex-1 justify-start gap-2 px-2 text-sm font-normal"
                        onClick={() => setNotesOpen((open) => !open)}
                        aria-expanded={notesOpen}
                      >
                        {notesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {t('common.notes')}
                      </Button>
                      {onBulkNoteContextModeChange && (
                        <Checkbox
                          checked={notesAllSelected}
                          onCheckedChange={() => onBulkNoteContextModeChange(notesAllSelected ? 'exclude' : 'include')}
                          aria-label="Include all notes in chat context"
                        />
                      )}
                    </div>
                    {notesOpen &&
                      notes.map((note) => (
                        <div
                          key={note.id}
                          className="group relative flex cursor-pointer items-center gap-3 rounded-xl py-2 pl-7 pr-3 transition-colors hover:bg-muted"
                          onClick={() => handleOpenEditor(note)}
                        >
                          {note.note_type === 'ai' ? (
                            <Bot className="h-5 w-5 shrink-0 text-teal" />
                          ) : (
                            <StickyNote className="h-5 w-5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {note.title || note.content || t('sources.untitledNote')}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 shrink-0 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleNoteDeleteClick(note.id)
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('notebooks.deleteNote')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {onNoteContextModeChange && noteContextSelections?.[note.id] && (
                            <Checkbox
                              checked={noteContextSelections[note.id] !== 'off'}
                              onCheckedChange={(checked) => onNoteContextModeChange(note.id, checked ? 'full' : 'off')}
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Include in chat context"
                            />
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {sources?.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    onClick={handleSourceClick}
                    onDelete={handleDeleteClick}
                    onRetry={handleRetry}
                    onRefreshContent={handleRetry}
                    onRemoveFromNotebook={handleRemoveFromNotebook}
                    onRefresh={onRefresh}
                    showRemoveFromNotebook={true}
                    contextMode={contextSelections?.[source.id]}
                    onContextModeChange={onContextModeChange
                      ? (mode) => onContextModeChange(source.id, mode)
                      : undefined
                    }
                  />
                ))}

                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleColumn>

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        defaultNotebookId={notebookId}
      />

      <AddExistingSourceDialog
        open={addExistingDialogOpen}
        onOpenChange={setAddExistingDialogOpen}
        notebookId={notebookId}
        onSuccess={onRefresh}
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
        title={t('sources.delete')}
        description={t('sources.deleteConfirm')}
        confirmText={t('common.delete')}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteSource.isPending}
        confirmVariant="destructive"
      />

      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title={t('sources.removeFromNotebook')}
        description={t('sources.removeConfirm')}
        confirmText={t('common.remove')}
        onConfirm={handleRemoveConfirm}
        isLoading={removeFromNotebook.isPending}
        confirmVariant="default"
      />

      <ConfirmDialog
        open={noteDeleteDialogOpen}
        onOpenChange={setNoteDeleteDialogOpen}
        title={t('notebooks.deleteNote')}
        description={t('notebooks.deleteNoteConfirm')}
        confirmText={t('common.delete')}
        onConfirm={handleNoteDeleteConfirm}
        isLoading={deleteNote.isPending}
        confirmVariant="destructive"
      />
    </>
  )
}