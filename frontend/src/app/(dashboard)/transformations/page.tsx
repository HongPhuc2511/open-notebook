'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DefaultPromptEditor } from './components/DefaultPromptEditor'
import { TransformationsList } from './components/TransformationsList'
import { TransformationPlayground } from './components/TransformationPlayground'
import { useTransformations } from '@/lib/hooks/use-transformations'
import { Transformation } from '@/lib/types/transformations'
import { Wand2, Play, RefreshCw } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'

export default function TransformationsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('transformations')
  const [selectedTransformation, setSelectedTransformation] = useState<Transformation | undefined>()
  const { data: transformations, isLoading, refetch } = useTransformations()

  const handlePlayground = (transformation: Transformation) => {
    setSelectedTransformation(transformation)
    setActiveTab('playground')
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 md:px-8 md:py-8">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{t('transformations.title')}</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                {t('transformations.desc')}
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} className="h-10 w-10 shrink-0 rounded-xl" title={t('common.refresh')}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-7">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('transformations.workspace')}</p>
            <TabsList aria-label={t('common.accessibility.transformationViews')} className="grid h-auto w-full max-w-xl grid-cols-2 rounded-xl p-1">
              <TabsTrigger value="transformations" className="flex min-h-10 items-center justify-center gap-2 rounded-lg">
                <Wand2 className="h-4 w-4" />
                {t('transformations.title')}
              </TabsTrigger>
              <TabsTrigger value="playground" className="flex min-h-10 items-center justify-center gap-2 rounded-lg">
                <Play className="h-4 w-4" />
                {t('transformations.playground')}
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="transformations" className="space-y-6 pt-1">
            <DefaultPromptEditor />
            <TransformationsList 
              transformations={transformations} 
              isLoading={isLoading}
              onPlayground={handlePlayground}
            />
          </TabsContent>
          
          <TabsContent value="playground" className="pt-1">
            <TransformationPlayground 
              transformations={transformations}
              selectedTransformation={selectedTransformation}
            />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AppShell>
  )
}
