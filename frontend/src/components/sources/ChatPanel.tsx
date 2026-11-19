'use client'

import { memo,useMemo, useCallback, useState, useRef, useEffect, useId } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Bot, User, Send, Loader2, FileText, Lightbulb, StickyNote, History } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import {
  SourceChatMessage,
  SourceChatContextIndicator,
  BaseChatSession
} from '@/lib/types/api'
import { ModelSelector } from './ModelSelector'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SessionManager } from '@/components/sources/SessionManager'
import { MessageActions } from '@/components/sources/MessageActions'
import { convertReferencesToCompactMarkdown, createCompactReferenceLinkComponent } from '@/lib/utils/source-references'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/hooks/use-translation'
import { extractCitations, linkifyCitations } from '@/lib/utils/citations'
import { createCitationLinkComponent } from '@/components/sources/CitationLink'
import { useCitationHighlightStore } from '@/lib/stores/citation-highlight-store'

interface NotebookContextStats {
  sourcesInsights: number
  sourcesFull: number
  notesCount: number
  tokenCount?: number
  charCount?: number
}

interface ChatPanelProps {
  messages: SourceChatMessage[]
  isStreaming: boolean
  contextIndicators: SourceChatContextIndicator | null
  onSendMessage: (message: string, modelOverride?: string) => void
  modelOverride?: string
  onModelChange?: (model?: string) => void
  // Session management props
  sessions?: BaseChatSession[]
  currentSessionId?: string | null
  onCreateSession?: (title: string) => void
  onSelectSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onUpdateSession?: (sessionId: string, title: string) => void
  loadingSessions?: boolean
  // Generic props for reusability
  title?: string
  contextType?: 'source' | 'notebook'
  // Notebook context stats (for notebook chat)
  notebookContextStats?: NotebookContextStats
  // Notebook ID for saving notes
  notebookId?: string
  onCitationClick?: (type: string, id: string, quote?: string) => void
}

export function ChatPanel({
  messages,
  isStreaming,
  contextIndicators,
  onSendMessage,
  modelOverride,
  onModelChange,
  sessions = [],
  currentSessionId,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  onUpdateSession,
  loadingSessions = false,
  contextType = 'source',
  notebookContextStats,
  notebookId,
  onCitationClick
}: ChatPanelProps) {
  const { t } = useTranslation()
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { openModal } = useModalManager()

  // Stable reference-click handler so memoized messages don't re-render on
  // composer keystrokes (which no longer re-render this component at all, since
  // the input state lives in the ChatComposer child).
    const handleReferenceClick = useCallback((type: string, id: string, quote?: string) => {
    if (onCitationClick) {
      onCitationClick(type, id, quote)
      return
    }
    const modalType = type === 'source_insight' ? 'insight' : type as 'source' | 'note' | 'insight'

    try {
      if (quote && type === 'source') {
        useCitationHighlightStore.getState().setQuote(quote)
      }
      openModal(modalType, id)
    } catch {
      toast.error(t('common.noResults'))
    }
  }, [openModal, onCitationClick, t])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  const hasSessions = Boolean(onSelectSession && onCreateSession && onDeleteSession)

  // Nút lịch sử Sessions nằm ngay trong thanh nhập liệu
  const sessionsControl = hasSessions ? (
    <Dialog open={sessionManagerOpen} onOpenChange={setSessionManagerOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full bg-background/60 text-muted-foreground backdrop-blur hover:bg-muted"
        onClick={() => setSessionManagerOpen(true)}
        disabled={loadingSessions}
        title={t('chat.sessions')}
        aria-label={t('chat.sessions')}
      >
        <History className="h-4 w-4" />
      </Button>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        <DialogTitle className="sr-only">{t('chat.sessionsTitle')}</DialogTitle>
        <SessionManager
          sessions={sessions}
          currentSessionId={currentSessionId ?? null}
          onCreateSession={(title) => onCreateSession?.(title)}
          onSelectSession={(sessionId) => {
            onSelectSession?.(sessionId)
            setSessionManagerOpen(false)
          }}
          onUpdateSession={(sessionId, title) => onUpdateSession?.(sessionId, title)}
          onDeleteSession={(sessionId) => onDeleteSession?.(sessionId)}
          loadingSessions={loadingSessions}
        />
      </DialogContent>
    </Dialog>
  ) : null

  // Số nguồn/ghi chú gọn trong pill, token/ký tự nằm trong tooltip
  const contextChip = notebookContextStats ? <ContextChip stats={notebookContextStats} /> : null

  return (
    <>
    <Card className="relative flex flex-col h-full flex-1 overflow-hidden rounded-2xl bg-popover">
      {sessionsControl && (
        <div className="absolute right-3 top-2 z-10">{sessionsControl}</div>
      )}
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <ScrollArea className="flex-1 min-h-0 px-3" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4 pt-10">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  {t('chat.startConversation', { type: contextType === 'source' ? t('navigation.sources') : t('common.notebook') })}
                </p>
                <p className="text-xs mt-2">{t('chat.askQuestions')}</p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  notebookId={notebookId}
                  onReferenceClick={handleReferenceClick}
                />
              ))
            )}
            {isStreaming && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-teal-tint flex items-center justify-center">
                    <Bot className="h-4 w-4 text-teal" />
                  </div>
                </div>
                <div className="rounded-lg px-4 py-2 bg-card border">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Context Indicators */}
        {contextIndicators && (
          <div className="border-t px-4 py-2">
            <div className="flex flex-wrap gap-2 text-xs">
              {contextIndicators.sources?.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {contextIndicators.sources.length} {t('navigation.sources')}
                </Badge>
              )}
              {contextIndicators.insights?.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Lightbulb className="h-3 w-3" />
                  {contextIndicators.insights.length} {contextIndicators.insights.length === 1 ? t('common.insight') : t('common.insights')}
                </Badge>
              )}
              {contextIndicators.notes?.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <StickyNote className="h-3 w-3" />
                  {contextIndicators.notes.length} {contextIndicators.notes.length === 1 ? t('common.note') : t('common.notes')}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Input Area */}
        <ChatComposer
          contextChip={contextChip}
          onSendMessage={onSendMessage}
          isStreaming={isStreaming}
          modelOverride={modelOverride}
          onModelChange={onModelChange}
        />
        <p className="order-3 px-4 pb-1 pt-0.5 text-center text-[11px] text-muted-foreground">
            {t('chat.aiDisclaimer')}
        </p>
      </CardContent>
    </Card>

    </>
  )
}

