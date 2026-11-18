'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { SourcesColumn } from '../components/SourcesColumn'
import { NotesColumn } from '../components/NotesColumn'
import { ChatColumn } from '../components/ChatColumn'
import { StudioColumn, type StudioTool } from '../components/StudioColumn'
import { PodcastsPageContent } from '../../podcasts/StudioContent'
import { TransformationsPageContent } from '../../transformations/StudioContent'
import { SourcesPageContent } from '../../sources/StudioContent'
import { NotebooksPageContent } from '../StudioContent'
import { SearchPageContent } from '../../search/StudioContent'
import { useNotebook } from '@/lib/hooks/use-notebooks'
import { useNotebookSources } from '@/lib/hooks/use-sources'
import { useNotes } from '@/lib/hooks/use-notes'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useTranslation } from '@/lib/hooks/use-translation'
import {
  applyBulkSourceContext,
  applyBulkNoteContext,
  computeSourceSelections,
  computeNoteSelections,
  type SourceContextDefault,
  type SourceBulkAction,
  type NoteContextDefault,
} from '@/lib/utils/source-context'

import type {
  ContextMode,
  ContextSelections,
  NoteContextMode
} from '@/lib/types/notebook-context'

export type { ContextMode, ContextSelections, NoteContextMode }

export default function NotebookPage() {
  const { t } = useTranslation()
  const params = useParams()
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

  const [sidebarQuery, setSidebarQuery] = useState('')
  const [activeStudioTool, setActiveStudioTool] = useState<StudioTool | null>(null)

  const [contextSelections, setContextSelections] = useState<ContextSelections>({
    sources: {},
    notes: {},
  })

  const [sourceContextDefault, setSourceContextDefault] =
    useState<SourceContextDefault>('include')

  const [noteContextDefault, setNoteContextDefault] =
    useState<NoteContextDefault>('include')

  useEffect(() => {
    if (sources?.length) {
      setContextSelections(prev => ({
        ...prev,
        sources: computeSourceSelections(
          prev.sources,
          sources,
          sourceContextDefault
        ),
      }))
    }
  }, [sources, sourceContextDefault])

  useEffect(() => {
    if (notes?.length) {
      setContextSelections(prev => ({
        ...prev,
        notes: computeNoteSelections(
          prev.notes,
          notes,
          noteContextDefault
        ),
      }))
    }
  }, [notes, noteContextDefault])

  const filteredSources = useMemo(() => {
    const query = sidebarQuery.trim().toLowerCase()
    if (!query) return sources ?? []
    return (sources ?? []).filter(source => JSON.stringify(source).toLowerCase().includes(query))
  }, [sources, sidebarQuery])

  const filteredNotes = useMemo(() => {
    const query = sidebarQuery.trim().toLowerCase()
    if (!query) return notes ?? []
    return (notes ?? []).filter(note => JSON.stringify(note).toLowerCase().includes(query))
  }, [notes, sidebarQuery])

  const handleSourceContextModeChange = (
    sourceId: string,
    mode: ContextMode
  ) => {
    setContextSelections(prev => ({
      ...prev,
      sources: { ...prev.sources, [sourceId]: mode },
    }))
  }

  const handleNoteContextModeChange = (
    noteId: string,
    mode: NoteContextMode
  ) => {
    setContextSelections(prev => ({
      ...prev,
      notes: { ...prev.notes, [noteId]: mode },
    }))
  }

  const handleBulkSourceContext = (action: SourceBulkAction) => {
    setSourceContextDefault(action)
    setContextSelections(prev => ({
      ...prev,
      sources: applyBulkSourceContext(
        prev.sources,
        sources ?? [],
        action
      ),
    }))
  }

  const handleBulkNoteContext = (action: NoteContextDefault) => {
    setNoteContextDefault(action)
    setContextSelections(prev => ({
      ...prev,
      notes: applyBulkNoteContext(
        prev.notes,
        notes ?? [],
        action
      ),
    }))
  }

  if (notebookLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!notebook) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="mb-4 text-2xl font-bold">{t('notebooks.notFound')}</h1>
          <p className="text-muted-foreground">{t('notebooks.notFoundDesc')}</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 overflow-hidden bg-[#f7f7fc]">
        {/* LEFT SIDEBAR */}
        <aside className="hidden w-[280px] shrink-0 flex-col border-r border-violet-100 bg-white lg:flex xl:w-[300px]">
          <div className="shrink-0 border-b border-violet-100 bg-gradient-to-r from-blue-50/80 to-violet-50/80 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                <span className="text-lg font-bold">N</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-500">Workspace</p>
                <h2 className="truncate text-sm font-bold text-slate-900">
                  {notebook.name}
                </h2>
              </div>
              <span className="rounded-full bg-violet-100 px-2 py-1 text-[9px] font-bold text-violet-700">
                ACTIVE
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('open-notebook-source-dialog'))}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                + Thêm nguồn
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('open-notebook-note-editor'))}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100 px-2 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
              >
                + Viết ghi chú
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-slate-800">Nguồn</p>
              <span className="text-[10px] text-slate-400">{(sources?.length ?? 0) + (notes?.length ?? 0)}</span>
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-300 focus-within:bg-white">
              <span className="text-slate-400">⌕</span>
              <input value={sidebarQuery} onChange={event => setSidebarQuery(event.target.value)} placeholder="Tìm nguồn trong notebook..." aria-label="Tìm nguồn và ghi chú" className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400" />
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-notebook-source-dialog', { detail: { type: 'link' } }))} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-2 text-[10px] font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50">
                <span className="text-base">◎</span>Tìm trên web
              </button>
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-notebook-source-dialog', { detail: { type: 'link' } }))} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-2 text-[10px] font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50">
                <span className="text-base">↗</span>Liên kết
              </button>
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-notebook-source-dialog', { detail: { type: 'upload' } }))} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-2 text-[10px] font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50">
                <span className="text-base">⇧</span>Tải tệp
              </button>
            </div>
            <div className="min-h-[280px]">
              <SourcesColumn
                sources={filteredSources}
                isLoading={sourcesLoading}
                notebookId={notebookId}
                notebookName={notebook.name}
                onRefresh={refetchSources}
                contextSelections={contextSelections.sources}
                onContextModeChange={handleSourceContextModeChange}
                onBulkContextModeChange={handleBulkSourceContext}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            </div>

            <div className="mt-3 min-h-[220px]">
              <NotesColumn
                notes={filteredNotes}
                isLoading={notesLoading}
                notebookId={notebookId}
                contextSelections={contextSelections.notes}
                onContextModeChange={handleNoteContextModeChange}
                onBulkContextModeChange={handleBulkNoteContext}
              />
            </div>
          </div>

          <a
            href="/settings"
            className="shrink-0 border-t border-violet-100 px-4 py-3 text-xs font-medium text-slate-600 hover:bg-violet-50"
          >
            ⚙ Cài đặt & Tùy chọn
          </a>
        </aside>

        {/* CENTER CHAT */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col p-3 md:p-4 xl:p-5">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-sm">
            {activeStudioTool === null ? (
              <ChatColumn
                notebookId={notebookId}
                contextSelections={contextSelections}
                sources={sources}
                sourcesLoading={sourcesLoading}
              />
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex shrink-0 items-center gap-3 border-b border-violet-100 bg-white px-4 py-3">
                  <button type="button" onClick={() => setActiveStudioTool(null)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    ← Quay lại Chat
                  </button>
                  <span className="text-sm font-semibold text-slate-800">
                    {{
                      podcasts: 'Podcast Studio',
                      transformations: 'Transformations',
                      sources: 'Sources',
                      notebooks: 'Notebooks',
                      search: 'Ask & Search',
                    }[activeStudioTool]}
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {activeStudioTool === 'podcasts' && <PodcastsPageContent embedded />}
                  {activeStudioTool === 'transformations' && <TransformationsPageContent embedded />}
                  {activeStudioTool === 'sources' && <SourcesPageContent embedded />}
                  {activeStudioTool === 'notebooks' && <NotebooksPageContent embedded />}
                  {activeStudioTool === 'search' && (
                    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Đang tải công cụ tìm kiếm...</div>}>
                      <SearchPageContent embedded />
                    </Suspense>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT STUDIO */}
        <div className="hidden w-[270px] shrink-0 p-3 pl-0 lg:block xl:w-[300px] xl:p-4 xl:pl-0">
          <StudioColumn onSelect={setActiveStudioTool} />
        </div>
      </div>
    </AppShell>
  )
}
