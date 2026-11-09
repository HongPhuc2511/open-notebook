
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { useAuthStore } from '@/lib/stores/auth-store'
import { getConfig } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertCircle,
  Eye,
  EyeOff,
  LockKeyhole,
  BookOpen,
  LoaderCircle,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useTranslation } from '@/lib/hooks/use-translation'

export function LoginForm() {
  const { t, language } = useTranslation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { login, isLoading, error } = useAuth()
  const {
    authRequired,
    checkAuthRequired,
    hasHydrated,
    isAuthenticated,
  } = useAuthStore()

  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [configInfo, setConfigInfo] = useState<{
    apiUrl: string
    version: string
    buildTime: string
  } | null>(null)

  const router = useRouter()

  useEffect(() => {
    getConfig()
      .then((cfg) => {
        setConfigInfo({
          apiUrl: cfg.apiUrl,
          version: cfg.version,
          buildTime: cfg.buildTime,
        })
      })
      .catch((err) => {
        console.error('Failed to load config:', err)
      })
  }, [])

  useEffect(() => {
    if (!hasHydrated) return

    const checkAuth = async () => {
      try {
        const required = await checkAuthRequired()

        if (!required) {
          router.push('/notebooks')
        }
      } catch (error) {
        console.error('Error checking auth requirement:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    if (authRequired !== null) {
      if (!authRequired && isAuthenticated) {
        router.push('/notebooks')
      } else {
        setIsCheckingAuth(false)
      }
    } else {
      void checkAuth()
    }
  }, [
    hasHydrated,
    authRequired,
    checkAuthRequired,
    router,
    isAuthenticated,
  ])

  if (!hasHydrated || isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    )
  }

  if (authRequired === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md overflow-hidden border border-border/70 shadow-xl shadow-black/[0.03]">
          <CardHeader className="items-center space-y-3 px-7 pt-9 text-center sm:px-9">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-7" />
            </div>

            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold tracking-tight">
                {t('common.connectionError')}
              </CardTitle>
              <CardDescription className="leading-relaxed">
                {t('common.unableToConnect')}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-7 pb-8 sm:px-9">
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1 break-words">
                {error || t('auth.connectErrorHint')}
              </div>
            </div>

            {configInfo && (
              <div className="space-y-3 rounded-2xl bg-muted/50 p-4 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">
                  {t('common.diagnosticInfo')}
                </div>

                <div className="space-y-2 font-mono">
                  <div>
                    {t('common.version')}: {configInfo.version}
                  </div>
                  <div>
                    {t('common.built')}:{' '}
                    {new Date(configInfo.buildTime).toLocaleString(
                      language === 'zh-CN'
                        ? 'zh-CN'
                        : language === 'zh-TW'
                          ? 'zh-TW'
                          : 'en-US'
                    )}
                  </div>
                  <div className="break-all">
                    {t('common.apiUrl')}: {configInfo.apiUrl}
                  </div>
                  <div className="break-all">
                    {t('common.frontendUrl')}:{' '}
                    {typeof window !== 'undefined'
                      ? window.location.href
                      : 'N/A'}
                  </div>
                </div>

                <p>{t('common.checkConsoleLogs')}</p>
              </div>
            )}

            <Button
              onClick={() => window.location.reload()}
              className="h-11 w-full"
            >
              {t('common.retryConnection')}
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.trim()) {
      try {
        await login(password)
      } catch (error) {
        console.error('Unhandled error during login:', error)
      }
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-32 -top-32 size-80 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute -bottom-40 -right-32 size-96 rounded-full bg-primary/[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xl shadow-black/[0.04]">
          <CardHeader className="items-center space-y-5 px-7 pb-5 pt-10 text-center sm:px-9">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <BookOpen className="size-8" strokeWidth={1.8} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold tracking-wide text-primary">
                Open Notebook
              </p>

              <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t('auth.loginTitle')}
              </CardTitle>

              <CardDescription className="mx-auto max-w-xs leading-relaxed">
                {t('auth.loginDesc')}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-7 pb-9 sm:px-9">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium"
                >
                  {t('auth.passwordPlaceholder')}
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    aria-invalid={Boolean(error)}
                    className="h-12 rounded-full pl-11 pr-12"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={isLoading}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 break-words">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full text-sm font-semibold shadow-sm"
                disabled={isLoading || !password.trim()}
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    {t('auth.signingIn')}
                  </>
                ) : (
                  t('auth.signIn')
                )}
              </Button>

              {configInfo && (
                <div className="space-y-1 border-t border-border/70 pt-4 text-center text-xs text-muted-foreground">
                  <p>
                    Open Notebook · {t('common.version')}{' '}
                    {configInfo.version}
                  </p>
                  <p className="break-all font-mono text-[10px] opacity-75">
                    {configInfo.apiUrl}
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
