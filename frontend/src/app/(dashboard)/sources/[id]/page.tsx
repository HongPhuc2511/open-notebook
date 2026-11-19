'use client'

import { useRouter, useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useSourceChat } from '@/lib/hooks/use-source-chat'
import { ChatPanel } from '@/components/sources/ChatPanel'
import { useNavigation } from '@/lib/hooks/use-navigation'
import { SourceDetailContent } from '@/components/sources/SourceDetailContent'
import { useCitationHighlightStore } from '@/lib/stores/citation-highlight-store'

const MIN_PCT = 30
const MAX_PCT = 70
const STORAGE_KEY = 'source-page-left-pct'

export default function SourceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sourceId = params?.id ? decodeURIComponent(params.id as string) : ''
  const navigation = useNavigation()
  const chat = useSourceChat(sourceId)
  const setQuote = useCitationHighlightStore((s) => s.setQuote)

  const containerRef = useRef<HTMLDivElement>(null)
  const [leftPct, setLeftPct] = useState(66)
  const [dragging, setDragging] = useState(false)
  const lineRef = useRef<HTMLDivElement>(null)
  const pendingPct = useRef(66)

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY))
      if (saved >= MIN_PCT && saved <= MAX_PCT) setLeftPct(saved)
    } catch {}
  }, [])

  useEffect(() => {
    if (!dragging) return
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    const onMove = (e: PointerEvent) => {
      const pct = Math.min(MAX_PCT, Math.max(MIN_PCT, ((e.clientX - rect.left) / rect.width) * 100))
      pendingPct.current = pct
      if (lineRef.current) lineRef.current.style.left = `${(pct / 100) * rect.width}px`
    }
    const onUp = () => {
      setLeftPct(pendingPct.current)
      setDragging(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [dragging])

  useEffect(() => {
    if (dragging) return
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Math.round(leftPct)))
    } catch {}
  }, [dragging, leftPct])

  const handleBack = useCallback(() => {
    const returnPath = navigation.getReturnPath()
    router.push(returnPath)
    navigation.clearReturnTo()
  }, [navigation, router])

  // Trên trang này nguồn đã nằm bên trái: chỉ cần tô vàng, không mở dialog.
  const handleCitationClick = useCallback(
    (type: string, id: string, quote?: string) => {
      const cleanId = (s: string) => (s.includes(':') ? s : `source:${s}`)
      const isThisSource = type === 'source' && cleanId(id) === cleanId(sourceId)
      if (isThisSource && quote) {
        setQuote(null)
        // đặt lại sau 1 tick để bấm cùng một badge nhiều lần vẫn kích hoạt effect
        window.setTimeout(() => setQuote(quote), 0)
      }
    },
    [setQuote, sourceId]
  )

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <div className="flex items-center px-6 pb-2 pt-3">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {navigation.getReturnLabel()}
        </Button>
      </div>

      <div ref={containerRef} className="relative flex flex-1 overflow-hidden px-6 pb-6">
        <div
          ref={lineRef}
          className="pointer-events-none absolute bottom-0 top-0 z-20 w-0.5 bg-primary"
          style={{ display: dragging ? 'block' : 'none' }}
        />

        <div
          className="min-w-0 overflow-y-auto break-words rounded-2xl bg-popover px-6 py-4"
          style={{ width: `${leftPct}%` }}
        >
          <SourceDetailContent sourceId={sourceId} showChatButton={false} onClose={handleBack} />
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          onPointerDown={(e) => {
            e.preventDefault()
            const rect = containerRef.current?.getBoundingClientRect()
            if (rect && lineRef.current) {
              pendingPct.current = leftPct
              lineRef.current.style.left = `${(leftPct / 100) * rect.width}px`
            }
            setDragging(true)
          }}
          onDoubleClick={() => setLeftPct(66)}
          className="group flex w-4 flex-shrink-0 cursor-col-resize items-center justify-center"
        >
          <div
            className={`h-16 w-1 rounded-full transition-colors ${
              dragging ? 'bg-primary' : 'bg-border group-hover:bg-primary/60'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <ChatPanel
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            contextIndicators={chat.contextIndicators}
            onSendMessage={(message, model) => chat.sendMessage(message, model)}
            modelOverride={chat.currentSession?.model_override}
            onModelChange={(model) => {
              if (chat.currentSessionId) {
                chat.updateSession(chat.currentSessionId, { model_override: model })
              }
            }}
            sessions={chat.sessions}
            currentSessionId={chat.currentSessionId}
            onCreateSession={(title) => chat.createSession({ title })}
            onSelectSession={chat.switchSession}
            onUpdateSession={(sessionId, title) => chat.updateSession(sessionId, { title })}
            onDeleteSession={chat.deleteSession}
            loadingSessions={chat.loadingSessions}
            onCitationClick={handleCitationClick}
          />
        </div>
      </div>
    </div>
  )
}