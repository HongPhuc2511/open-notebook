'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mindmapApi, type MindMapOptions } from '@/lib/api/mindmap'

function errorMessage(error: unknown): string {
  const e = error as { response?: { data?: { detail?: string } }; message?: string }
  return e?.response?.data?.detail || e?.message || 'Failed to generate mind map'
}

export function useGenerateMindMap() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ notebookId, ...options }: { notebookId: string } & MindMapOptions) =>
      mindmapApi.generate(notebookId, options),
    onSuccess: () => {
      // Refresh every notes-related list without depending on the exact query keys
      queryClient.invalidateQueries({
        predicate: (q) => JSON.stringify(q.queryKey).toLowerCase().includes('note'),
      })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
