'use client'

import { useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Key, ShieldAlert, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useModels, useModelDefaults } from '@/lib/hooks/use-models'
import {
  useCredentials,
  useCredentialStatus,
  useEnvStatus,
} from '@/lib/hooks/use-credentials'
import { useProviders } from '@/lib/hooks/use-providers'
import { Credential } from '@/lib/api/credentials'
import {
  DefaultModelSelectors,
  MigrationBanner,
  ProviderSection,
} from '@/components/settings'

export default function ApiKeysPage() {
  const { t } = useTranslation()

  // Data
  const { data: credentials, isLoading: credentialsLoading } = useCredentials()
  const { data: models, isLoading: modelsLoading } = useModels()
  const { data: defaults, isLoading: defaultsLoading } = useModelDefaults()
  const { data: credentialStatus } = useCredentialStatus()
  const { data: envStatus } = useEnvStatus()
  const {
    data: providers,
    isLoading: providersLoading,
    isError: providersError,
  } = useProviders()

  const encryptionReady = credentialStatus?.encryption_configured ?? true

  // Group credentials by provider
  const credentialsByProvider = useMemo(() => {
    const grouped: Record<string, Credential[]> = {}
    for (const provider of providers ?? []) {
      grouped[provider.name] = []
    }
    if (credentials) {
      for (const cred of credentials) {
        if (!grouped[cred.provider]) grouped[cred.provider] = []
        grouped[cred.provider].push(cred)
      }
    }
    return grouped
  }, [credentials, providers])

  // Providers needing migration
  const providersToMigrate = useMemo(() => {
    if (!envStatus || !credentialStatus) return []
    const result: string[] = []
    for (const provider in envStatus) {
      if (envStatus[provider] && credentialStatus.source[provider] === 'environment') {
        result.push(provider)
      }
    }
    return result
  }, [envStatus, credentialStatus])

  // Sort: configured providers first (the backend registry owns the base order)
  const sortedProviders = useMemo(() => {
    return [...(providers ?? [])].sort((a, b) => {
      const aHas = (credentialsByProvider[a.name]?.length || 0) > 0 ? 1 : 0
      const bHas = (credentialsByProvider[b.name]?.length || 0) > 0 ? 1 : 0
      return bHas - aHas
    })
  }, [providers, credentialsByProvider])

  const isLoading = credentialsLoading || modelsLoading || defaultsLoading || providersLoading

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 md:px-8 md:py-8">
          {/* Header */}
          <header className="flex items-start gap-4 border-b border-border/60 pb-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                {t('apiKeys.title')}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">{t('apiKeys.description')}</p>
            </div>
          </header>

          {/* Encryption warning */}
          {!encryptionReady && (
            <Alert className="border-destructive/30 bg-destructive-tint">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-destructive">{t('apiKeys.encryptionRequired')}</AlertTitle>
              <AlertDescription className="text-destructive">
                <code className="text-xs bg-destructive-tint px-1 py-0.5 rounded">
                  {t('apiKeys.encryptionRequiredDescription')}
                </code>
              </AlertDescription>
            </Alert>
          )}

          {/* Migration banner */}
          {encryptionReady && <MigrationBanner providersToMigrate={providersToMigrate} />}

          {/* Default Model Selectors */}
          {models && defaults && (
            <DefaultModelSelectors models={models} defaults={defaults} />
          )}

          {/* Provider Cards */}
          {providersError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('apiKeys.providersLoadFailed')}</AlertTitle>
              <AlertDescription>{t('apiKeys.providersLoadFailedDescription')}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4" aria-label={t('apiKeys.title')}>
              {sortedProviders.map(provider => (
                <ProviderSection
                  key={provider.name}
                  provider={provider}
                  credentials={credentialsByProvider[provider.name] || []}
                  models={models || []}
                  defaults={defaults || null}
                  allCredentials={credentials || []}
                  encryptionReady={encryptionReady}
                />
              ))}
            </div>
          )}

          {/* Help link */}
          <div className="border-t border-border/60 pt-5">
            <a
              href="https://github.com/lfnovo/open-notebook/blob/main/docs/5-CONFIGURATION/ai-providers.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('apiKeys.learnMore')}
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
