import fs from 'node:fs'
import path from 'node:path'

const DRY_RUN = process.argv.includes('--dry')
const ROOT = process.cwd()

const FILES = {
  topBar: 'frontend/src/components/layout/AppTopBar.tsx',
  shell: 'frontend/src/components/layout/AppShell.tsx',
  header: 'frontend/src/app/(dashboard)/notebooks/components/NotebookHeader.tsx',
  page: 'frontend/src/app/(dashboard)/notebooks/[id]/page.tsx',
}

const NOTEBOOK_HEADER = `'use client'

import { useState } from 'react'
import { NotebookResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Archive, ArchiveRestore, MoreVertical, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateNotebook } from '@/lib/hooks/use-notebooks'
import { NotebookDeleteDialog } from './NotebookDeleteDialog'
import { InlineEdit } from '@/components/common/InlineEdit'
import { useTranslation } from '@/lib/hooks/use-translation'

interface NotebookHeaderProps {
  notebook: NotebookResponse
}

export function NotebookHeader({ notebook }: NotebookHeaderProps) {
  const { t } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const updateNotebook = useUpdateNotebook()

  const handleUpdateName = async (name: string) => {
    if (!name || name === notebook.name) return

    await updateNotebook.mutateAsync({
      id: notebook.id,
      data: { name }
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
      <div className="flex min-w-0 items-center gap-1">
        <div className="min-w-[8rem] max-w-[28rem]">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              aria-label="More actions"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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
`

const PLANS = [
  {
    file: FILES.topBar,
    edits: [
      {
        from: /interface AppTopBarProps \{[\s\S]*?\n\}/,
        to: `interface AppTopBarProps {
  // Optional page-specific controls (e.g. search, view toggle) shown before the create button
  actions?: React.ReactNode
  // When set, replaces the app name and the main tabs (used by the notebook page)
  title?: React.ReactNode
}`,
      },
      {
        from: /export function AppTopBar\(\{ actions(?:, title)? \}: AppTopBarProps\) \{/,
        to: 'export function AppTopBar({ actions, title }: AppTopBarProps) {',
      },
      {
        from: /<header[\s\S]*?>(?=\n\s*\{\/\* Small screens)/,
        to: `<header
      className={cn(
        'flex shrink-0 items-center gap-2 bg-background px-3 sm:px-6',
        title ? 'h-14' : 'h-16'
      )}
    >`,
      },
      {
        from: '<span className="hidden whitespace-nowrap text-xl font-normal tracking-tight sm:inline">',
        to: `<span
          className={cn(
            'hidden whitespace-nowrap text-xl font-normal tracking-tight',
            !title && 'sm:inline'
          )}
        >`,
      },
      {
        from: '<nav className="ml-4 hidden items-center gap-1 md:flex">',
        to: `<nav className={cn('ml-4 hidden items-center gap-1', !title && 'md:flex')}>`,
      },
      {
        from: /(?:\{title \? \(\s*<div className="ml-\d flex min-w-0 flex-1 items-center">\{title\}<\/div>\s*\) : \(\s*<div className="flex-1" \/>\s*\)\}|<div className="flex-1" \/>)(?=\s*\{actions\})/,
        to: `{title ? (
        <div className="ml-1 flex min-w-0 flex-1 items-center">{title}</div>
      ) : (
        <div className="flex-1" />
      )}`,
      },
    ],
  },
  {
    file: FILES.shell,
    edits: [
      {
        from: /\/\/ Page-specific controls rendered inside the top bar \(e\.g\. search, view toggle\)\n\s*topBarActions\?: React\.ReactNode(?:\n\s*\/\/[^\n]*\n\s*topBarTitle\?: React\.ReactNode)?/,
        to: `// Page-specific controls rendered inside the top bar (e.g. search, view toggle)
  topBarActions?: React.ReactNode
  // Replaces the app name and the navigation tabs in the top bar
  topBarTitle?: React.ReactNode`,
      },
      {
        from: /export function AppShell\(\{ children, hideSidebar = false, topBarActions(?:, topBarTitle)? \}: AppShellProps\) \{/,
        to: 'export function AppShell({ children, hideSidebar = false, topBarActions, topBarTitle }: AppShellProps) {',
      },
      {
        from: /\{!hideSidebar && <AppTopBar actions=\{topBarActions\}(?: title=\{topBarTitle\})? \/>\}/,
        to: '{!hideSidebar && <AppTopBar actions={topBarActions} title={topBarTitle} />}',
      },
    ],
  },
  {
    file: FILES.header,
    overwrite: NOTEBOOK_HEADER,
  },
  {
    file: FILES.page,
    edits: [
      {
        from: /<AppShell(?: hideSidebar| topBarTitle=\{<NotebookHeader notebook=\{notebook\} \/>\})?>\s*<div className="flex flex-col flex-1 min-h-0">[\s\S]*?<div className="flex-1 [^"]*overflow-x-auto flex flex-col">/,
        to: `<AppShell topBarTitle={<NotebookHeader notebook={notebook} />}>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 px-3 pb-2 pt-0 overflow-x-auto flex flex-col">`,
      },
    ],
  },
]

function countMatches(text, from) {
  if (typeof from === 'string') return text.split(from).length - 1
  const flags = from.flags.includes('g') ? from.flags : from.flags + 'g'
  return (text.match(new RegExp(from.source, flags)) || []).length
}

function applyEdit(text, edit) {
  if (text.includes(edit.to)) return { text, status: 'skip' }
  const count = countMatches(text, edit.from)
  if (count !== 1) return { text, status: 'fail', count }
  return { text: text.replace(edit.from, () => edit.to), status: 'ok' }
}

let failed = false
const pending = []

for (const plan of PLANS) {
  const abs = path.join(ROOT, plan.file)
  if (!fs.existsSync(abs)) {
    console.log(`LOI  khong thay file: ${plan.file}`)
    failed = true
    continue
  }

  const raw = fs.readFileSync(abs, 'utf8')
  const crlf = raw.includes('\r\n')
  let text = raw.replace(/\r\n/g, '\n')
  let changed = false

  if (plan.overwrite !== undefined) {
    if (text.trim() === plan.overwrite.trim()) {
      console.log(`BO QUA  ${plan.file} (da dung noi dung)`)
    } else {
      text = plan.overwrite
      changed = true
      console.log(`OK      ${plan.file} (ghi de ca file)`)
    }
  } else {
    plan.edits.forEach((edit, index) => {
      const result = applyEdit(text, edit)
      text = result.text
      if (result.status === 'ok') {
        changed = true
        console.log(`OK      ${plan.file} (doan ${index + 1})`)
      } else if (result.status === 'skip') {
        console.log(`BO QUA  ${plan.file} (doan ${index + 1} da ap dung)`)
      } else {
        failed = true
        console.log(
          `LOI     ${plan.file} (doan ${index + 1}): tim thay ${result.count} cho khop, can dung 1`
        )
      }
    })
  }

  if (changed) {
    pending.push({ abs, content: crlf ? text.replace(/\n/g, '\r\n') : text })
  }
}

if (failed) {
  console.log('\nCo loi, chua ghi file nao. Hay sua tay cac doan bao LOI roi chay lai.')
  process.exit(1)
}

if (DRY_RUN) {
  console.log(`\nChay thu xong: ${pending.length} file se duoc sua. Chay lai khong co --dry de ghi.`)
  process.exit(0)
}

for (const item of pending) {
  fs.writeFileSync(item.abs, item.content, 'utf8')
}
console.log(`\nDa ghi ${pending.length} file.`)