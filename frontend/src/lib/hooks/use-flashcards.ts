'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { flashcardsApi, type FlashcardsOptions } from '@/lib/api/flashcards'

function errorMessage(error: unknown): string {
  const e = error as { response?: { data?: { detail?: string } }; message?: string }
  return e?.response?.data?.detail || e?.message || 'Failed to generate flashcards'
}

export function useGenerateFlashcards() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ notebookId, ...options }: { notebookId: string } & FlashcardsOptions) =>
      flashcardsApi.generate(notebookId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => JSON.stringify(q.queryKey).toLowerCase().includes('note'),
      })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
