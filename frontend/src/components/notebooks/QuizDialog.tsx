'use client'

import { useState } from 'react'
import { ArrowLeft, Check, CheckCircle2, ClipboardList, Info, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'
import { cn } from '@/lib/utils'
import type { QuizData, QuizQuestion } from '@/lib/api/quiz'

interface QuizDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string | null
  quiz: QuizData | null
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const isAnswerCorrect = (question: QuizQuestion, picked: number[]) =>
  picked.length === question.correct.length && question.correct.every((i) => picked.includes(i))

// All quiz state lives here. The dialog content unmounts when it closes,
// so every time the quiz is opened it starts fresh.
function QuizSession({ quiz, onClose }: { quiz: QuizData; onClose: () => void }) {
  const { language } = useTranslation()
  const tr = (vi: string, en: string) => (language?.startsWith('vi') ? vi : en)

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number[]>>({})
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [finished, setFinished] = useState(false)

  const questions = quiz.questions
  const total = questions.length
  const question = questions[index]
  const picked = answers[index] ?? []
  const revealed = !!checked[index]
  const answeredCount = Object.values(checked).filter(Boolean).length
  const score = questions.filter((q, i) => isAnswerCorrect(q, answers[i] ?? [])).length

  const reset = () => {
    setIndex(0)
    setAnswers({})
    setChecked({})
    setFinished(false)
  }

  const selectOption = (optionIndex: number) => {
    if (!question || revealed) return
    if (question.type === 'single') {
      setAnswers((prev) => ({ ...prev, [index]: [optionIndex] }))
      setChecked((prev) => ({ ...prev, [index]: true }))
      return
    }
    setAnswers((prev) => {
      const current = prev[index] ?? []
      const next = current.includes(optionIndex)
        ? current.filter((x) => x !== optionIndex)
        : [...current, optionIndex]
      return { ...prev, [index]: next }
    })
  }

  const checkAnswer = () => setChecked((prev) => ({ ...prev, [index]: true }))

  const goNext = () => {
    if (index + 1 < total) setIndex(index + 1)
    else setFinished(true)
  }

  if (finished) {
    return (
      <div className="space-y-5 py-6 text-center">
        <p className="text-sm text-muted-foreground">{tr('Kết quả của bạn', 'Your score')}</p>
        <p className="text-5xl font-normal">
          {score}/{total}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" className="rounded-full" onClick={onClose}>
            {tr('Đóng', 'Close')}
          </Button>
          <Button variant="tonal" className="rounded-full" onClick={reset}>
            {tr('Làm lại', 'Try again')}
          </Button>
        </div>
      </div>
    )
  }

  if (!question) return null

  const correct = isAnswerCorrect(question, picked)

  return (
    <div className="min-w-0 space-y-4">
      {/* Progress: badge + thin bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
            {index + 1}/{total}
          </span>
          {question.type === 'multiple' && (
            <span className="text-xs text-muted-foreground">
              {tr('Chọn nhiều đáp án', 'Select all that apply')}
            </span>
          )}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-teal transition-all duration-300"
            style={{ width: `${(answeredCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Reserve two lines so short and long questions don't shift the layout */}
      <h3 className="min-h-[3rem] text-base font-medium">{question.question}</h3>

      <div className="space-y-2">
        {question.options.map((option, i) => {
          const isPicked = picked.includes(i)
          const isCorrectOption = question.correct.includes(i)
          return (
            <button
              key={i}
              type="button"
              onClick={() => selectOption(i)}
              disabled={revealed}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                revealed && isCorrectOption && 'border-teal bg-muted',
                revealed && isPicked && !isCorrectOption && 'border-transparent bg-warn-tint',
                !revealed && isPicked && 'border-primary bg-muted',
                !revealed && !isPicked && 'bg-muted/40 hover:bg-muted',
                revealed && !isCorrectOption && !isPicked && 'bg-muted/40 opacity-70'
              )}
            >
              <span className="shrink-0 text-muted-foreground">{LETTERS[i]}.</span>
              <span className="min-w-0 flex-1">{option}</span>
              {revealed && isCorrectOption && <Check className="h-4 w-4 shrink-0 text-teal" />}
              {revealed && isPicked && !isCorrectOption && <X className="h-4 w-4 shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Explanation: its space is always reserved, so answering never moves the dialog */}
      <div
        aria-live="polite"
        className={cn(
          'min-h-[6.5rem] rounded-xl px-4 py-3 text-sm',
          revealed ? (correct ? 'bg-teal-tint' : 'bg-warn-tint') : 'invisible'
        )}
      >
        {revealed && (
          <>
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              {correct ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
              ) : (
                <Info className="h-4 w-4 shrink-0" />
              )}
              {correct ? tr('Chính xác!', 'Correct!') : tr('Chưa đúng', 'Not quite')}
            </p>
            {question.explanation && <p className="text-muted-foreground">{question.explanation}</p>}
          </>
        )}
      </div>

      {/* Footer: both buttons are always present */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="rounded-full"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {tr('Câu trước', 'Previous')}
        </Button>

        {revealed ? (
          <Button variant="tonal" className="rounded-full" onClick={goNext}>
            {index + 1 < total ? tr('Tiếp theo', 'Next') : tr('Xem kết quả', 'See results')}
          </Button>
        ) : question.type === 'multiple' ? (
          <Button variant="tonal" className="rounded-full" disabled={picked.length === 0} onClick={checkAnswer}>
            {tr('Kiểm tra', 'Check')}
          </Button>
        ) : (
          <Button variant="tonal" className="rounded-full" disabled>
            {tr('Tiếp theo', 'Next')}
          </Button>
        )}
      </div>
    </div>
  )
}

export function QuizDialog({ open, onOpenChange, title, quiz }: QuizDialogProps) {
  const { language } = useTranslation()
  const tr = (vi: string, en: string) => (language?.startsWith('vi') ? vi : en)
  const [titleExpanded, setTitleExpanded] = useState(false)
  const fullTitle = title || tr('Bài kiểm tra', 'Quiz')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] gap-4 overflow-y-auto p-6"
        style={{
          width: 'calc(100% - 2rem)',
          maxWidth: '42rem',
          borderRadius: 28,
          // Keep the single grid column from growing with its content
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex min-w-0 items-start gap-2 pr-8 text-xl font-normal">
            <ClipboardList className="mt-1 h-5 w-5 shrink-0 text-teal" />
            {/* Click to show the whole title; hovering also shows it as a tooltip */}
            <span
              title={fullTitle}
              aria-expanded={titleExpanded}
              onClick={() => setTitleExpanded((v) => !v)}
              className={cn('min-w-0 cursor-pointer break-words', !titleExpanded && 'truncate')}
            >
              {fullTitle}
            </span>
          </DialogTitle>
        </DialogHeader>

        {quiz ? <QuizSession quiz={quiz} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}