// Composer owns the input state so keystrokes (including IME composition) only
// re-render this small component instead of the whole message history.
interface ChatComposerProps {
  contextChip?: React.ReactNode
  onSendMessage: (message: string, modelOverride?: string) => void
  isStreaming: boolean
  modelOverride?: string
  onModelChange?: (model?: string) => void
}

function ChatComposer({
  contextChip,
  onSendMessage,
  isStreaming,
  modelOverride,
  onModelChange
}: ChatComposerProps) {
  const { t } = useTranslation()
  const chatInputId = useId()
  const [input, setInput] = useState('')
  const [multiline, setMultiline] = useState(false)

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      onSendMessage(input.trim(), modelOverride)
      setInput('')
      setMultiline(false)
    }
  }

  // Enter gửi, Shift+Enter xuống dòng (Ctrl/Cmd+Enter vẫn gửi được)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    // Đang gõ bằng IME (tiếng Việt, Nhật, Trung...) thì Enter chỉ để chốt chữ
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.shiftKey) return
    e.preventDefault()
    handleSend()
  }

  return (
    <div className="order-2 flex-shrink-0 px-3 pb-1 pt-2">
      {/* Một pill duy nhất: [model] [ô nhập] [số nguồn] [gửi] */}
      <div
        className={
          'flex min-h-12 min-w-0 gap-1 border bg-background py-1.5 pr-1.5 shadow-sm focus-within:border-primary/50 ' +
          (onModelChange ? 'pl-1.5 ' : 'pl-4 ') +
          (multiline ? 'items-end rounded-3xl' : 'items-center rounded-full')
        }
      >
        {onModelChange && (
          <div className="shrink-0">
            <ModelSelector
              currentModel={modelOverride}
              onModelChange={onModelChange}
              disabled={isStreaming}
            />
          </div>
        )}
        <Textarea
          id={chatInputId}
          name="chat-message"
          autoComplete="off"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setMultiline(e.target.scrollHeight > 48)
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.sendPlaceholder')}
          title={t('chat.pressToSend', { key: 'Enter' })}
          disabled={isStreaming}
          className="min-h-9 max-h-[120px] min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
          rows={1}
        />
        {contextChip && <div className="flex h-9 shrink-0 items-center">{contextChip}</div>}
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

// Single chat message row. Memoized so historical messages don't re-render when
// unrelated state (e.g. the composer input) changes.
interface ChatMessageProps {
  message: SourceChatMessage
  notebookId?: string
  onReferenceClick: (type: string, id: string) => void
}

const ChatMessage = memo(function ChatMessage({
  message,
  notebookId,
  onReferenceClick
}: ChatMessageProps) {
  return (
    <div
      className={`flex gap-3 ${
        message.type === 'human' ? 'justify-end' : 'justify-start'
      }`}
    >
      {message.type === 'ai' && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-teal-tint flex items-center justify-center">
            <Bot className="h-4 w-4 text-teal" />
          </div>
        </div>
      )}
      <div
        className={`flex min-w-0 flex-col gap-2 ${
          message.type === 'human' ? 'max-w-[80%]' : 'flex-1'
        }`}
      >
        <div
          className={`rounded-2xl py-2 ${message.type === 'human' ? 'px-4' : 'px-1'} ${
              message.type === 'human'
                ? 'bg-muted'
                : 'bg-transparent'
            }`}
        >
          {message.type === 'ai' ? (
            <AIMessageContent
              content={message.content}
              onReferenceClick={onReferenceClick}
            />
          ) : (
            <p className="text-sm break-all">{message.content}</p>
          )}
        </div>
        {message.type === 'ai' && (
          <MessageActions
            content={message.content}
            notebookId={notebookId}
          />
        )}
      </div>
      {message.type === 'human' && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-muted border flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  )
})

// Helper component to render AI messages with clickable references
function AIMessageContent({
  content,
  onReferenceClick
}: {
  content: string
  onReferenceClick: (type: string, id: string, quote?: string) => void
}) {
  const { t } = useTranslation()
  const setQuote = useCitationHighlightStore((s) => s.setQuote)

  const { text, citations } = useMemo(() => extractCitations(content), [content])

  const markdown = useMemo(
    () =>
      citations.length > 0
        ? linkifyCitations(text, citations)
        : convertReferencesToCompactMarkdown(text, t('common.references')),
    [text, citations, t]
  )

  // useMemo để component không bị tạo lại mỗi lần render, nếu không popover đang mở sẽ tự đóng khi stream.
  const LinkComponent = useMemo(() => {
    const fallback = createCompactReferenceLinkComponent(
      (type, id) => onReferenceClick(type, id)
    )
    return createCitationLinkComponent(
      citations,
      (c) => onReferenceClick(c.type, c.id, c.quote),
      fallback
    )
  }, [citations, onReferenceClick])

  return (
    <MarkdownRenderer components={{ a: LinkComponent }}>
      {markdown}
    </MarkdownRenderer>
  )
}

function formatCompact(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

// Nhãn gọn "6 nguồn" cạnh nút gửi, chi tiết nằm trong tooltip
function ContextChip({ stats }: { stats: NotebookContextStats }) {
  const { t } = useTranslation()
  const total = stats.sourcesInsights + stats.sourcesFull + stats.notesCount
  const tokens = stats.tokenCount ?? 0
  const chars = stats.charCount ?? 0

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default whitespace-nowrap px-1 text-xs text-muted-foreground/70">
          {total} {t('navigation.sources').toLowerCase()}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        {total > 0 ? (
          <div className="space-y-0.5 text-xs">
            {stats.sourcesInsights > 0 && (
              <p>Insights for {stats.sourcesInsights} source{stats.sourcesInsights !== 1 ? 's' : ''}</p>
            )}
            {stats.sourcesFull > 0 && (
              <p>{stats.sourcesFull} full source{stats.sourcesFull !== 1 ? 's' : ''}</p>
            )}
            {stats.notesCount > 0 && (
              <p>{stats.notesCount} full note{stats.notesCount !== 1 ? 's' : ''}</p>
            )}
            {(tokens > 0 || chars > 0) && (
              <p>
                {tokens > 0 ? formatCompact(tokens) + ' tokens' : ''}
                {tokens > 0 && chars > 0 ? ' / ' : ''}
                {chars > 0 ? formatCompact(chars) + ' chars' : ''}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs">No sources or notes included in context. Tick a source to include it.</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
