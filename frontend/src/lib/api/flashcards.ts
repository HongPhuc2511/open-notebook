import apiClient from './client'
import type { NoteResponse } from '@/lib/types/api'

export type FlashcardsDifficulty = 'easy' | 'medium' | 'hard'

export interface Flashcard {
  front: string
  back: string
}

export interface FlashcardsData {
  title: string
  cards: Flashcard[]
}

export interface FlashcardsOptions {
  sourceIds?: string[]
  language?: string
  topic?: string
  cardCount?: number
  difficulty?: FlashcardsDifficulty
}

export const flashcardsApi = {
  // Calling the LLM can take a while, so allow a long timeout
  generate: async (notebookId: string, options: FlashcardsOptions = {}) => {
    const { data } = await apiClient.post<NoteResponse>(
      '/notes/flashcards',
      {
        notebook_id: notebookId,
        source_ids: options.sourceIds,
        language: options.language,
        topic: options.topic,
        card_count: options.cardCount,
        difficulty: options.difficulty,
      },
      { timeout: 180000 }
    )
    return data
  },

  // The notes list omits content, so fetch the full note when opening a deck
  get: async (noteId: string) => {
    const { data } = await apiClient.get<NoteResponse>('/notes/' + encodeURIComponent(noteId))
    return data
  },
}

export function parseFlashcards(content: string | null | undefined): FlashcardsData | null {
  if (!content) return null
  try {
    const data = JSON.parse(content) as Partial<FlashcardsData>
    if (!Array.isArray(data.cards) || data.cards.length === 0) return null
    return { title: data.title ?? '', cards: data.cards }
  } catch {
    return null
  }
}
