'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { EpisodesTab } from '@/components/podcasts/EpisodesTab'
import { TemplatesTab } from '@/components/podcasts/TemplatesTab'
import { Mic, LayoutTemplate } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useEpisodeProfiles, useSpeakerProfiles } from '@/lib/hooks/use-podcasts'
import { needsModelSetup } from '@/lib/types/podcasts'

export default function PodcastsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'episodes' | 'templates'>('episodes')

  const { episodeProfiles } = useEpisodeProfiles()
  const { speakerProfiles } = useSpeakerProfiles(episodeProfiles)

  const hasUnconfiguredProfiles = useMemo(() => {
    return episodeProfiles.some(needsModelSetup) || speakerProfiles.some(needsModelSetup)
  }, [episodeProfiles, speakerProfiles])

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <div className="space-y-7">
          <header className="space-y-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{t('podcasts.listTitle')}</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t('podcasts.listDesc')}
            </p>
          </header>

          {hasUnconfiguredProfiles ? (
            <Alert className="rounded-2xl border-warn/30 bg-warn-tint px-4 py-3 text-warn shadow-sm md:px-5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('podcasts.setupRequired')}</AlertTitle>
              <AlertDescription>
                {t('podcasts.setupRequiredDesc')}
              </AlertDescription>
            </Alert>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'episodes' | 'templates')}
            className="space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('podcasts.chooseAView')}</p>
              <TabsList aria-label={t('common.accessibility.podcastViews')} className="inline-flex h-auto w-fit max-w-full flex-wrap gap-1 rounded-full bg-muted/70 p-1">
                <TabsTrigger value="episodes" className="gap-2 rounded-full px-5 py-2.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <Mic className="h-4 w-4" />
                  {t('podcasts.episodesTab')}
                </TabsTrigger>
                <TabsTrigger value="templates" className="gap-2 rounded-full px-5 py-2.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <LayoutTemplate className="h-4 w-4" />
                  {t('podcasts.templatesTab')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="episodes" className="mt-5 space-y-6 focus-visible:outline-none">
              <EpisodesTab />
            </TabsContent>

            <TabsContent value="templates" className="mt-5 space-y-6 focus-visible:outline-none">
              <TemplatesTab />
            </TabsContent>
          </Tabs>
        </div>
        </div>
      </div>
    </AppShell>
  )
}
