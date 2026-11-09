'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { sourcesApi, type SourceSortField } from '@/lib/api/sources'
import { SourceListResponse } from '@/lib/types/api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { AppShell } from '@/components/layout/AppShell'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FileText, Trash2, ArrowDown, ArrowUp, ArrowUpDown, Plus, LayoutGrid, List } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getDateLocale } from '@/lib/utils/date-locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getApiErrorKey } from '@/lib/utils/error-handler'
import { AddSourceDialog } from '@/components/sources/AddSourceDialog'
import { SourceCard } from '@/components/sources/SourceCard'
import { useSourceViewStore } from '@/lib/stores/source-view-store'

export default function SourcesPage() {
  const { t, language } = useTranslation()
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
  const failedToLoadMessage = t('sources.failedToLoad')
  const [sources, setSources] = useState<SourceListResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const viewMode = useSourceViewStore((state) => state.viewMode)
  const setViewMode = useSourceViewStore((state) => state.setViewMode)
  const [sortBy, setSortBy] = useState<SourceSortField>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; source: SourceListResponse | null }>({
    open: false,
    source: null
  })
  const router = useRouter()
  const tableRef = useRef<HTMLTableElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(true)
  const PAGE_SIZE = 30

const normalizedQuery = searchTerm.trim().toLowerCase()

