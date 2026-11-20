'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Layers, RotateCw, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { Flashcard, FlashcardsData } from '@/lib/api/flashcards'

interface FlashcardsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string | null
  data: FlashcardsData | null
}

type Mark = 'known' | 'unknown'

// Time to wait for the card to flip back before the next card's text is swapped in,
// so the answer of the next card is never visible mid-flip.
const FLIP_BACK_MS = 220

// All study state lives here. The dialog content unmounts when it closes,
// so every time the deck is opened it starts fresh.
function FlashcardsSession({ cards, onClose }: { cards: Flashcard[]; onClose: () => void }) {
  const { language } = useTranslation()
  const tr = (vi: string, en: string) => (language?.startsWith('vi') ? vi : en)

  const [deck, setDeck] = useState<Flashcard[]>(cards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [marks, setMarks] = useState<Record<number, Mark>>({})
  const [finished, setFinished] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = deck.length
  const card = deck[index]
  const known = Object.values(marks).filter((m) => m === 'known').length
  const unknown = Object.values(marks).filter((m) => m === 'unknown').length

  const go = (next: number) => {
    if (next < 0) return
    if (timer.current) clearTimeout(timer.current)
    const apply = () => {
      if (next >= total) setFinished(true)
      else setIndex(next)
    }
    if (flipped) {
      setFlipped(false)
      timer.current = setTimeout(apply, FLIP_BACK_MS)
    } else {
      apply()
    }
  }

  const mark = (value: Mark) => {
    setMarks((prev) => ({ ...prev, [index]: value }))
    go(index + 1)
  }

  const restart = (nextDeck: Flashcard[]) => {
    if (timer.current) clearTimeout(timer.current)
    setDeck(nextDeck)
    setIndex(0)
    setFlipped(false)
    setMarks({})
    setFinished(false)
  }

  // Keyboard: arrows move between cards, Space/Enter flips the card
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyHandler.current = (e) => {
      if (finished) return
      if (e.key === 'ArrowLeft') go(index - 1)
      else if (e.key === 'ArrowRight') go(index + 1)
      else if ((e.key === ' ' || e.key === 'Enter') && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        setFlipped((f) => !f)
      }
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  if (finished) {
    return (
      <div className="space-y-5 py-6 text-center">
        <p className="text-sm text-muted-foreground">{tr('Số thẻ đã nhớ', 'Cards you know')}</p>
        <p className="text-5xl font-normal">
          {known}/{total}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="ghost" className="rounded-full" onClick={onClose}>
            {tr('Đóng', 'Close')}
          </Button>
          {known < total && (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => restart(deck.filter((_, i) => marks[i] !== 'known'))}
            >
              {tr('Ôn thẻ chưa nhớ', 'Review missed cards')}
            </Button>
          )}
          <Button variant="tonal" className="rounded-full" onClick={() => restart(cards)}>
            {tr('Học lại', 'Study again')}
          </Button>
        </div>
      </div>
    )
  }

  if (!card) return null

  const faceClass =
    'absolute inset-0 flex flex-col justify-between rounded-2xl border px-6 py-5 shadow-sm'

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-teal transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {index + 1}/{total}
        </div>
      </div>

      <div style={{ perspective: 1200 }}>
        <div
          role="button"
          tabIndex={0}
          aria-label={flipped ? tr('Xem câu hỏi', 'See question') : tr('Xem câu trả lời', 'See answer')}
          onClick={() => setFlipped((f) => !f)}
          className="relative h-80 w-full cursor-pointer select-none transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div className={`${faceClass} bg-muted`} style={{ backfaceVisibility: 'hidden' }}>
            <span className="text-xs text-muted-foreground">{tr('Câu hỏi', 'Question')}</span>
            <span className="max-h-48 overflow-y-auto break-words text-center text-xl font-medium leading-relaxed">
              {card.front}
            </span>
            <span className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <RotateCw className="h-3.5 w-3.5" />
              {tr('Xem câu trả lời', 'See answer')}
            </span>
          </div>

          {/* Back */}
          <div
            className={`${faceClass} bg-teal-tint`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-xs text-muted-foreground">{tr('Đáp án', 'Answer')}</span>
            <span className="max-h-48 overflow-y-auto break-words text-center text-lg leading-relaxed">
              {card.back}
            </span>
            <span className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <RotateCw className="h-3.5 w-3.5" />
              {tr('Xem câu hỏi', 'See question')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          disabled={index === 0}
          onClick={() => go(index - 1)}
          aria-label={tr('Thẻ trước', 'Previous card')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="h-11 gap-1.5 rounded-full px-5" onClick={() => mark('unknown')}>
          <X className="h-4 w-4" />
          {unknown}
        </Button>
        <Button variant="outline" className="h-11 gap-1.5 rounded-full px-5 text-teal" onClick={() => mark('known')}>
          {known}
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={() => go(index + 1)}
          aria-label={tr('Thẻ tiếp theo', 'Next card')}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function FlashcardsDialog({ open, onOpenChange, title, data }: FlashcardsDialogProps) {
  const { language } = useTranslation()
  const tr = (vi: string, en: string) => (language?.startsWith('vi') ? vi : en)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] gap-4 overflow-y-auto p-6"
        style={{
          width: 'calc(100% - 2rem)',
          maxWidth: '32rem',
          borderRadius: 28,
          // Without this the single grid column grows with its content and pushes the card past the edge
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex min-w-0 items-center gap-2 pr-8 text-xl font-normal">
            <Layers className="h-5 w-5 shrink-0 text-teal" />
            <span className="min-w-0 truncate">{title || tr('Thẻ ghi nhớ', 'Flashcards')}</span>
          </DialogTitle>
        </DialogHeader>

        {data ? <FlashcardsSession cards={data.cards} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}
