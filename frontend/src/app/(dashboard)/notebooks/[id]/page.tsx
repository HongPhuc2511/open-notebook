'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { NotebookHeader } from '../components/NotebookHeader'
import { SourcesColumn } from '../components/SourcesColumn'
import { NotesColumn } from '../components/NotesColumn'
import { StudioColumn } from '../components/StudioColumn'
import { ChatColumn } from '../components/ChatColumn'
import { WorkspaceToolPanel, type WorkspaceTool } from '../components/WorkspaceToolPanel'
import { useNotebook } from '@/lib/hooks/use-notebooks'
import { useNotebookSources } from '@/lib/hooks/use-sources'
import { useNotes } from '@/lib/hooks/use-notes'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useNotebookColumnsStore } from '@/lib/stores/notebook-columns-store'
import { useIsDesktop } from '@/lib/hooks/use-media-query'
import { useTranslation } from '@/lib/hooks/use-translation'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, StickyNote, MessageSquare, BookOpen, Search, Mic, Settings, Sparkles, ChevronRight, History, SearchCheck, FolderOpen, NotebookPen } from 'lucide-react'
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
const MIN_SIDE_PX = 280
const MIN_CHAT_PX = 500
const DEFAULT_WIDTHS = { sources: 22, notes: 23 }
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
  const [activeTool, setActiveTool] = useState<WorkspaceTool | null>(null)
  const openWorkspaceTool = (tool: WorkspaceTool) => { setActiveTool(tool); if (!isDesktop) setMobileActiveTab('chat') }
  const closeWorkspaceTool = () => setActiveTool(null)

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

  const toolButton = (tool: WorkspaceTool, label: string) => (
    <button
      key={tool}
      type="button"
      onClick={() => openWorkspaceTool(tool)}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
        activeTool === tool ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Sparkles className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight className="size-3.5 opacity-50" />
    </button>
  )

  const workspacePanel = (
    <WorkspaceToolPanel
      tool={activeTool}
      onBack={closeWorkspaceTool}
      notebookId={notebookId}
      notebookName={notebook?.name}
      sources={sources}
      sourcesLoading={sourcesLoading}
      notes={notes}
      notesLoading={notesLoading}
      contextSelections={contextSelections}
      onSourceContextModeChange={handleSourceContextModeChange}
      onBulkSourceContext={handleBulkSourceContext}
      onNoteContextModeChange={handleNoteContextModeChange}
      onBulkNoteContext={handleBulkNoteContext}
      onRefreshSources={refetchSources}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  )

  return (
    <AppShell hideSidebar>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
        {/* Global workspace top navigation */}
        <header className="z-10 flex h-[64px] shrink-0 items-center justify-between border-b border-border/70 bg-background px-4 md:px-7">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/notebooks" className="flex shrink-0 items-center gap-3 pr-4">
              <span className="flex items-center gap-[3px]" aria-hidden="true">
                <span className="size-2.5 rounded-[3px] bg-fern" />
                <span className="size-2.5 rounded-[3px] bg-gold" />
                <span className="size-2.5 rounded-[3px] bg-teal" />
              </span>
              <span className="hidden text-lg font-semibold tracking-tight sm:inline">Open Notebook</span>
            </Link>
            <nav className="hidden items-center gap-2 md:flex" aria-label="Main navigation">
              <Link href="/notebooks" aria-current="page" className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">Notebooks</Link>
              <Link href="/search" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Ask and Search</Link>
              <Link href="/podcasts" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Podcasts</Link>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/search" aria-label="Search" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><Search className="size-5" /></Link>
            <Link href="/settings" aria-label="Settings" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><Settings className="size-5" /></Link>
            <span className="ml-1 flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">ON</span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Redesigned left workspace: navigation + live source library */}
          <aside className="notebook-left-rail hidden w-[356px] shrink-0 flex-col border-r lg:flex 2xl:w-[380px]">
            <div className="workspace-identity shrink-0 px-5 pb-4 pt-5">
              <div className="flex items-center gap-3">
                <span className="workspace-mark flex size-10 items-center justify-center rounded-2xl text-white"><BookOpen className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-500">OPEN NOTEBOOK / WORKSPACE</p>
                  <h2 className="mt-0.5 truncate text-sm font-bold text-slate-900">{notebook.name}</h2>
                </div>
                <span className="rounded-full border border-indigo-100 bg-white/80 px-2 py-1 text-[10px] font-bold text-indigo-600">ACTIVE</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => window.dispatchEvent(new Event('open-notebook-note-editor'))} className="workspace-primary-action flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-white"><StickyNote className="size-4" />Write Note</button>
                <button type="button" onClick={() => openWorkspaceTool('sources')} className="workspace-source-action flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold"><FileText className="size-4" />Add / Browse</button>
              </div>
            </div>

            <nav className="workspace-navigation shrink-0 px-4 pb-4 pt-3" aria-label="Notebook navigation">
              <p className="workspace-nav-caption">NOTEBOOK WORKSPACE</p>
              <button
                type="button"
                onClick={() => {
                  closeWorkspaceTool()
                  window.dispatchEvent(new Event('open-notebook-chat-history'))
                }}
                className="workspace-nav-item w-full"
              >
                <span className="workspace-nav-icon icon-blue"><History className="size-[17px]" /></span>
                <span className="min-w-0 flex-1 text-left">Lịch sử trò chuyện</span>
                <ChevronRight className="size-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  closeWorkspaceTool()
                  window.dispatchEvent(new Event('focus-notebook-chat-input'))
                }}
                className="workspace-nav-item w-full"
              >
                <span className="workspace-nav-icon icon-violet"><SearchCheck className="size-[17px]" /></span>
                <span className="min-w-0 flex-1 text-left">Tìm kiếm tài liệu</span>
                <ChevronRight className="size-4 text-slate-400" />
              </button>
              <button type="button" onClick={() => openWorkspaceTool('notes')} className="workspace-nav-item w-full">
                <span className="workspace-nav-icon icon-pink"><NotebookPen className="size-[17px]" /></span>
                <span className="min-w-0 flex-1 text-left">Ghi chú</span>
                <ChevronRight className="size-4 text-slate-400" />
              </button>
              <button type="button" onClick={() => openWorkspaceTool('sources')} className="workspace-nav-item w-full">
                <span className="workspace-nav-icon icon-green"><FolderOpen className="size-[17px]" /></span>
                <span className="min-w-0 flex-1 text-left">Quản lý tài liệu</span>
                <ChevronRight className="size-4 text-slate-400" />
              </button>
              <button type="button" onClick={() => openWorkspaceTool('notebooks')} className="workspace-nav-item w-full">
                <span className="workspace-nav-icon icon-cyan"><BookOpen className="size-[17px]" /></span>
                <span className="min-w-0 flex-1 text-left">Notebook của tôi</span>
                <ChevronRight className="size-4 text-slate-400" />
              </button>
              <p className="workspace-nav-caption mt-4">WORKSPACE TOOLS</p>
              <button type="button" onClick={() => openWorkspaceTool('playground')} className="workspace-nav-item w-full">
                <span className="workspace-nav-icon icon-amber"><Sparkles className="size-[17px]" /></span>
                <span className="min-w-0 flex-1 text-left">Studio & AI tools</span>
                <ChevronRight className="size-4 text-slate-400" />
              </button>
            </nav>

            <section className="workspace-source-zone flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
              <div className="mb-2 flex shrink-0 items-center justify-between px-2">
                <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">SOURCE LIBRARY</p><p className="mt-0.5 text-[11px] text-slate-500">Documents connected to this notebook</p></div>
                <span className="rounded-full border border-emerald-200 bg-white/80 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{sources?.length ?? 0} FILES</span>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden rounded-[20px]">
                <SourcesColumn
                  sources={sources} isLoading={sourcesLoading} notebookId={notebookId} notebookName={notebook?.name}
                  onRefresh={refetchSources} contextSelections={contextSelections.sources}
                  onContextModeChange={handleSourceContextModeChange} onBulkContextModeChange={handleBulkSourceContext}
                  hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage}
                />
              </div>
            </section>
            <div className="workspace-settings shrink-0 px-5 py-3">
              <Link href="/settings" className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 transition-colors hover:text-indigo-700"><span className="flex size-8 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm"><Settings className="size-4" /></span>Settings & preferences<span className="ml-auto text-[10px] text-slate-400">Manage</span></Link>
            </div>
          </aside>

          {/* Main chat/workspace area. Chat stays mounted while a tool is open. */}
          <main className="notebook-chat-stage flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col p-3 md:p-4 xl:p-5">
              <div className="notebook-chat-frame min-h-0 flex-1 overflow-hidden rounded-[26px] border bg-background">
                <div className={activeTool ? 'hidden h-full min-h-0' : 'h-full min-h-0'}>
                  <ChatColumn notebookId={notebookId} contextSelections={contextSelections} sources={sources} sourcesLoading={sourcesLoading} />
                </div>
                {activeTool && <div className="h-full min-h-0">{workspacePanel}</div>}
              </div>
            </div>
          </main>

          {/* Right Studio panel */}
          <aside className="notebook-studio-rail hidden w-[356px] shrink-0 border-l p-3 xl:block 2xl:w-[390px]">
            <StudioColumn onOpenTool={openWorkspaceTool} />
          </aside>
        </div>

        {/* Compact mobile navigation */}
        <div className="flex shrink-0 items-center justify-around border-t border-border/70 bg-background px-2 py-2 lg:hidden">
          <button type="button" onClick={() => { closeWorkspaceTool(); setMobileActiveTab('sources') }} className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-muted-foreground"><FileText className="size-4" />Sources</button>
          <button type="button" onClick={() => { closeWorkspaceTool(); setMobileActiveTab('chat') }} className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-muted-foreground"><MessageSquare className="size-4" />Chat</button>
          <button type="button" onClick={() => openWorkspaceTool('notes')} className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-muted-foreground"><StickyNote className="size-4" />Notes</button>
          <button type="button" onClick={() => openWorkspaceTool('podcast')} className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-muted-foreground"><Sparkles className="size-4" />Studio</button>
        </div>
        <div className="lg:hidden">
          {mobileActiveTab === 'sources' && <div className="fixed inset-0 z-20 bg-background p-3 pt-16"><SourcesColumn sources={sources} isLoading={sourcesLoading} notebookId={notebookId} notebookName={notebook?.name} onRefresh={refetchSources} contextSelections={contextSelections.sources} onContextModeChange={handleSourceContextModeChange} onBulkContextModeChange={handleBulkSourceContext} hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} /></div>}
          {mobileActiveTab === 'chat' && activeTool && <div className="fixed inset-0 z-20 bg-background p-3 pt-16">{workspacePanel}</div>}
        </div>
      </div>
    </AppShell>
  )
}

