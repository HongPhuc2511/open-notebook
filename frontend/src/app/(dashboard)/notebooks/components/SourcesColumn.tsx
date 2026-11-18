'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { SourceListResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, FileText, Link2, ChevronDown, ChevronRight, Loader2, Globe2, Upload, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { AddSourceDialog } from '@/components/sources/AddSourceDialog'
import { AddExistingSourceDialog } from '@/components/sources/AddExistingSourceDialog'
import { SourceCard } from '@/components/sources/SourceCard'
import { useDeleteSource, useRetrySource, useRemoveSourceFromNotebook } from '@/lib/hooks/use-sources'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { ContextMode } from '../[id]/page'
import type { SourceBulkAction } from '@/lib/utils/source-context'
import { CollapsibleColumn, createCollapseButton } from '@/components/notebooks/CollapsibleColumn'
import { useNotebookColumnsStore } from '@/lib/stores/notebook-columns-store'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Checkbox } from '@/components/ui/checkbox'

interface SourcesColumnProps {
  sources?: SourceListResponse[]
  isLoading: boolean
  notebookId: string
  notebookName?: string
  onRefresh?: () => void
  contextSelections?: Record<string, ContextMode>
  onContextModeChange?: (sourceId: string, mode: ContextMode) => void
  onBulkContextModeChange?: (action: SourceBulkAction) => void
  // Pagination props
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
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: SourcesColumnProps) {
  const { t } = useTranslation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [sourceDialogType, setSourceDialogType] = useState<'link' | 'upload' | 'text'>('upload')
  const [addExistingDialogOpen, setAddExistingDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [sourceToRemove, setSourceToRemove] = useState<string | null>(null)
  const [sourceQuery, setSourceQuery] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const visibleSources = useMemo(() => {
    const query = sourceQuery.trim().toLowerCase()
    if (!query) return sources ?? []
    return (sources ?? []).filter(source =>
      `${source.title ?? ''} ${source.asset?.url ?? ''} ${source.asset?.file_path ?? ''}`
        .toLowerCase()
        .includes(query)
    )
  }, [sources, sourceQuery])

  const sourceGroups = useMemo(() => {
    const groups = [
      { id: 'text', label: 'Ghi chú', items: [] as SourceListResponse[] },
      { id: 'link', label: 'Nguồn web', items: [] as SourceListResponse[] },
      { id: 'upload', label: 'Tệp tải lên', items: [] as SourceListResponse[] },
    ]
    for (const source of visibleSources) {
      if (source.asset?.url) groups[1].items.push(source)
      else if (source.asset?.file_path) groups[2].items.push(source)
      else groups[0].items.push(source)
    }
    // Keep all three sections visible to match the reference layout, including empty groups.
    return groups
  }, [visibleSources])

  const { openModal } = useModalManager()
  const deleteSource = useDeleteSource()
  const retrySource = useRetrySource()
  const removeFromNotebook = useRemoveSourceFromNotebook()

  // Collapsible column state
  const { sourcesCollapsed, toggleSources } = useNotebookColumnsStore()
  const collapseButton = useMemo(
    () => createCollapseButton(toggleSources, t('navigation.sources')),
    [toggleSources, t('navigation.sources')]
  )

  // Scroll container ref for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Allow the notebook workspace header to open the existing source dialog.
  useEffect(() => {
    const openDialog = (event: Event) => {
      const requestedType = (event as CustomEvent<{ type?: 'link' | 'upload' | 'text' }>).detail?.type
      setSourceDialogType(requestedType === 'link' || requestedType === 'text' ? requestedType : 'upload')
      setAddDialogOpen(true)
    }
    window.addEventListener('open-notebook-source-dialog', openDialog)
    return () => window.removeEventListener('open-notebook-source-dialog', openDialog)
  }, [])

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || !hasNextPage || isFetchingNextPage || !fetchNextPage) return

    const { scrollTop, scrollHeight, clientHeight } = container
    // Load more when user scrolls within 200px of the bottom
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])
  
  // True when every loaded source is included in the chat context
  const allSelected =
    !!sources?.length &&
    sources.every((s) => contextSelections?.[s.id] && contextSelections[s.id] !== 'off')

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
      // Error toast is handled by the hook
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

  return (
    <>
      <CollapsibleColumn
        isCollapsed={sourcesCollapsed}
        onToggle={toggleSources}
        collapsedIcon={FileText}
        collapsedLabel={t('navigation.sources')}
      >
        <Card className="h-full flex flex-col flex-1 gap-3 overflow-hidden rounded-2xl bg-popover py-5">
          <CardHeader className="shrink-0 space-y-3 px-3 pb-2 pt-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-medium text-foreground">
                {t('navigation.sources')}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" title="Tìm trên web"
                  onClick={() => { setSourceDialogType('link'); setAddDialogOpen(true) }}>
                  <Globe2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Web</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" title="Thêm liên kết"
                  onClick={() => { setSourceDialogType('link'); setAddDialogOpen(true) }}>
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Liên kết</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" title="Tải tệp"
                  onClick={() => { setSourceDialogType('upload'); setAddDialogOpen(true) }}>
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Tệp</span>
                </Button>
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="tonal" className="h-8 w-8 rounded-full" title={t('sources.addSource')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setDropdownOpen(false); setAddDialogOpen(true) }}>
                      <Plus className="mr-2 h-4 w-4" />{t('sources.addSource')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setDropdownOpen(false); setAddExistingDialogOpen(true) }}>
                      <Link2 className="mr-2 h-4 w-4" />{t('sources.addExistingTitle')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {collapseButton}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-2 focus-within:border-primary/50">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input value={sourceQuery} onChange={event => setSourceQuery(event.target.value)}
                placeholder="Tìm nguồn trong notebook..." aria-label="Tìm nguồn trong notebook"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
          </CardHeader>

          <CardContent ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><LoadingSpinner /></div>
            ) : !sources || sources.length === 0 ? (
              <EmptyState icon={FileText} title={t('sources.noSourcesYet')} description={t('sources.createFirstSource')} />
            ) : visibleSources.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">Không tìm thấy nguồn phù hợp.</p>
            ) : (
              <div className="space-y-3">
                {onBulkContextModeChange && (
                  <label className="flex cursor-pointer items-center justify-end gap-3 px-2 py-2 text-sm text-muted-foreground">
                    {t('sources.selectAll')}
                    <Checkbox
                      checked={!!visibleSources.length && visibleSources.every(source => contextSelections?.[source.id] && contextSelections[source.id] !== 'off')}
                      onCheckedChange={() => onBulkContextModeChange(allSelected ? 'exclude' : 'full')}
                    />
                  </label>
                )}
                {sourceGroups.map(group => (
                  <section key={group.id} className="overflow-hidden">
                    <button type="button"
                      onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                      className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted/60"
                      aria-expanded={!collapsedGroups[group.id]}>
                      {collapsedGroups[group.id]
                        ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span>{group.label}</span>
                      <span className="text-muted-foreground">({group.items.length})</span>
                    </button>
                    {!collapsedGroups[group.id] && (
                      <div className="space-y-1">
                        {group.items.map(source => (
                          <SourceCard key={source.id} source={source}
                            onClick={handleSourceClick} onDelete={handleDeleteClick}
                            onRetry={handleRetry} onRefreshContent={handleRetry}
                            onRemoveFromNotebook={handleRemoveFromNotebook} onRefresh={onRefresh}
                            showRemoveFromNotebook={true} contextMode={contextSelections?.[source.id]}
                            onContextModeChange={onContextModeChange ? mode => onContextModeChange(source.id, mode) : undefined} />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
                {isFetchingNextPage && <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleColumn>

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        defaultNotebookId={notebookId}
        initialType={sourceDialogType}
      />

      <AddExistingSourceDialog
        open={addExistingDialogOpen}
        onOpenChange={setAddExistingDialogOpen}
        notebookId={notebookId}
        onSuccess={onRefresh}
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
    </>
  )
}
