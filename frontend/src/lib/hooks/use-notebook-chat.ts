
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/utils/error-handler'
import { useTranslation } from '@/lib/hooks/use-translation'
import { chatApi } from '@/lib/api/chat'
import { QUERY_KEYS } from '@/lib/api/query-client'
import {
  NotebookChatMessage,
  CreateNotebookChatSessionRequest,
  UpdateNotebookChatSessionRequest,
  SourceListResponse,
  NoteResponse
} from '@/lib/types/api'
import { ContextSelections } from '@/app/(dashboard)/notebooks/[id]/page'

interface UseNotebookChatParams {
  notebookId: string
  sources: SourceListResponse[]
  notes: NoteResponse[]
  contextSelections: ContextSelections
}

export function useNotebookChat({
  notebookId,
  sources,
  notes,
  contextSelections
}: UseNotebookChatParams) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<NotebookChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [tokenCount, setTokenCount] = useState<number>(0)
  const [charCount, setCharCount] = useState<number>(0)

  // Pending model override for when a session does not exist yet
  const [pendingModelOverride, setPendingModelOverride] = useState<string | null>(null)

  // Fetch sessions for this notebook
  const {
    data: sessions = [],
    isLoading: loadingSessions,
    refetch: refetchSessions
  } = useQuery({
    queryKey: QUERY_KEYS.notebookChatSessions(notebookId),
    queryFn: () => chatApi.listSessions(notebookId),
    enabled: !!notebookId
  })

  // Fetch current session with messages
  const {
    data: currentSession,
    refetch: refetchCurrentSession
  } = useQuery({
    queryKey: QUERY_KEYS.notebookChatSession(currentSessionId!),
    queryFn: () => chatApi.getSession(currentSessionId!),
    enabled: !!notebookId && !!currentSessionId
  })

  // Update messages when current session changes
  useEffect(() => {
    if (currentSession?.messages) {
      setMessages(currentSession.messages)
    }
  }, [currentSession])

  // Auto-select most recent session when sessions are loaded
  useEffect(() => {
    if (sessions.length > 0 && !currentSessionId) {
      const mostRecentSession = sessions[0]
      setCurrentSessionId(mostRecentSession.id)
    }
  }, [sessions, currentSessionId])

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (data: CreateNotebookChatSessionRequest) =>
      chatApi.createSession(data),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notebookChatSessions(notebookId)
      })
      setCurrentSessionId(newSession.id)
      toast.success(t('chat.sessionCreated'))
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { data?: { detail?: string } }
        message?: string
      }
      toast.error(
        getApiErrorMessage(
          error.response?.data?.detail || error.message,
          (key) => t(key),
          'apiErrors.failedToCreateSession'
        )
      )
    }
  })

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: ({ sessionId, data }: {
      sessionId: string
      data: UpdateNotebookChatSessionRequest
    }) => chatApi.updateSession(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notebookChatSessions(notebookId)
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notebookChatSession(currentSessionId!)
      })
      toast.success(t('chat.sessionUpdated'))
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { data?: { detail?: string } }
        message?: string
      }
      toast.error(
        getApiErrorMessage(
          error.response?.data?.detail || error.message,
          (key) => t(key),
          'apiErrors.failedToUpdateSession'
        )
      )
    }
  })

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      chatApi.deleteSession(sessionId),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notebookChatSessions(notebookId)
      })

      if (currentSessionId === deletedId) {
        setCurrentSessionId(null)
        setMessages([])
      }

      toast.success(t('chat.sessionDeleted'))
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { data?: { detail?: string } }
        message?: string
      }
      toast.error(
        getApiErrorMessage(
          error.response?.data?.detail || error.message,
          (key) => t(key),
          'apiErrors.failedToDeleteSession'
        )
      )
    }
  })

  // Build context.
  // When selectedSourceIds is provided, only those sources are included.
  // Without it, normal notebook context selections are preserved.
  const buildContext = useCallback(async (selectedSourceIds?: string[]) => {
    const context_config: {
      sources: Record<string, string>
      notes: Record<string, string>
    } = {
      sources: {},
      notes: {}
    }

    // Map source selections
    sources.forEach(source => {
      if (selectedSourceIds !== undefined) {
        context_config.sources[source.id] =
          selectedSourceIds.includes(source.id)
            ? 'full content'
            : 'not in'

        return
      }

      const mode = contextSelections.sources[source.id]

      if (mode === 'insights') {
        context_config.sources[source.id] = 'insights'
      } else if (mode === 'full') {
        context_config.sources[source.id] = 'full content'
      } else {
        context_config.sources[source.id] = 'not in'
      }
    })

    // Map note selections
    notes.forEach(note => {
      if (selectedSourceIds !== undefined) {
        context_config.notes[note.id] = 'not in'
        return
      }

      const mode = contextSelections.notes[note.id]

      if (mode === 'full') {
        context_config.notes[note.id] = 'full content'
      } else {
        context_config.notes[note.id] = 'not in'
      }
    })

    // Build context with actual content
    const response = await chatApi.buildContext({
      notebook_id: notebookId,
      context_config
    })

    setTokenCount(response.token_count)
    setCharCount(response.char_count)

    return response.context
  }, [notebookId, sources, notes, contextSelections])

  // Send message (synchronous, no streaming).
  // Optional selectedSourceIds is used by Report generation only.
  const sendMessage = useCallback(async (
    message: string,
    modelOverride?: string,
    selectedSourceIds?: string[]
  ) => {
    let sessionId = currentSessionId

    // Auto-create session if none exists
    if (!sessionId) {
      try {
        const defaultTitle = message.length > 30
          ? `${message.substring(0, 30)}...`
          : message

        const newSession = await chatApi.createSession({
          notebook_id: notebookId,
          title: defaultTitle,
          model_override: pendingModelOverride ?? undefined
        })

        sessionId = newSession.id
        setCurrentSessionId(sessionId)
        setPendingModelOverride(null)

        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.notebookChatSessions(notebookId)
        })
      } catch (err: unknown) {
        const error = err as {
          response?: { data?: { detail?: string } }
          message?: string
        }

        toast.error(
          getApiErrorMessage(
            error.response?.data?.detail || error.message,
            (key) => t(key),
            'apiErrors.failedToCreateSession'
          )
        )

        return undefined
      }
    }

    if (!sessionId) {
      return undefined
    }

    // Add user message optimistically
    const userMessage: NotebookChatMessage = {
      id: `temp-${Date.now()}`,
      type: 'human',
      content: message,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setIsSending(true)

    try {
      // Use selected sources for Report, otherwise normal notebook context
      const context = await buildContext(selectedSourceIds)

      const response = await chatApi.sendMessage({
        session_id: sessionId,
        message,
        context,
        model_override: modelOverride ?? (
          currentSession?.model_override ?? undefined
        )
      })

      // Update chat messages
      setMessages(response.messages)

      // Get the AI response from this exact generation
      const aiMessage = [...response.messages]
        .reverse()
        .find(msg => msg.type === 'ai')

      // Refresh current session
      await refetchCurrentSession()

      // Return the generated content for Report persistence
      return {
        sessionId,
        messages: response.messages,
        aiMessage
      }
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { detail?: string } }
        message?: string
      }

      console.error('Error sending message:', error)

      toast.error(
        getApiErrorMessage(
          error.response?.data?.detail || error.message,
          (key) => t(key),
          'apiErrors.failedToSendMessage'
        )
      )

      // Remove optimistic message on error
      setMessages(prev =>
        prev.filter(msg => !msg.id.startsWith('temp-'))
      )

      return undefined
    } finally {
      setIsSending(false)
    }
  }, [
    notebookId,
    currentSessionId,
    currentSession,
    pendingModelOverride,
    buildContext,
    refetchCurrentSession,
    queryClient,
    t
  ])

  // Switch session
  const switchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
  }, [])

  // Create session
  const createSession = useCallback((title?: string) => {
    return createSessionMutation.mutate({
      notebook_id: notebookId,
      title
    })
  }, [createSessionMutation, notebookId])

  // Update session
  const updateSession = useCallback((
    sessionId: string,
    data: UpdateNotebookChatSessionRequest
  ) => {
    return updateSessionMutation.mutate({
      sessionId,
      data
    })
  }, [updateSessionMutation])

  // Delete session
  const deleteSession = useCallback((sessionId: string) => {
    return deleteSessionMutation.mutate(sessionId)
  }, [deleteSessionMutation])

  // Set model override
  const setModelOverride = useCallback((model: string | null) => {
    if (currentSessionId) {
      updateSessionMutation.mutate({
        sessionId: currentSessionId,
        data: { model_override: model }
      })
    } else {
      setPendingModelOverride(model)
    }
  }, [currentSessionId, updateSessionMutation])

  // Update token/char counts when context selections change
  useEffect(() => {
    const updateContextCounts = async () => {
      try {
        await buildContext()
      } catch (error) {
        console.error('Error updating context counts:', error)
      }
    }

    updateContextCounts()
  }, [buildContext])

  return {
    // State
    sessions,
    currentSession: currentSession || sessions.find(s => s.id === currentSessionId),
    currentSessionId,
    messages,
    isSending,
    loadingSessions,
    tokenCount,
    charCount,
    pendingModelOverride,

    // Actions
    createSession,
    updateSession,
    deleteSession,
    switchSession,
    sendMessage,
    setModelOverride,
    refetchSessions
  }
}
