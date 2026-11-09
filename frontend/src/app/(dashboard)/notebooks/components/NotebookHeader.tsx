'use client'

import { useState } from 'react'
import { NotebookResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Archive, ArchiveRestore, MoreVertical, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateNotebook } from '@/lib/hooks/use-notebooks'
import { NotebookDeleteDialog } from './NotebookDeleteDialog'
import { formatDistanceToNow } from 'date-fns'
import { getDateLocale } from '@/lib/utils/date-locale'
import { InlineEdit } from '@/components/common/InlineEdit'
import { useTranslation } from '@/lib/hooks/use-translation'

interface NotebookHeaderProps {
  notebook: NotebookResponse
}

export function NotebookHeader({ notebook }: NotebookHeaderProps) {
  const { t, language } = useTranslation()
  const dfLocale = getDateLocale(language)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const updateNotebook = useUpdateNotebook()

  const handleUpdateName = async (name: string) => {
    if (!name || name === notebook.name) return
    
    await updateNotebook.mutateAsync({
      id: notebook.id,
      data: { name }
    })
  }

  const handleUpdateDescription = async (description: string) => {
    if (description === notebook.description) return
    
    await updateNotebook.mutateAsync({
      id: notebook.id,
      data: { description }
    })
  }

  const handleArchiveToggle = () => {
    updateNotebook.mutate({
      id: notebook.id,
      data: { archived: !notebook.archived }
    })
  }

  return (
    <>
      {/* One compact row: back, title, description, timestamps, overflow menu.
          Items use flex-1 with a max width (no w-full), so nothing collapses. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          aria-label="Back to notebooks"
        >
          <Link href="/notebooks">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="min-w-[8rem] max-w-[22rem] flex-1">
          <InlineEdit
            id="notebook-name"
            name="notebook-name"
            value={notebook.name}
            onSave={handleUpdateName}
            className="text-xl font-normal tracking-tight"
            inputClassName="text-xl font-normal tracking-tight"
            placeholder={t('notebooks.namePlaceholder')}
          />
        </div>

        {notebook.archived && (
          <Badge variant="secondary" className="rounded-full">
            {t('notebooks.archived')}
          </Badge>
        )}

        <div className="min-w-[8rem] max-w-md flex-1">
          <InlineEdit
            id="notebook-description"
            name="notebook-description"
            value={notebook.description || ''}
            onSave={handleUpdateDescription}
            className="text-sm text-muted-foreground"
            inputClassName="text-sm text-muted-foreground"
            placeholder={t('notebooks.addDescription')}
            multiline
            emptyText={t('notebooks.addDescription')}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden whitespace-nowrap text-xs text-muted-foreground xl:block">
            {t('common.created', { time: formatDistanceToNow(new Date(notebook.created), { addSuffix: true, locale: dfLocale }) })} •{' '}
            {t('common.updated', { time: formatDistanceToNow(new Date(notebook.updated), { addSuffix: true, locale: dfLocale }) })}
          </span>

          {/* Archive / delete live in an overflow menu, like NotebookLM */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                aria-label="More actions"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleArchiveToggle}>
                {notebook.archived ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    {t('notebooks.unarchive')}
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    {t('notebooks.archive')}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <NotebookDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        notebookId={notebook.id}
        notebookName={notebook.name}
        redirectAfterDelete
      />
    </>
  )
}