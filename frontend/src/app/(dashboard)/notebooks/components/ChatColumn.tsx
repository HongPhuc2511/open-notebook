
'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useNotebookChat } from '@/lib/hooks/use-notebook-chat'
import { useNotes } from '@/lib/hooks/use-notes'
import { ChatPanel } from '@/components/sources/ChatPanel'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { ContextSelections } from '../[id]/page'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { SourceListResponse } from '@/lib/types/api'
import type { ReportGenerationRequest } from '@/components/notebooks/ReportCreationDialog'

interface ChatColumnProps {
  notebookId: string
  contextSelections: ContextSelections
  sources: SourceListResponse[]
  sourcesLoading: boolean
  reportRequest?: {
    id: string
    request: ReportGenerationRequest
  } | null
  onReportGenerated?: (result: {
    reportId: string
    request: ReportGenerationRequest
    content: string
    sessionId: string
  }) => void
}

export function ChatColumn({
  notebookId,
  contextSelections,
  sources,
  sourcesLoading,
  reportRequest,
  onReportGenerated,
}: ChatColumnProps) {
  const { t } = useTranslation()

  // Fetch notes for this notebook
  const { data: notes = [], isLoading: notesLoading } = useNotes(notebookId)

  // Initialize notebook chat hook
  const chat = useNotebookChat({
    notebookId,
    sources,
    notes,
    contextSelections,
  })

  // Prevent the same report request from being sent more than once
  const lastReportRequestId = useRef<string | null>(null)

  // Generate report through the existing Notebook Chat
  useEffect(() => {
    if (!reportRequest || sourcesLoading || notesLoading) return

    if (lastReportRequestId.current === reportRequest.id) return

    lastReportRequestId.current = reportRequest.id

    const generateReport = async () => {
      const selectedSourceIds = reportRequest.request.sourceIds

      const selectedSources = selectedSourceIds
        .map((id) => sources.find((source) => source.id === id))
        .filter((source): source is SourceListResponse => Boolean(source))
        .map((source) => source.title || source.id)

      const templateDescriptions: Record<string, string> = {
        research: 'Báo cáo nghiên cứu gồm tóm tắt, phát hiện và phân tích.',
        analytical: 'Báo cáo phân tích chuyên sâu về xu hướng và khuyến nghị.',
        learning: 'Tài liệu học tập gồm kiến thức và nội dung trọng tâm.',
        custom: 'Báo cáo theo yêu cầu tùy chỉnh.',
      }

      // Compact two-line Vietnamese report prompt
      const prompt = [
        `Hãy tạo báo cáo "${reportRequest.request.title}" bằng tiếng Việt, định dạng ${reportRequest.request.format}, theo mẫu: ${templateDescriptions[reportRequest.request.template] ?? templateDescriptions.custom} Dựa trên các nguồn: ${selectedSources.join(', ') || 'Chưa chọn nguồn'}.`,
        `Yêu cầu: ${reportRequest.request.instructions || 'Trình bày chuyên nghiệp, có cấu trúc rõ ràng.'} Chỉ sử dụng thông tin từ tài liệu, phân tích, kết luận và trích dẫn nguồn; không tự tạo dữ liệu.`,
      ].join('\n')

      try {
        // One AI generation, using only the selected sources
        const result = await chat.sendMessage(
          prompt,
          undefined,
          selectedSourceIds
        )

        const content = result?.aiMessage?.content

        if (!content) {
          console.error('Report generation returned no AI content.')
          return
        }

        // Pass the generated content upward for persistence.
        // No second AI generation is performed.
        onReportGenerated?.({
          reportId: reportRequest.id,
          request: reportRequest.request,
          content,
          sessionId: result.sessionId,
        })
      } catch (error) {
        console.error('Report generation failed:', error)
      }
    }

    void generateReport()
  }, [
    reportRequest,
    sources,
    sourcesLoading,
    notesLoading,
    chat.sendMessage,
    onReportGenerated,
  ])

  // Calculate context stats for indicator
  const contextStats = useMemo(() => {
    let sourcesInsights = 0
    let sourcesFull = 0
    let notesCount = 0

    sources.forEach((source) => {
      const mode = contextSelections.sources[source.id]

      if (mode === 'insights') {
        sourcesInsights++
      } else if (mode === 'full') {
        sourcesFull++
      }
    })

    notes.forEach((note) => {
      const mode = contextSelections.notes[note.id]

      if (mode === 'full') {
        notesCount++
      }
    })

    return {
      sourcesInsights,
      sourcesFull,
      notesCount,
      tokenCount: chat.tokenCount,
      charCount: chat.charCount,
    }
  }, [
    sources,
    notes,
    contextSelections,
    chat.tokenCount,
    chat.charCount,
  ])

  // Show loading state while sources/notes are being fetched
  if (sourcesLoading || notesLoading) {
    return (
      <Card className="h-full flex flex-col rounded-2xl bg-popover">
        <CardContent className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  // Show error state if data fetch failed
  if (!sources && !notes) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">{t('chat.unableToLoadChat')}</p>
            <p className="text-xs mt-2">
              {t('common.refreshPage') || 'Please try refreshing the page'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ChatPanel
      title={t('chat.chatWithNotebook')}
      contextType="notebook"
      messages={chat.messages}
      isStreaming={chat.isSending}
      contextIndicators={null}
      onSendMessage={(message, modelOverride) =>
        chat.sendMessage(message, modelOverride)
      }
      modelOverride={
        chat.currentSession?.model_override ??
        chat.pendingModelOverride ??
        undefined
      }
      onModelChange={(model) => chat.setModelOverride(model ?? null)}
      sessions={chat.sessions}
      currentSessionId={chat.currentSessionId}
      onCreateSession={(title) => chat.createSession(title)}
      onSelectSession={chat.switchSession}
      onUpdateSession={(sessionId, title) =>
        chat.updateSession(sessionId, { title })
      }
      onDeleteSession={chat.deleteSession}
      loadingSessions={chat.loadingSessions}
      notebookContextStats={contextStats}
      notebookId={notebookId}
    />
  )
}
