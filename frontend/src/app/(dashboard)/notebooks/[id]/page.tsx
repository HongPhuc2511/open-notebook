'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { NotebookHeader } from '../components/NotebookHeader'
import { SourcesColumn } from '../components/SourcesColumn'
import { NotesColumn } from '../components/NotesColumn'
import { ChatColumn } from '../components/ChatColumn'
import { useNotebook } from '@/lib/hooks/use-notebooks'
import { useNotebookSources } from '@/lib/hooks/use-sources'
import { useNotes } from '@/lib/hooks/use-notes'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useNotebookColumnsStore } from '@/lib/stores/notebook-columns-store'
import { useIsDesktop } from '@/lib/hooks/use-media-query'
import { useTranslation } from '@/lib/hooks/use-translation'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, StickyNote, MessageSquare } from 'lucide-react'
import {
  applyBulkSourceContext,
  applyBulkNoteContext,
  computeSourceSelections,
  computeNoteSelections,
  type SourceContextDefault,
  type SourceBulkAction,
  type NoteContextDefault,
} from '@/lib/utils/source-context'

// Re-exported from the shared types module for backward compatibility; several
// components historically import these from this route file.
import type { ContextMode, ContextSelections, NoteContextMode } from '@/lib/types/notebook-context'
export type { ContextMode, ContextSelections, NoteContextMode }

// Desktop column widths are percentages of the row; the chat column takes the rest.
const MIN_SIDE_PCT = 16
const MAX_SIDE_PCT = 40
const MIN_CHAT_PCT = 30
const MIN_SIDE_PX = 320
const MIN_CHAT_PX = 380
const DEFAULT_WIDTHS = { sources: 24, notes: 26 }
const WIDTHS_STORAGE_KEY = 'notebook-column-widths'
const KEYBOARD_STEP_PCT = 2

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface ResizeHandleProps {
  label: string
  value: number
  className?: string
  onDragStart: () => void
  onDrag: (clientX: number) => void
  onDragEnd: () => void
  onNudge: (direction: -1 | 1) => void
  onReset: () => void
}

function ResizeHandle({
  label,
  value,
  className,
  onDragStart,
  onDrag,
  onDragEnd,
  onNudge,
  onReset,
}: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={MIN_SIDE_PCT}
      aria-valuemax={MAX_SIDE_PCT}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        onDragStart()
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          onDrag(e.clientX)
        }
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
        onDragEnd()
      }}
      onPointerCancel={() => onDragEnd()}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          onNudge(-1)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          onNudge(1)
        }
      }}
      className={cn(
        'group relative flex w-4 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none',
        className
      )}
    >
      <span className="h-12 w-1 rounded-full bg-transparent transition-colors group-hover:bg-border group-focus-visible:bg-ring group-active:bg-fern" />
    </div>
  )
}

