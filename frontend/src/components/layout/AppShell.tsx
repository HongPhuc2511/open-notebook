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
}

export function AppShell({ children, hideSidebar = false, topBarActions }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {!hideSidebar && <AppTopBar actions={topBarActions} />}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <SetupBanner />
        {children}
      </main>
    </div>
  )
}