const visibleSources = useMemo(() => {
  if (!normalizedQuery) return sources
  return sources.filter((source) => {
    const title = (source.title || '').toLowerCase()
    const url = (source.asset?.url || '').toLowerCase()
    return title.includes(normalizedQuery) || url.includes(normalizedQuery)
  })
}, [sources, normalizedQuery])

  const fetchSources = useCallback(async (reset = false) => {
    try {
      // Check flags before proceeding
      if (!reset && (loadingMoreRef.current || !hasMoreRef.current)) {
        return
      }

      if (reset) {
        setLoading(true)
        offsetRef.current = 0
        setSources([])
        hasMoreRef.current = true
      } else {
        loadingMoreRef.current = true
        setLoadingMore(true)
      }

      const data = await sourcesApi.list({
        limit: PAGE_SIZE,
        offset: offsetRef.current,
        sort_by: sortBy,
        sort_order: sortOrder,
      })

      if (reset) {
        setSources(data)
      } else {
        setSources(prev => [...prev, ...data])
      }

      // Check if we have more data
      const hasMoreData = data.length === PAGE_SIZE
      hasMoreRef.current = hasMoreData
      offsetRef.current += data.length
    } catch (err) {
      console.error('Failed to fetch sources:', err)
      setError(failedToLoadMessage)
      toast.error(failedToLoadMessage)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      loadingMoreRef.current = false
    }
  }, [sortBy, sortOrder, failedToLoadMessage])

  // Initial load and when sort changes
  useEffect(() => {
    fetchSources(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder])

    useEffect(() => {
    if (normalizedQuery && !loading && !loadingMoreRef.current && hasMoreRef.current) {
      fetchSources(false)
    }
  }, [normalizedQuery, loading, sources.length, fetchSources])

  useEffect(() => {
    // Focus the table when component mounts or sources change
    if (sources.length > 0 && tableRef.current && document.activeElement?.tagName !== 'INPUT') {
      tableRef.current.focus()
    }
  }, [sources])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    if (viewMode !== 'list' || visibleSources.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const newIndex = Math.min(prev + 1, visibleSources.length - 1)
            // Scroll to keep selected row visible
            setTimeout(() => scrollToSelectedRow(newIndex), 0)
            return newIndex
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const newIndex = Math.max(prev - 1, 0)
            // Scroll to keep selected row visible
            setTimeout(() => scrollToSelectedRow(newIndex), 0)
            return newIndex
          })
          break
        case 'Enter':
          e.preventDefault()
            if (visibleSources[selectedIndex]) {
            router.push(`/sources/${visibleSources[selectedIndex].id}`)
          }
          break
        case 'Home':
          e.preventDefault()
          setSelectedIndex(0)
          setTimeout(() => scrollToSelectedRow(0), 0)
          break
        case 'End':
          e.preventDefault()
          const lastIndex = visibleSources.length - 1
          setSelectedIndex(lastIndex)
          setTimeout(() => scrollToSelectedRow(lastIndex), 0)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visibleSources, selectedIndex, router, viewMode])

  const scrollToSelectedRow = (index: number) => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    // Find the selected row element
    const rows = scrollContainer.querySelectorAll('tbody tr')
    const selectedRow = rows[index] as HTMLElement
    if (!selectedRow) return

    const containerRect = scrollContainer.getBoundingClientRect()
    const rowRect = selectedRow.getBoundingClientRect()

    // Check if row is above visible area
    if (rowRect.top < containerRect.top) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Check if row is below visible area
    else if (rowRect.bottom > containerRect.bottom) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  // Set up scroll listener after sources are loaded
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    let scrollTimeout: NodeJS.Timeout | null = null

    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }

      scrollTimeout = setTimeout(() => {
        if (!scrollContainerRef.current) return

        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight

        // Load more when within 200px of the bottom
        if (distanceFromBottom < 200 && !loadingMoreRef.current && hasMoreRef.current) {
          fetchSources(false)
        }
      }, 100)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    handleScroll() // Check on mount

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [fetchSources, sources.length])

  const toggleSort = (field: SourceSortField) => {
    setSelectedIndex(0)
    if (sortBy === field) {
      // Toggle order if clicking the same field
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // Switch to new field with default desc order
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const renderSortableHeader = (
    field: SourceSortField,
    label: string,
    align: 'left' | 'center' = 'left'
  ) => {
    const active = sortBy === field
    const SortIcon = active ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleSort(field)}
        className={cn(
          "h-8 px-2 hover:bg-muted",
          align === 'center' && "mx-auto"
        )}
      >
        {label}
        <SortIcon className={cn(
          "ml-2 h-3 w-3",
          active ? 'opacity-100' : 'opacity-30'
        )} />
      </Button>
    )
  }

  // Content-type pebble — type hues live in dots, never washes
  const getSourceTypeDotClass = (source: SourceListResponse) => {
    if (source.asset?.url) return 'bg-type-web'
    if (source.asset?.file_path) return 'bg-type-pdf'
    return 'bg-type-note'
  }

  const getSourceType = (source: SourceListResponse) => {
    if (source.asset?.url) return t('sources.type.link')
    if (source.asset?.file_path) return t('sources.type.file')
    return t('sources.type.text')
  }

  const handleRowClick = useCallback((index: number, sourceId: string) => {
    setSelectedIndex(index)
    router.push(`/sources/${sourceId}`)
  }, [router])

  const handleDeleteClick = useCallback((e: React.MouseEvent, source: SourceListResponse) => {
    e.stopPropagation() // Prevent row click
    setDeleteDialog({ open: true, source })
  }, [])

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.source) return

    try {
      await sourcesApi.delete(deleteDialog.source.id)
      toast.success(t('sources.deleteSuccess'))
      // Remove the deleted source from the list
      setSources(prev => prev.filter(s => s.id !== deleteDialog.source?.id))
      setDeleteDialog({ open: false, source: null })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }, message?: string };
      console.error('Failed to delete source:', error)
      toast.error(t(getApiErrorKey(error.response?.data?.detail || error.message)))
    }
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-destructive">{error}</p>
        </div>
      )
    }

    if (sources.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title={t('sources.noSourcesYet')}
          description={t('sources.allSourcesDescShort')}
          action={
            <Button onClick={() => setSourceDialogOpen(true)} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              {t('sources.newSource')}
            </Button>
          }
        />
      )
    }

    return (<>
      <div className="flex flex-col h-full w-full max-w-none px-8 py-6">
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-2xl font-normal tracking-tight">{t('sources.allSources')}</h1>
          <p className="mt-2 text-muted-foreground">
            {t('sources.allSourcesDesc')}
          </p>
        </div>

        <div
          ref={scrollContainerRef}
          className={cn('flex-1 overflow-auto', viewMode === 'list' && 'rounded-2xl bg-popover')}
        >
          {viewMode === 'list' ? (
          <table
            ref={tableRef}
            tabIndex={0}
            className="w-full min-w-[1040px] outline-none table-fixed"
          >
            <colgroup>
              <col className="w-[120px]" />
              <col className="w-auto" />
              <col className="w-[160px]" />
              <col className="w-[160px]" />
              <col className="w-[110px]" />
              <col className="w-[140px]" />
              <col className="w-[90px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-popover">
              <tr className="border-b">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  {renderSortableHeader('type', t('common.type'))}
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  {renderSortableHeader('title', t('common.title'))}
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">
                  {renderSortableHeader('created', t('common.created_label'))}
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">
                  {renderSortableHeader('updated', t('common.updated_label'))}
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground hidden md:table-cell">
                  {renderSortableHeader('insights_count', t('sources.insights'), 'center')}
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground hidden lg:table-cell">
                  {renderSortableHeader('embedded', t('sources.embedded'), 'center')}
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleSources.length === 0 && (
                <tr>
                  <td colSpan={7} className="h-24 text-center text-muted-foreground">
                    {t('common.noMatches')}
                  </td>
                </tr>
              )}
              {visibleSources.map((source, index) => (
                <tr
                  key={source.id}
                  onClick={() => handleRowClick(index, source.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "border-b transition-colors cursor-pointer",
                    selectedIndex === index
                      ? "bg-accent"
                      : "hover:bg-[var(--surface-raised)]"
                  )}
                >
                  <td className="h-12 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn('h-2 w-2 shrink-0 rounded-full', getSourceTypeDotClass(source))}
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {getSourceType(source)}
                      </span>
                    </div>
                  </td>
                  <td className="h-12 px-4">
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium truncate">
                        {source.title || t('sources.untitledSource')}
                      </span>
                      {source.asset?.url && (
                        <span className="text-xs text-muted-foreground truncate">
                          {source.asset.url}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="h-12 whitespace-nowrap px-4 text-muted-foreground text-sm hidden sm:table-cell">
                    {formatDistanceToNow(new Date(source.created), { 
                      addSuffix: true,
                      locale: getDateLocale(language)
                    })}
                  </td>
                  <td className="h-12 whitespace-nowrap px-4 text-muted-foreground text-sm hidden sm:table-cell">
                    {formatDistanceToNow(new Date(source.updated), {
                      addSuffix: true,
                      locale: getDateLocale(language)
                    })}
                  </td>
                  <td className="h-12 px-4 text-center hidden md:table-cell">
                    <span className="text-sm font-medium">{source.insights_count || 0}</span>
                  </td>
                  <td className="h-12 px-4 text-center hidden lg:table-cell">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        source.embedded
                          ? "bg-fern-tint text-fern-deep dark:text-fern"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {source.embedded ? t('sources.yes') : t('sources.no')}
                    </span>
                  </td>
                  <td className="h-12 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(e, source)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {loadingMore && (
                <tr>
                  <td colSpan={7} className="h-16 text-center">
                    <div className="flex items-center justify-center">
                      <LoadingSpinner />
                      <span className="ml-2 text-muted-foreground">{t('sources.loadingMore')}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          ) : (
            <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleSources.length === 0 && (
                <p className="col-span-full py-12 text-center text-muted-foreground">
                  {t('common.noMatches')}
                </p>
              )}
              {visibleSources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  className="rounded-2xl bg-secondary hover:bg-accent"
                  onClick={(sourceId) => router.push(`/sources/${sourceId}`)}
                  onDelete={() => setDeleteDialog({ open: true, source })}
                />
              ))}
              {loadingMore && (
                <div className="col-span-full flex items-center justify-center py-6">
                  <LoadingSpinner />
                  <span className="ml-2 text-muted-foreground">{t('sources.loadingMore')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, source: deleteDialog.source })}
        title={t('sources.delete')}
        description={t('sources.deleteConfirmWithTitle', { title: deleteDialog.source?.title || t('sources.untitledSource') })}
        confirmText={t('common.delete')}
        confirmVariant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>)
  }

  const topBarActions = (
    <>
    <Input
      id="source-search"
      name="source-search"
      value={searchTerm}
      onChange={(event) => {
        setSearchTerm(event.target.value)
        setSelectedIndex(0)
      }}
      placeholder={t('sources.searchPlaceholder')}
      autoComplete="off"
      aria-label={t('sources.searchPlaceholder')}
      className="w-32 rounded-full sm:w-48 lg:w-64"
    />
    <div className="hidden shrink-0 items-center rounded-full bg-muted p-1 sm:flex">
      <Button
        variant={viewMode === 'tile' ? 'tonal' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('tile')}
        aria-label={t('notebooks.tileView')}
        aria-pressed={viewMode === 'tile'}
        title={t('notebooks.tileView')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'list' ? 'tonal' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('list')}
        aria-label={t('notebooks.listView')}
        aria-pressed={viewMode === 'list'}
        title={t('notebooks.listView')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
    </>
  )

  return (
    <AppShell topBarActions={topBarActions}>
      {renderContent()}
      <AddSourceDialog
        open={sourceDialogOpen}
        onOpenChange={(open) => {
          setSourceDialogOpen(open)
          if (!open) fetchSources(true)
        }}
      />
    </AppShell>
  )
}
