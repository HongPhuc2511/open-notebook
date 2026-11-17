'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, AlertTriangle, Mic, LayoutTemplate, RefreshCw, Play, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { EpisodesTab } from '@/components/podcasts/EpisodesTab'
import { TemplatesTab } from '@/components/podcasts/TemplatesTab'
import { useEpisodeProfiles, useSpeakerProfiles } from '@/lib/hooks/use-podcasts'
import { needsModelSetup } from '@/lib/types/podcasts'
import { DefaultPromptEditor } from '@/app/(dashboard)/transformations/components/DefaultPromptEditor'
import { TransformationsList } from '@/app/(dashboard)/transformations/components/TransformationsList'
import { TransformationPlayground } from '@/app/(dashboard)/transformations/components/TransformationPlayground'
import { useTransformations } from '@/lib/hooks/use-transformations'
import type { Transformation } from '@/lib/types/transformations'
import { RebuildEmbeddings } from '@/app/(dashboard)/advanced/components/RebuildEmbeddings'
import { SystemInfo } from '@/app/(dashboard)/advanced/components/SystemInfo'
import { SourcesColumn } from './SourcesColumn'
import { NotesColumn } from './NotesColumn'
import { NotebookList } from './NotebookList'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { CreateNotebookDialog } from '@/components/notebooks/CreateNotebookDialog'
import type { SourceListResponse, NoteResponse } from '@/lib/types/api'
import type { ContextMode, NoteContextMode } from '../[id]/page'
import type { SourceBulkAction, NoteContextDefault } from '@/lib/utils/source-context'
import { useTranslation } from '@/lib/hooks/use-translation'

export type WorkspaceTool = 'podcast' | 'podcast-templates' | 'transformations' | 'playground' | 'embeddings' | 'system-info' | 'notes' | 'sources' | 'notebooks'

interface Props {
  tool: WorkspaceTool | null
  onBack: () => void
  notebookId: string
  notebookName?: string
  sources?: SourceListResponse[]
  sourcesLoading: boolean
  notes?: NoteResponse[]
  notesLoading: boolean
  contextSelections: { sources: Record<string, ContextMode>; notes: Record<string, NoteContextMode> }
  onSourceContextModeChange: (id: string, mode: ContextMode) => void
  onBulkSourceContext: (action: SourceBulkAction) => void
  onNoteContextModeChange: (id: string, mode: NoteContextMode) => void
  onBulkNoteContext: (action: NoteContextDefault) => void
  onRefreshSources: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
}

