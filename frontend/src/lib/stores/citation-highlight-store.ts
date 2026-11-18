import { create } from 'zustand'

interface CitationHighlightState {
  quote: string | null
  setQuote: (quote: string | null) => void
  clear: () => void
}

export const useCitationHighlightStore = create<CitationHighlightState>((set) => ({
  quote: null,
  setQuote: (quote) => set({ quote }),
  clear: () => set({ quote: null }),
}))