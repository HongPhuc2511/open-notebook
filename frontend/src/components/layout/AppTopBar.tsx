'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { TFunction } from 'i18next'
import {
  Book,
  Search,
  Mic,
  Bot,
  Shuffle,
  Settings,
  Wrench,
  FileText,
  Plus,
  LogOut,
  Menu,
  User,
  Command,
  Sun,
  Moon,
  Monitor,
  Languages,
  Check,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/lib/stores/theme-store'
import { languages } from '@/lib/locales'
import { isActive as isLanguageActive } from '@/components/common/LanguageToggle'
import { useAuth } from '@/lib/hooks/use-auth'
import { useCreateDialogs } from '@/lib/hooks/use-create-dialogs'
import { useTranslation } from '@/lib/hooks/use-translation'

// Primary destinations, shown as pill tabs (like the tabs on NotebookLM's home)
const getMainTabs = (t: TFunction) => [
  { name: t('navigation.notebooks'), href: '/notebooks', icon: Book },
  { name: t('navigation.sources'), href: '/sources', icon: FileText },
  { name: t('navigation.askAndSearch'), href: '/search', icon: Search },
  { name: t('navigation.podcasts'), href: '/podcasts', icon: Mic },
] as const

// Secondary destinations, tucked into the avatar menu
const getManageItems = (t: TFunction) => [
  { name: t('navigation.models'), href: '/settings/models', icon: Bot },
  { name: t('navigation.transformations'), href: '/transformations', icon: Shuffle },
  { name: t('navigation.settings'), href: '/settings', icon: Settings },
  { name: t('navigation.advanced'), href: '/advanced', icon: Wrench },
] as const

// Same tri-hue mark as the sidebar header
function LogoPebbles() {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden="true">
      <span className="size-[9px] rounded-[3px] bg-fern" />
      <span className="size-[9px] rounded-[3px] bg-gold" />
      <span className="size-[9px] rounded-[3px] bg-teal" />
    </span>
  )
}

interface AppTopBarProps {
  // Optional page-specific controls (e.g. search, view toggle) shown before the create button
  actions?: React.ReactNode
}

export function AppTopBar({ actions }: AppTopBarProps) {
  const { t, language, setLanguage } = useTranslation()
  const { theme, setTheme } = useTheme()
  const themeOptions = [
  { value: 'light', label: t('common.light'), icon: Sun },
  { value: 'dark', label: t('common.dark'), icon: Moon },
  { value: 'system', label: t('common.system'), icon: Monitor },
  ] as const
  const pathname = usePathname()
  const { logout } = useAuth()
  const { openSourceDialog, openNotebookDialog, openPodcastDialog } = useCreateDialogs()
  const tabs = getMainTabs(t)
  const manageItems = getManageItems(t)

  const [createOpen, setCreateOpen] = useState(false)
  const [isMac, setIsMac] = useState(true) // Default to Mac for SSR

  // Detect platform for the keyboard shortcut hint
  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes('mac'))
  }, [])

  const isActive = (href: string) =>
    pathname === href || !!pathname?.startsWith(`${href}/`)

  const handleCreate = (target: 'source' | 'notebook' | 'podcast') => {
    setCreateOpen(false)
    if (target === 'source') openSourceDialog()
    else if (target === 'notebook') openNotebookDialog()
    else openPodcastDialog()
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 bg-background px-3 sm:px-6">
      {/* Small screens: all main tabs collapse into one menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full md:hidden"
            aria-label={t('common.appName')}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {tabs.map((tab) => (
            <DropdownMenuItem key={tab.href} asChild>
              <Link href={tab.href} className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Link
        href="/notebooks"
        className="flex shrink-0 items-center gap-2.5 rounded-full px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogoPebbles />
        <span className="hidden whitespace-nowrap text-xl font-normal tracking-tight sm:inline">
          {t('common.appName')}
        </span>
      </Link>

      {/* Pill tabs, active one is filled */}
      <nav className="ml-4 hidden items-center gap-1 md:flex">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {tab.name}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />
      {actions}

      {/* Global create menu, same targets as the old sidebar button */}
      <DropdownMenu open={createOpen} onOpenChange={setCreateOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="tonal" className="shrink-0 rounded-full">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('common.create')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              handleCreate('source')
            }}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            {t('common.source')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              handleCreate('notebook')
            }}
            className="gap-2"
          >
            <Book className="h-4 w-4" />
            {t('common.notebook')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              handleCreate('podcast')
            }}
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            {t('common.podcast')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Avatar menu: secondary pages, shortcut hint and sign out */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-full bg-muted"
            aria-label={t('navigation.settings')}
          >
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {manageItems.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="gap-2">
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />

        {/* Theme submenu: opens to the side, like Gemini's light/dark row */}
        <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2">
            <Sun className="h-4 w-4" />
            {t('common.theme')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
            {themeOptions.map(({ value, label, icon: Icon }) => (
            <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="gap-2">
                <Icon className="h-4 w-4" />
                {label}
                {theme === value && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            ))}
        </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Language submenu: scrolls when the list is long */}
        <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2">
            <Languages className="h-4 w-4" />
            {t('common.language')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            {languages.map(({ code, label }) => (
            <DropdownMenuItem key={code} onClick={() => setLanguage(code)} className="gap-2">
                {label}
                {isLanguageActive(code, language || 'en-US') && (
                <Check className="ml-auto h-4 w-4" />
                )}
            </DropdownMenuItem>
            ))}
        </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
          <div className="flex items-center justify-between px-2 py-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Command className="h-3 w-3" />
              {t('common.quickActions')}
            </span>
            <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px]">
              {isMac ? '⌘' : 'Ctrl+'}K
            </kbd>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            {t('common.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}