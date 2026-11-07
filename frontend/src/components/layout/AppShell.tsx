'use client'

import { AppSidebar } from './AppSidebar'
import { SetupBanner } from './SetupBanner'

interface AppShellProps {
  children: React.ReactNode
  // Hide the sidebar for full-screen pages such as the notebook detail view
  hideSidebar?: boolean
}

export function AppShell({ children, hideSidebar = false }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {!hideSidebar && <AppSidebar />}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <SetupBanner />
        {children}
      </main>
    </div>
  )
}