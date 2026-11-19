import apiClient from './client'
import type { NoteResponse } from '@/lib/types/api'

export interface MindMapOptions {
  sourceIds?: string[]
  language?: string
  topic?: string
}

export const mindmapApi = {
  // Calling the LLM can take a while, so allow a long timeout
  generate: async (notebookId: string, options: MindMapOptions = {}) => {
    const { data } = await apiClient.post<NoteResponse>(
      '/notes/mindmap',
      {
        notebook_id: notebookId,
        source_ids: options.sourceIds,
        language: options.language,
        topic: options.topic,
      },
      { timeout: 180000 }
    )
    return data
  },

  // The notes list omits content, so fetch the full note when opening a mind map
  get: async (noteId: string) => {
    const { data } = await apiClient.get<NoteResponse>('/notes/' + encodeURIComponent(noteId))
    return data
  },
}
