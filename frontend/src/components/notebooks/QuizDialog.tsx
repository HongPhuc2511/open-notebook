'use client'

import { useEffect, useState } from 'react'
import { Check, ClipboardList, X } from 'lucide-react'
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

export function QuizDialog({ open, onOpenChange, title, quiz }: QuizDialogProps) {
  const { language } = useTranslation()
  const tr = (vi: string, en: string) => (language?.startsWith('vi') ? vi : en)

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number[]>>({})
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [finished, setFinished] = useState(false)

  const reset = () => {
    setIndex(0)
    setAnswers({})
    setChecked({})
    setFinished(false)
  }

  useEffect(() => {
    if (open) reset()
  }, [open, quiz])

  const questions = quiz?.questions ?? []
  const total = questions.length
  const question = questions[index]
  const picked = answers[index] ?? []
  const revealed = !!checked[index]
  const score = questions.filter((q, i) => isAnswerCorrect(q, answers[i] ?? [])).length

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-5 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8 text-xl font-normal">
            <ClipboardList className="h-5 w-5 shrink-0 text-teal" />
            <span className="truncate">{title || tr('Bài kiểm tra', 'Quiz')}</span>
          </DialogTitle>
        </DialogHeader>

        {finished ? (
          <div className="space-y-5 py-6 text-center">
            <p className="text-sm text-muted-foreground">{tr('Kết quả của bạn', 'Your score')}</p>
            <p className="text-5xl font-normal">
              {score}/{total}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
                {tr('Đóng', 'Close')}
              </Button>
              <Button variant="tonal" className="rounded-full" onClick={reset}>
                {tr('Làm lại', 'Try again')}
              </Button>
            </div>
          </div>
        ) : question ? (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              {index + 1}/{total}
              {question.type === 'multiple' && ` · ${tr('Chọn nhiều đáp án', 'Select all that apply')}`}
            </div>

            <h3 className="text-base font-medium">{question.question}</h3>

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

            {revealed && question.explanation && (
              <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
                <p className="mb-1 font-medium">
                  {isAnswerCorrect(question, picked)
                    ? tr('Chính xác!', 'Correct!')
                    : tr('Chưa đúng', 'Not quite')}
                </p>
                <p className="text-muted-foreground">{question.explanation}</p>
              </div>
            )}

            <div className="flex items-center justify-end">
              {revealed ? (
                <Button variant="tonal" className="rounded-full" onClick={goNext}>
                  {index + 1 < total ? tr('Tiếp theo', 'Next') : tr('Xem kết quả', 'See results')}
                </Button>
              ) : (
                question.type === 'multiple' && (
                  <Button
                    variant="tonal"
                    className="rounded-full"
                    disabled={picked.length === 0}
                    onClick={checkAnswer}
                  >
                    {tr('Kiểm tra', 'Check')}
                  </Button>
                )
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
