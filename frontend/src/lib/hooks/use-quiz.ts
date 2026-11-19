'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { quizApi, type QuizOptions } from '@/lib/api/quiz'

function errorMessage(error: unknown): string {
  const e = error as { response?: { data?: { detail?: string } }; message?: string }
  return e?.response?.data?.detail || e?.message || 'Failed to generate quiz'
}

export function useGenerateQuiz() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ notebookId, ...options }: { notebookId: string } & QuizOptions) =>
      quizApi.generate(notebookId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => JSON.stringify(q.queryKey).toLowerCase().includes('note'),
      })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
