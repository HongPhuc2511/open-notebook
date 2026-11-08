'use client'

import { useMemo, useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { NotebookList } from './components/NotebookList'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List } from 'lucide-react'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { CreateNotebookDialog } from '@/components/notebooks/CreateNotebookDialog'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useNotebookViewStore } from '@/lib/stores/notebook-view-store'

export default function NotebooksPage() {
  const { t } = useTranslation()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const viewMode = useNotebookViewStore((state) => state.viewMode)
  const setViewMode = useNotebookViewStore((state) => state.setViewMode)
  const { data: notebooks, isLoading } = useNotebooks(false)
  const { data: archivedNotebooks } = useNotebooks(true)

  const normalizedQuery = searchTerm.trim().toLowerCase()

  const filteredActive = useMemo(() => {
    if (!notebooks) {
      return undefined
    }
    if (!normalizedQuery) {
      return notebooks
    }
    return notebooks.filter((notebook) =>
      notebook.name.toLowerCase().includes(normalizedQuery)
    )
  }, [notebooks, normalizedQuery])

  const filteredArchived = useMemo(() => {
    if (!archivedNotebooks) {
      return undefined
    }
    if (!normalizedQuery) {
      return archivedNotebooks
    }
    return archivedNotebooks.filter((notebook) =>
      notebook.name.toLowerCase().includes(normalizedQuery)
    )
  }, [archivedNotebooks, normalizedQuery])

  const hasArchived = (archivedNotebooks?.length ?? 0) > 0
  const isSearching = normalizedQuery.length > 0

  // Search and view switch live in the shared top bar, next to the create button
  const topBarActions = (
    <>
      <Input
        id="notebook-search"
        name="notebook-search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder={t('notebooks.searchPlaceholder')}
        autoComplete="off"
        aria-label={t('common.accessibility.searchNotebooks') || 'Search notebooks'}
        className="w-32 rounded-full sm:w-48 lg:w-64"
      />
      {/* Tile / list switch, hidden on very small screens */}
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
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-8 px-8 py-6">
          {/* The top bar tab already names the page; keep the title for screen readers */}
          <h1 className="sr-only">{t('notebooks.title')}</h1>

          <NotebookList
            notebooks={filteredActive}
            isLoading={isLoading}
            title={t('notebooks.activeNotebooks')}
            emptyTitle={isSearching ? t('common.noMatches') : undefined}
            emptyDescription={isSearching ? t('common.tryDifferentSearch') : undefined}
            onAction={!isSearching ? () => setCreateDialogOpen(true) : undefined}
            actionLabel={!isSearching ? t('notebooks.newNotebook') : undefined}
          />

          {hasArchived && (
            <NotebookList
              notebooks={filteredArchived}
              isLoading={false}
              title={t('notebooks.archivedNotebooks')}
              collapsible
              emptyTitle={isSearching ? t('common.noMatches') : undefined}
              emptyDescription={isSearching ? t('common.tryDifferentSearch') : undefined}
            />
          )}
        </div>
      </div>

      <CreateNotebookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </AppShell>
  )
}