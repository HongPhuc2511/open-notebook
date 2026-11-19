import apiClient from './client'
import type { NoteResponse } from '@/lib/types/api'

export type QuizDifficulty = 'easy' | 'medium' | 'hard'
export type QuizQuestionType = 'single' | 'multiple'

export interface QuizQuestion {
  type: QuizQuestionType
  question: string
  options: string[]
  correct: number[]
  explanation: string
}

export interface QuizData {
  title: string
  questions: QuizQuestion[]
}

export interface QuizOptions {
  sourceIds?: string[]
  language?: string
  topic?: string
  questionCount?: number
  difficulty?: QuizDifficulty
  questionTypes?: QuizQuestionType[]
}

export const quizApi = {
  // Calling the LLM can take a while, so allow a long timeout
  generate: async (notebookId: string, options: QuizOptions = {}) => {
    const { data } = await apiClient.post<NoteResponse>(
      '/notes/quiz',
      {
        notebook_id: notebookId,
        source_ids: options.sourceIds,
        language: options.language,
        topic: options.topic,
        question_count: options.questionCount,
        difficulty: options.difficulty,
        question_types: options.questionTypes,
      },
      { timeout: 180000 }
    )
    return data
  },

  // The notes list omits content, so fetch the full note when opening a quiz
  get: async (noteId: string) => {
    const { data } = await apiClient.get<NoteResponse>('/notes/' + encodeURIComponent(noteId))
    return data
  },
}

export function parseQuiz(content: string | null | undefined): QuizData | null {
  if (!content) return null
  try {
    const data = JSON.parse(content) as Partial<QuizData>
    if (!Array.isArray(data.questions) || data.questions.length === 0) return null
    return { title: data.title ?? '', questions: data.questions }
  } catch {
    return null
  }
}
