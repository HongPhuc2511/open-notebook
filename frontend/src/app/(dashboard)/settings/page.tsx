'use client'

import { AppShell } from '@/components/layout/AppShell'
import { SettingsForm } from './components/SettingsForm'
import { useSettings } from '@/lib/hooks/use-settings'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { refetch } = useSettings()

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
          <div className="space-y-7">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{t('navigation.settings')}</h1>
              <Button variant="outline" size="icon" onClick={() => refetch()} className="h-10 w-10 rounded-xl" title={t('common.refresh')}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </header>

            <SettingsForm />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
