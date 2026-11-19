'use client'

import { AppTopBar } from './AppTopBar'
import { SetupBanner } from './SetupBanner'

interface AppShellProps {
  children: React.ReactNode
  // Hide the top navigation bar for full-screen pages such as the notebook detail view.
  // (Name kept as "hideSidebar" so existing callers do not need to change.)
  hideSidebar?: boolean
  // Page-specific controls rendered inside the top bar (e.g. search, view toggle)
  topBarActions?: React.ReactNode
  // Replaces the app name and the navigation tabs in the top bar
  topBarTitle?: React.ReactNode
}

export function AppShell({ children, hideSidebar = false, topBarActions, topBarTitle }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {!hideSidebar && <AppTopBar actions={topBarActions} title={topBarTitle} />}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
        <SetupBanner />
        {children}
      </main>
    </div>
  )
}