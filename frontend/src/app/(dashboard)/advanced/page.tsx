'use client'

import { AppShell } from '@/components/layout/AppShell'
import { RebuildEmbeddings } from './components/RebuildEmbeddings'
import { SystemInfo } from './components/SystemInfo'
import { useTranslation } from '@/lib/hooks/use-translation'

export default function AdvancedPage() {
  const { t } = useTranslation()
  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl space-y-7 px-4 py-6 md:px-8 md:py-8">
            <header className="space-y-2 border-b border-border/60 pb-5">
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{t('advanced.title')}</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                {t('advanced.desc')}
              </p>
            </header>

            <section aria-label={t('advanced.systemInfo')} className="space-y-4">
              <SystemInfo />
            </section>
            <section aria-label={t('advanced.rebuildEmbeddings')} className="space-y-4">
              <RebuildEmbeddings />
            </section>
          </div>
      </div>
    </AppShell>
  )
}
