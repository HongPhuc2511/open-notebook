import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SourceViewMode = 'tile' | 'list'

interface SourceViewState {
  viewMode: SourceViewMode
  setViewMode: (mode: SourceViewMode) => void
}

export const useSourceViewStore = create<SourceViewState>()(
  persist(
    (set) => ({
      viewMode: 'list',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'source-view-storage',
    }
  )
)