export function WorkspaceToolPanel(props: Props) {
  const { t } = useTranslation()
  const [podcastTab, setPodcastTab] = useState<'episodes' | 'templates'>('episodes')
  const [transformationTab, setTransformationTab] = useState<'transformations' | 'playground'>('transformations')
  const [selectedTransformation, setSelectedTransformation] = useState<Transformation | undefined>()
  const [createNotebookOpen, setCreateNotebookOpen] = useState(false)
  const [notebookSearch, setNotebookSearch] = useState('')
  const { episodeProfiles } = useEpisodeProfiles()
  const { speakerProfiles } = useSpeakerProfiles(episodeProfiles)
  const hasUnconfiguredProfiles = useMemo(() => episodeProfiles.some(needsModelSetup) || speakerProfiles.some(needsModelSetup), [episodeProfiles, speakerProfiles])
  const { data: transformations, isLoading: transformationsLoading, refetch } = useTransformations()
  const { data: notebooks, isLoading: notebooksLoading } = useNotebooks(false)
  const { data: archivedNotebooks } = useNotebooks(true)
  const query = notebookSearch.trim().toLowerCase()
  const activeNotebooks = useMemo(() => !notebooks ? undefined : !query ? notebooks : notebooks.filter(n => n.name.toLowerCase().includes(query)), [notebooks, query])
  const archived = useMemo(() => !archivedNotebooks ? undefined : !query ? archivedNotebooks : archivedNotebooks.filter(n => n.name.toLowerCase().includes(query)), [archivedNotebooks, query])

  const title: Record<WorkspaceTool, string> = {
    podcast: 'Podcast episodes', 'podcast-templates': 'Podcast templates', transformations: 'Transformations', playground: 'Transformation playground',
    embeddings: 'Embeddings', 'system-info': 'System information', notes: 'Notebook notes', sources: 'Notebook sources', notebooks: 'Notebooks'
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/70 px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={props.onBack} className="shrink-0"><ArrowLeft className="mr-2 h-4 w-4" />Back to Chat</Button>
        <div className="min-w-0"><h2 className="truncate text-sm font-semibold">{props.tool ? title[props.tool] : 'Workspace'}</h2><p className="text-xs text-muted-foreground">Notebook workspace</p></div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        {props.tool === 'podcast' || props.tool === 'podcast-templates' ? <div className="space-y-5">
          {hasUnconfiguredProfiles && <Alert className="rounded-xl"><AlertTriangle className="h-4 w-4" /><AlertTitle>{t('podcasts.setupRequired')}</AlertTitle><AlertDescription>{t('podcasts.setupRequiredDesc')}</AlertDescription></Alert>}
          <Tabs value={props.tool === 'podcast-templates' ? 'templates' : podcastTab} onValueChange={v => setPodcastTab(v as 'episodes' | 'templates')}>
            <TabsList><TabsTrigger value="episodes"><Mic className="mr-2 h-4 w-4" />{t('podcasts.episodesTab')}</TabsTrigger><TabsTrigger value="templates"><LayoutTemplate className="mr-2 h-4 w-4" />{t('podcasts.templatesTab')}</TabsTrigger></TabsList>
            <TabsContent value="episodes" className="mt-5"><EpisodesTab /></TabsContent><TabsContent value="templates" className="mt-5"><TemplatesTab /></TabsContent>
          </Tabs>
          {props.tool === 'podcast-templates' && <p className="text-xs text-muted-foreground">Đã mở khu vực quản lý template. Chọn tab Templates để cấu hình profile.</p>}
        </div> : null}
        {props.tool === 'transformations' && <div className="space-y-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-xl font-semibold">{t('transformations.title')}</h3><p className="text-sm text-muted-foreground">{t('transformations.desc')}</p></div><Button variant="outline" size="icon" onClick={() => refetch()} title={t('common.refresh')}><RefreshCw className="h-4 w-4" /></Button></div><Tabs value={transformationTab} onValueChange={v => setTransformationTab(v as 'transformations' | 'playground')}><TabsList><TabsTrigger value="transformations"><WandSparkles className="mr-2 h-4 w-4" />Transformations</TabsTrigger><TabsTrigger value="playground"><Play className="mr-2 h-4 w-4" />Playground</TabsTrigger></TabsList><TabsContent value="transformations" className="space-y-5"><DefaultPromptEditor /><TransformationsList transformations={transformations} isLoading={transformationsLoading} onPlayground={item => { setSelectedTransformation(item); setTransformationTab('playground') }} /></TabsContent><TabsContent value="playground"><TransformationPlayground transformations={transformations} selectedTransformation={selectedTransformation} /></TabsContent></Tabs></div>}
        {props.tool === 'playground' && <div className="space-y-5"><div><h3 className="text-xl font-semibold">{t('transformations.playground')}</h3><p className="text-sm text-muted-foreground">Test a transformation with input text and a selected model.</p></div><TransformationPlayground transformations={transformations} selectedTransformation={selectedTransformation} /></div>}
        {props.tool === 'embeddings' && <div className="space-y-5"><div><h3 className="text-xl font-semibold">Embeddings</h3><p className="text-sm text-muted-foreground">Rebuild source, note and insight embeddings.</p></div><RebuildEmbeddings /></div>}
        {props.tool === 'system-info' && <div className="space-y-5"><div><h3 className="text-xl font-semibold">{t('advanced.systemInfo')}</h3><p className="text-sm text-muted-foreground">{t('advanced.desc')}</p></div><SystemInfo /></div>}
        {props.tool === 'notes' && <NotesColumn notes={props.notes} isLoading={props.notesLoading} notebookId={props.notebookId} contextSelections={props.contextSelections.notes} onContextModeChange={props.onNoteContextModeChange} onBulkContextModeChange={props.onBulkNoteContext} />}
        {props.tool === 'sources' && <SourcesColumn sources={props.sources} isLoading={props.sourcesLoading} notebookId={props.notebookId} notebookName={props.notebookName} onRefresh={props.onRefreshSources} contextSelections={props.contextSelections.sources} onContextModeChange={props.onSourceContextModeChange} onBulkContextModeChange={props.onBulkSourceContext} hasNextPage={props.hasNextPage} isFetchingNextPage={props.isFetchingNextPage} fetchNextPage={props.fetchNextPage} />}
        {props.tool === 'notebooks' && <div className="space-y-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold">{t('notebooks.title')}</h3><p className="text-sm text-muted-foreground">{t('notebooks.activeNotebooks')}</p></div><Button onClick={() => setCreateNotebookOpen(true)}>Create notebook</Button></div><input value={notebookSearch} onChange={e => setNotebookSearch(e.target.value)} placeholder={t('notebooks.searchPlaceholder')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /><NotebookList notebooks={activeNotebooks} isLoading={notebooksLoading} title={t('notebooks.activeNotebooks')} emptyTitle={query ? t('common.noMatches') : undefined} emptyDescription={query ? t('common.tryDifferentSearch') : undefined} onAction={() => setCreateNotebookOpen(true)} actionLabel={t('notebooks.newNotebook')} />{(archived?.length ?? 0) > 0 && <NotebookList notebooks={archived} isLoading={false} title={t('notebooks.archivedNotebooks')} collapsible emptyTitle={query ? t('common.noMatches') : undefined} emptyDescription={query ? t('common.tryDifferentSearch') : undefined} />}<CreateNotebookDialog open={createNotebookOpen} onOpenChange={setCreateNotebookOpen} /></div>}
      </div>
    </div>
  )
}
