'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  X,
  FileText,
  ThumbsUp,
  ThumbsDown,
  List,
  ExternalLink,
  BookOpen,
  Copy,
  Download,
  Share2,
  Check,
  FileDown,
  ChevronDown,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'
import { useNavigation } from '@/lib/hooks/use-navigation'
import type { SourceListResponse } from '@/lib/types/api'

interface ReportViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string | null
  content: string
  notebookId: string
  reportId: string
  sources: SourceListResponse[]
}

interface HeadingItem {
  id: string
  text: string
  level: number
}

interface CitationItem {
  n?: number
  ref?: string
  quote?: string
  url?: string
  sourceId?: string
  sourceTitle?: string
}

function slugify(value: string, index: number) {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `${slug || 'section'}-${index}`
}

function cleanHeading(value: string) {
  return value
    .replace(/[*_`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

function normalizeReportContent(value: string) {
  return value
    .replace(
      /\${1,2}(\s*[+-]?\d[\d.,/:–-]*\s*)\${1,2}/g,
      '$1'
    )
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .trim()
}

function extractCitations(rawContent: string): {
  content: string
  citations: CitationItem[]
} {
  const citations: CitationItem[] = []

  const cleanedContent = rawContent.replace(
    /<citations\b[^>]*>([\s\S]*?)(?:<\/citations\s*>|$)/gi,
    (_match, citationContent: string) => {
      const jsonText = citationContent.trim()

      try {
        const parsed = JSON.parse(jsonText)
        const items = Array.isArray(parsed) ? parsed : [parsed]

        items.forEach((item, index) => {
          if (!item || typeof item !== 'object') return

          const quote = String(item.quote ?? '')
          const urlMatch = quote.match(/https?:\/\/[^\s"'<>]+/i)

          citations.push({
            n: Number(item.n) || index + 1,
            ref: String(item.ref ?? ''),
            quote,
            url: String(item.url ?? urlMatch?.[0] ?? ''),
          })
        })
      } catch {
        const urls = jsonText.match(/https?:\/\/[^\s"'<>]+/gi) ?? []

        urls.forEach((url, index) => {
          citations.push({
            n: index + 1,
            quote: 'Nguồn tham khảo',
            url: url.replace(/[),.;]+$/, ''),
          })
        })
      }

      return '\n\n'
    }
  )

  return {
    content: normalizeReportContent(cleanedContent),
    citations,
  }
}

function getCitationLabel(citation: CitationItem) {
  if (citation.sourceTitle) return citation.sourceTitle

  if (citation.url) {
    try {
      return new URL(citation.url).hostname.replace(/^www\./, '')
    } catch {
      return citation.url
    }
  }

  return citation.quote || `Nguồn ${citation.n ?? ''}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getExportStyles() {
  return `
    body {
      font-family: Arial, "Times New Roman", sans-serif;
      color: #1e293b;
      font-size: 11pt;
      line-height: 1.65;
      margin: 28px 36px;
    }
    h1 { font-size: 22pt; margin: 22px 0 12px; }
    h2 { font-size: 17pt; margin: 22px 0 10px; }
    h3 { font-size: 14pt; margin: 18px 0 8px; }
    p { margin: 0 0 10px; }
    ul, ol { padding-left: 25px; margin: 8px 0 14px; }
    li { margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
    th { background: #f1f5f9; }
    blockquote { border-left: 3px solid #0d9488; padding-left: 14px; color: #475569; }
    a { color: #0f766e; }
    hr { border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0; }
    @page { size: A4; margin: 18mm 17mm; }
    @media print {
      body { margin: 0; }
      h1, h2, h3 { page-break-after: avoid; }
      table, blockquote, img { page-break-inside: avoid; }
    }
  `
}

export function ReportViewerDialog({
  open,
  onOpenChange,
  title,
  content,
  notebookId,
  reportId,
  sources,
}: ReportViewerDialogProps) {
  const router = useRouter()
  const navigation = useNavigation()
  const contentRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const referencesRef = useRef<HTMLElement>(null)

  const [activeHeading, setActiveHeading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)

  const reportTitle = title || 'Untitled report'

  const parsedReport = useMemo(
    () => extractCitations(content || ''),
    [content]
  )

  const citations = useMemo(() => {
    const normalizeId = (value: string) =>
      value.includes(':') ? value.slice(value.indexOf(':') + 1) : value

    return parsedReport.citations.map((citation) => {
      const ref = citation.ref || ''
      const separator = ref.indexOf(':')
      const type = separator >= 0 ? ref.slice(0, separator) : ''
      const rawId = separator >= 0 ? ref.slice(separator + 1) : ref

      if (type !== 'source' || !rawId) return citation

      const source = sources.find(
        (item) => normalizeId(item.id) === normalizeId(rawId)
      )

      return {
        ...citation,
        sourceId: source?.id,
        sourceTitle: source?.title || undefined,
      }
    })
  }, [parsedReport.citations, sources])

  const reportContent = useMemo(
    () =>
      parsedReport.content.replace(/\[(\d+)\]/g, (match, number: string) => {
        const citation = citations.find((item) => item.n === Number(number))
        return citation ? `[${number}](citation:${number})` : match
      }),
    [parsedReport.content, citations]
  )

  const headings = useMemo<HeadingItem[]>(() => {
    const result: HeadingItem[] = []

    reportContent.split('\n').forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/)

      if (!match) return

      result.push({
        id: slugify(cleanHeading(match[2]), result.length),
        text: cleanHeading(match[2]),
        level: match[1].length,
      })
    })

    return result
  }, [reportContent])

  useEffect(() => {
    if (!open) return

    setActiveHeading(headings[0]?.id ?? null)
    setCopied(false)
    setDownloadMenuOpen(false)

    requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0
      }
    })
  }, [open, headings])

  // Theo dõi chương đang hiển thị.
  useEffect(() => {
    if (!open || headings.length === 0) return

    const root = contentRef.current
    if (!root) return

    const elements = headings
      .map((heading) =>
        root.querySelector<HTMLElement>(`#${heading.id}`)
      )
      .filter((element): element is HTMLElement => element !== null)

    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top
          )

        if (visible.length > 0) {
          setActiveHeading(visible[0].target.id)
        }
      },
      {
        root,
        rootMargin: '-10% 0px -75% 0px',
        threshold: 0,
      }
    )

    elements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [open, headings])

  const handleNavigate = (id: string) => {
    const root = contentRef.current
    const target = root?.querySelector<HTMLElement>(`#${id}`)

    if (!root || !target) return

    const rootRect = root.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    root.scrollTo({
      top: root.scrollTop + targetRect.top - rootRect.top - 16,
      behavior: 'smooth',
    })

    setActiveHeading(id)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportContent)
      setCopied(true)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = reportContent
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
      setCopied(true)
    }

    window.setTimeout(() => setCopied(false), 1800)
  }

  // Tạo nội dung HTML dùng chung cho PDF và Word.
  const getExportHtml = () => {
    const articleHtml = articleRef.current?.innerHTML ?? ''

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(reportTitle)}</title>
          <style>${getExportStyles()}</style>
        </head>
        <body>
          <h1>${escapeHtml(reportTitle)}</h1>
          ${articleHtml}
        </body>
      </html>
    `
  }

  // PDF: mở hộp thoại in để người dùng chọn Save as PDF.
  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      alert('Trình duyệt đã chặn cửa sổ xuất PDF. Vui lòng cho phép cửa sổ bật lên.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(getExportHtml())
    printWindow.document.close()

    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
    }

    setDownloadMenuOpen(false)
  }

  // Word: xuất tài liệu HTML tương thích Microsoft Word.
  const handleExportDoc = () => {
    const html = getExportHtml()
    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${reportTitle.replace(/[\\/:*?"<>|]/g, '-').trim() || 'report'}.doc`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setDownloadMenuOpen(false)
  }

  const handleShare = async () => {
    const shareData = {
      title: reportTitle,
      text: `Báo cáo: ${reportTitle}`,
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      }
    } catch {
      // Người dùng đóng hộp thoại chia sẻ.
    }
  }

  const handleOpenCitation = (number: number) => {
    const citation = citations.find((item) => item.n === number)

    if (!citation) return

    if (citation.sourceId) {
      navigation.setReturnTo(
        `/notebooks/${encodeURIComponent(notebookId)}?reportId=${encodeURIComponent(reportId)}`,
        'Quay lại báo cáo'
      )

      onOpenChange(false)

      router.push(`/sources/${encodeURIComponent(citation.sourceId)}`)
      return
    }

    if (citation.url) {
      window.open(citation.url, '_blank', 'noopener,noreferrer')
    }
  }

  const markdownComponents: Components = {
    h1: ({ children }) => {
      const text = String(children)
      const heading = headings.find((item) => item.text === cleanHeading(text))

      return (
        <h1
          id={heading?.id}
          className="mb-3 mt-6 text-[19px] font-bold leading-tight text-slate-900 first:mt-0"
        >
          {children}
        </h1>
      )
    },
    h2: ({ children }) => {
      const text = String(children)
      const heading = headings.find((item) => item.text === cleanHeading(text))

      return (
        <h2
          id={heading?.id}
          className="mb-2 mt-6 border-b border-slate-200 pb-1.5 text-[16px] font-bold leading-snug text-slate-900"
        >
          {children}
        </h2>
      )
    },
    h3: ({ children }) => {
      const text = String(children)
      const heading = headings.find((item) => item.text === cleanHeading(text))

      return (
        <h3
          id={heading?.id}
          className="mb-2 mt-4 text-[13px] font-bold leading-snug text-slate-800"
        >
          {children}
        </h3>
      )
    },
    p: ({ children }) => (
      <p className="mb-3 text-[12px] leading-[1.8] text-slate-700">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 ml-5 list-disc space-y-1.5 text-[12px] leading-[1.75] text-slate-700">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 ml-5 list-decimal space-y-1.5 text-[12px] leading-[1.75] text-slate-700">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    strong: ({ children }) => (
      <strong className="font-semibold text-slate-900">{children}</strong>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-3 border-l-[3px] border-teal-500 bg-teal-50/50 py-2 pl-3 pr-3 text-[12px] italic leading-relaxed text-slate-700">
        {children}
      </blockquote>
    ),
    a: ({ href, children, ...props }) => {
      const citationMatch = href?.match(/^citation:(\d+)$/)

      if (citationMatch) {
        const number = Number(citationMatch[1])

        return (
          <button
            type="button"
            onClick={() => handleOpenCitation(number)}
            className="mx-0.5 inline-flex cursor-pointer items-center rounded bg-teal-50 px-1.5 py-0.5 align-baseline text-[10px] font-semibold text-teal-800 ring-1 ring-inset ring-teal-200 transition-colors hover:bg-teal-100"
            title={`Mở nguồn tham khảo ${number}`}
          >
            {children}
          </button>
        )
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-words text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-900"
          {...props}
        >
          {children}
        </a>
      )
    },
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-left text-[11px]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-slate-100 text-slate-800">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="border-b border-slate-200 px-3 py-2 font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
        {children}
      </td>
    ),
    hr: () => <hr className="my-5 border-slate-200" />,
    code: ({ children }) => (
      <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-rose-700">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="my-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">
        {children}
      </pre>
    ),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[92vh] max-h-[920px] w-[96vw] max-w-[1180px] flex-col gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl [&>button.absolute]:hidden"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">{reportTitle}</DialogTitle>

        {/* Header */}
        <header className="z-20 flex h-[48px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-50">
              <FileText className="h-3.5 w-3.5 text-teal-700" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-slate-800">
                {reportTitle}
              </p>
              <p className="text-[9px] text-slate-400">
                Report Viewer
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              title="Sao chép nội dung"
              className="h-7 gap-1 rounded-full px-2 text-slate-600"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline text-[11px]">
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleShare}
              title="Chia sẻ"
              className="h-7 gap-1 rounded-full px-2 text-slate-600"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px]">Chia sẻ</span>
            </Button>

            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDownloadMenuOpen((value) => !value)}
                title="Tải xuống"
                aria-expanded={downloadMenuOpen}
                className="h-7 gap-1 rounded-full px-2 text-slate-600"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[11px]">Tải xuống</span>
                <ChevronDown className="h-3 w-3" />
              </Button>

              {downloadMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    <FileDown className="h-4 w-4 text-red-600" />
                    Tải xuống PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDoc}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    Tải xuống Word (.doc)
                  </button>
                </div>
              )}
            </div>

            <div className="mx-1 h-4 w-px bg-slate-200" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              title="Đóng"
              className="h-7 w-7 rounded-full p-0 text-slate-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main layout */}
        <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
          {/* Table of contents */}
          <aside className="hidden w-[215px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/40 md:flex">
            <div className="flex h-[42px] shrink-0 items-center gap-2 border-b border-slate-200 px-3.5">
              <List className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[11px] font-semibold text-slate-700">
                Mục lục
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
              {headings.length > 0 ? (
                <nav className="space-y-0.5">
                  {headings.map((heading) => {
                    const isActive = activeHeading === heading.id

                    return (
                      <button
                        key={heading.id}
                        type="button"
                        onClick={() => handleNavigate(heading.id)}
                        aria-current={isActive ? 'location' : undefined}
                        className={`relative flex w-full items-start rounded-md px-2 py-1.5 text-left text-[11px] leading-[1.45] transition-colors ${
                          isActive
                            ? 'bg-teal-50 font-semibold text-teal-800'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        style={{
                          paddingLeft: `${9 + (heading.level - 1) * 11}px`,
                        }}
                      >
                        {isActive && (
                          <span className="absolute bottom-1 left-0 top-1 w-[3px] rounded-full bg-teal-600" />
                        )}

                        <span className="line-clamp-3">
                          {heading.text}
                        </span>
                      </button>
                    )
                  })}
                </nav>
              ) : (
                <p className="px-2 py-2 text-xs text-slate-400">
                  Chưa tìm thấy tiêu đề.
                </p>
              )}
            </div>
          </aside>

          {/* Document */}
          <main
            ref={contentRef}
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth bg-white"
          >
            <article
              ref={articleRef}
              className="mx-auto w-full max-w-[880px] px-5 py-4 sm:px-7 lg:px-8"
            >
              <div className="mb-4 border-b border-slate-200 pb-3">
                <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-teal-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                  AI Generated Report
                </div>

                <h1 className="text-[21px] font-bold leading-tight tracking-tight text-slate-900">
                  {reportTitle}
                </h1>
              </div>

              <div className="report-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {reportContent || '*Chưa có nội dung báo cáo.*'}
                </ReactMarkdown>
              </div>

              {/* References */}
              {citations.length > 0 && (
                <section
                  ref={referencesRef}
                  className="mt-7 scroll-mt-4 border-t border-slate-200 pt-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-teal-700" />
                    <div>
                      <h2 className="text-[13px] font-bold text-slate-900">
                        Tài liệu tham khảo
                      </h2>
                      <p className="text-[10px] text-slate-500">
                        {citations.length} nguồn
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {citations.map((citation, index) => (
                      <div
                        key={`${citation.ref}-${citation.n ?? index}`}
                        className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                            {citation.n ?? index + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="mb-0.5 text-[11px] font-semibold text-slate-800">
                              {getCitationLabel(citation)}
                            </p>

                            {citation.quote && (
                              <p className="mb-1.5 line-clamp-3 text-[11px] leading-4 text-slate-600">
                                {citation.quote
                                  .replace(
                                    /URL Source:\s*https?:\/\/\S+/gi,
                                    ''
                                  )
                                  .trim()}
                              </p>
                            )}

                            {(citation.sourceId || citation.url) && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (citation.sourceId) {
                                    handleOpenCitation(citation.n ?? index + 1)
                                  } else if (citation.url) {
                                    window.open(
                                      citation.url,
                                      '_blank',
                                      'noopener,noreferrer'
                                    )
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-700 hover:text-teal-900"
                              >
                                Mở nguồn
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Feedback */}
              <div className="mt-6 border-t border-slate-200 py-4">
                <p className="mb-2 text-[11px] font-medium text-slate-600">
                  Bạn thấy báo cáo này hữu ích không?
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full border-slate-200 px-2.5 text-[11px] text-slate-600"
                  >
                    <ThumbsUp className="mr-1.5 h-3 w-3" />
                    Hữu ích
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full border-slate-200 px-2.5 text-[11px] text-slate-600"
                  >
                    <ThumbsDown className="mr-1.5 h-3 w-3" />
                    Chưa hữu ích
                  </Button>
                </div>
              </div>
            </article>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}