export default function NotebookPage() {
  const { t } = useTranslation()
  const params = useParams()

  // Ensure the notebook ID is properly decoded from URL
  const notebookId = params?.id ? decodeURIComponent(params.id as string) : ''

  const { data: notebook, isLoading: notebookLoading } = useNotebook(notebookId)
  const {
    sources,
    isLoading: sourcesLoading,
    refetch: refetchSources,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotebookSources(notebookId)
  const { data: notes, isLoading: notesLoading } = useNotes(notebookId)

  // Get collapse states for dynamic layout
  const { sourcesCollapsed, notesCollapsed } = useNotebookColumnsStore()

  // Detect desktop to avoid double-mounting ChatColumn
  const isDesktop = useIsDesktop()

  // Mobile tab state (Sources, Notes, or Chat)
  const [mobileActiveTab, setMobileActiveTab] = useState<'sources' | 'notes' | 'chat'>('chat')

  // Desktop column widths (drag the handles between columns to resize)
  const columnsRef = useRef<HTMLDivElement>(null)
  const [widths, setWidths] = useState(DEFAULT_WIDTHS)
  const [widthsLoaded, setWidthsLoaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIDTHS_STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (typeof saved?.sources === 'number' && typeof saved?.notes === 'number') {
          setWidths({
            sources: clamp(saved.sources, MIN_SIDE_PCT, MAX_SIDE_PCT),
            notes: clamp(saved.notes, MIN_SIDE_PCT, MAX_SIDE_PCT),
          })
        }
      }
    } catch {
      // Storage can be unavailable; fall back to defaults.
    }
    setWidthsLoaded(true)
  }, [])

  useEffect(() => {
    if (!widthsLoaded || isDragging) return
    try {
      localStorage.setItem(WIDTHS_STORAGE_KEY, JSON.stringify(widths))
    } catch {
      // Ignore storage failures.
    }
  }, [widths, widthsLoaded, isDragging])

  const setColumnWidth = useCallback(
    (column: 'sources' | 'notes', pct: number) => {
      setWidths((prev) => {
        const otherCollapsed = column === 'sources' ? notesCollapsed : sourcesCollapsed
        const other = otherCollapsed ? 0 : column === 'sources' ? prev.notes : prev.sources
        const rowWidth = columnsRef.current?.getBoundingClientRect().width || 1200
        const minPct = Math.max(MIN_SIDE_PCT, (MIN_SIDE_PX / rowWidth) * 100)
        const minChatPct = Math.max(MIN_CHAT_PCT, (MIN_CHAT_PX / rowWidth) * 100)
        const max = Math.max(minPct, Math.min(MAX_SIDE_PCT, 100 - minChatPct - other))
        return { ...prev, [column]: clamp(pct, minPct, max) }
      })
    },
    [sourcesCollapsed, notesCollapsed]
  )

  const dragColumn = useCallback(
    (column: 'sources' | 'notes', clientX: number) => {
      const el = columnsRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width === 0) return
      const pct =
        column === 'sources'
          ? ((clientX - rect.left) / rect.width) * 100
          : ((rect.right - clientX) / rect.width) * 100
      setColumnWidth(column, pct)
    },
    [setColumnWidth]
  )

  const nudgeColumn = (column: 'sources' | 'notes', direction: -1 | 1) => {
    // Right arrow moves the handle right: the sources column grows, the notes column shrinks.
    const delta = (column === 'sources' ? direction : -direction) * KEYBOARD_STEP_PCT
    setColumnWidth(column, widths[column] + delta)
  }

  const resetColumn = (column: 'sources' | 'notes') => {
    setColumnWidth(column, DEFAULT_WIDTHS[column])
  }

  // Context selection state
  const [contextSelections, setContextSelections] = useState<ContextSelections>({
    sources: {},
    notes: {}
  })

  // The default context mode applied to sources as they load. A bulk
  // include/exclude updates this so sources loaded later via pagination follow
  // the same intent instead of reverting to "included" (#223/#915).
  const [sourceContextDefault, setSourceContextDefault] = useState<SourceContextDefault>('include')

  // Same idea for notes loaded later (notes are binary: included/off).
  const [noteContextDefault, setNoteContextDefault] = useState<NoteContextDefault>('include')

  // Initialize and update selections when sources load or change
  useEffect(() => {
    if (sources && sources.length > 0) {
      setContextSelections(prev => ({
        ...prev,
        sources: computeSourceSelections(prev.sources, sources, sourceContextDefault),
      }))
    }
  }, [sources, sourceContextDefault])

  useEffect(() => {
    if (notes && notes.length > 0) {
      setContextSelections(prev => ({
        ...prev,
        notes: computeNoteSelections(prev.notes, notes, noteContextDefault),
      }))
    }
  }, [notes, noteContextDefault])

  const handleSourceContextModeChange = (sourceId: string, mode: ContextMode) => {
    setContextSelections(prev => ({
      ...prev,
      sources: {
        ...prev.sources,
        [sourceId]: mode
      }
    }))
  }

  const handleNoteContextModeChange = (noteId: string, mode: NoteContextMode) => {
    setContextSelections(prev => ({
      ...prev,
      notes: {
        ...prev.notes,
        [noteId]: mode
      }
    }))
  }

  // Bulk-apply a context action (insights-only / full / exclude) to every
  // source at once (#223). Also records the action as the default for sources
  // loaded later (#915).
  const handleBulkSourceContext = (action: SourceBulkAction) => {
    setSourceContextDefault(action)
    setContextSelections(prev => ({
      ...prev,
      sources: applyBulkSourceContext(prev.sources, sources ?? [], action),
    }))
  }

  // Bulk include/exclude every note from the chat context at once (#223).
  const handleBulkNoteContext = (action: NoteContextDefault) => {
    setNoteContextDefault(action)
    setContextSelections(prev => ({
      ...prev,
      notes: applyBulkNoteContext(prev.notes, notes ?? [], action),
    }))
  }

  if (notebookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!notebook) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">{t('notebooks.notFound')}</h1>
          <p className="text-muted-foreground">{t('notebooks.notFoundDesc')}</p>
        </div>
      </AppShell>
    )
  }

  const columnTransition = isDragging ? '' : 'transition-all duration-150'

  return (
    <AppShell>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 px-8 pt-1 pb-0">
          <NotebookHeader notebook={notebook} />
        </div>

        <div className="flex-1 px-8 pb-4 pt-2 overflow-x-auto flex flex-col">
          {/* Mobile: Tabbed interface - only render on mobile to avoid double-mounting */}
          {!isDesktop && (
            <>
              <div className="lg:hidden mb-4">
                <Tabs value={mobileActiveTab} onValueChange={(value) => setMobileActiveTab(value as 'sources' | 'notes' | 'chat')}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="sources" className="gap-2">
                      <FileText className="h-4 w-4" />
                      {t('navigation.sources')}
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="gap-2">
                      <StickyNote className="h-4 w-4" />
                      {t('common.notes')}
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t('common.chat')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Mobile: Show only active tab */}
              <div className="flex-1 overflow-hidden lg:hidden">
                {mobileActiveTab === 'sources' && (
                  <SourcesColumn
                    sources={sources}
                    isLoading={sourcesLoading}
                    notebookId={notebookId}
                    notebookName={notebook?.name}
                    onRefresh={refetchSources}
                    contextSelections={contextSelections.sources}
                    onContextModeChange={handleSourceContextModeChange}
                    onBulkContextModeChange={handleBulkSourceContext}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    fetchNextPage={fetchNextPage}
                  />
                )}
                {mobileActiveTab === 'notes' && (
                  <NotesColumn
                    notes={notes}
                    isLoading={notesLoading}
                    notebookId={notebookId}
                    contextSelections={contextSelections.notes}
                    onContextModeChange={handleNoteContextModeChange}
                    onBulkContextModeChange={handleBulkNoteContext}
                  />
                )}
                {mobileActiveTab === 'chat' && (
                  <ChatColumn
                    notebookId={notebookId}
                    contextSelections={contextSelections}
                    sources={sources}
                    sourcesLoading={sourcesLoading}
                  />
                )}
              </div>
            </>
          )}

          {/* Desktop: Sources | Chat | Notes, with draggable handles between columns.
              Visual order is set with `order-*` so the JSX order can stay as it was. */}
          <div
            ref={columnsRef}
            className={cn(
              'hidden lg:flex h-full min-h-0 flex-row',
              isDragging && 'cursor-col-resize select-none'
            )}
          >
            {/* Sources Column */}
            <div
              className={cn(
                'order-1 min-h-0',
                columnTransition,
                sourcesCollapsed ? 'w-12 flex-shrink-0' : 'flex-none'
              )}
              style={sourcesCollapsed ? undefined : { width: `${widths.sources}%`, minWidth: MIN_SIDE_PX }}
            >
              <SourcesColumn
                sources={sources}
                isLoading={sourcesLoading}
                notebookId={notebookId}
                notebookName={notebook?.name}
                onRefresh={refetchSources}
                contextSelections={contextSelections.sources}
                onContextModeChange={handleSourceContextModeChange}
                onBulkContextModeChange={handleBulkSourceContext}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            </div>

            {/* Handle between Sources and Chat (a plain gap while Sources is collapsed) */}
            {sourcesCollapsed ? (
              <div className="order-2 w-4 shrink-0" aria-hidden />
            ) : (
              <ResizeHandle
                className="order-2"
                label={t('navigation.sources')}
                value={widths.sources}
                onDragStart={() => setIsDragging(true)}
                onDrag={(x) => dragColumn('sources', x)}
                onDragEnd={() => setIsDragging(false)}
                onNudge={(d) => nudgeColumn('sources', d)}
                onReset={() => resetColumn('sources')}
              />
            )}

            {/* Chat Column - always expanded, takes remaining space */}
            <div className={cn('order-3 min-h-0 min-w-0 flex-1', columnTransition)}>
              <ChatColumn
                notebookId={notebookId}
                contextSelections={contextSelections}
                sources={sources}
                sourcesLoading={sourcesLoading}
              />
            </div>

            {/* Handle between Chat and Notes (a plain gap while Notes is collapsed) */}
            {notesCollapsed ? (
              <div className="order-4 w-4 shrink-0" aria-hidden />
            ) : (
              <ResizeHandle
                className="order-4"
                label={t('common.notes')}
                value={widths.notes}
                onDragStart={() => setIsDragging(true)}
                onDrag={(x) => dragColumn('notes', x)}
                onDragEnd={() => setIsDragging(false)}
                onNudge={(d) => nudgeColumn('notes', d)}
                onReset={() => resetColumn('notes')}
              />
            )}

            {/* Notes Column */}
            <div
              className={cn(
                'order-5 min-h-0',
                columnTransition,
                notesCollapsed ? 'w-12 flex-shrink-0' : 'flex-none'
              )}
              style={notesCollapsed ? undefined : { width: `${widths.notes}%`, minWidth: MIN_SIDE_PX }}
            >
              <NotesColumn
                notes={notes}
                isLoading={notesLoading}
                notebookId={notebookId}
                contextSelections={contextSelections.notes}
                onContextModeChange={handleNoteContextModeChange}
                onBulkContextModeChange={handleBulkNoteContext}
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}