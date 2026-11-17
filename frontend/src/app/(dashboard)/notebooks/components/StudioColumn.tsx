'use client'

import { useState } from 'react'
import {
  AudioLines,
  WandSparkles,
  FileText,
  BookOpen,
  Table2,
  Network,
  Lightbulb,
  StickyNote,
  BrainCircuit,
  ChartNoAxesCombined,
  Presentation,
  GraduationCap,
  MonitorPlay,
  Layers3,
} from 'lucide-react'
import type { WorkspaceTool } from './WorkspaceToolPanel'

type StudioTab = 'create' | 'analyze' | 'learn' | 'present'

interface StudioColumnProps {
  onOpenTool: (tool: WorkspaceTool) => void
}

const tabs: { id: StudioTab; label: string; icon: typeof WandSparkles }[] = [
  { id: 'create', label: 'Create', icon: WandSparkles },
  { id: 'analyze', label: 'Analyze', icon: ChartNoAxesCombined },
  { id: 'learn', label: 'Learn', icon: Lightbulb },
  { id: 'present', label: 'Present', icon: Presentation },
]

const tones = {
  violet: 'bg-violet-100 text-violet-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  rose: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  cyan: 'bg-cyan-100 text-cyan-700',
}

function ToolCard({
  title,
  description,
  icon: Icon,
  tone,
  onClick,
  disabled = false,
}: {
  title: string
  description: string
  icon: typeof WandSparkles
  tone: keyof typeof tones
  onClick?: () => void
  disabled?: boolean
}) {
  const content = (
    <>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon className="size-[19px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold leading-5 text-slate-900">{title}</span>
        <span className="block truncate text-[10px] leading-4 text-slate-500">{description}</span>
      </span>
      {disabled && <span className="text-slate-300">›</span>}
    </>
  )

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      title={disabled ? `${title} — not integrated yet` : title}
      className={`flex min-h-[72px] min-w-0 items-center gap-2.5 rounded-[22px] border border-slate-200/80 bg-white px-2.5 py-2 text-left shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-colors ${
        disabled
          ? 'cursor-not-allowed opacity-65'
          : 'hover:border-blue-200 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400'
      }`}
    >
      {content}
    </button>
  )
}

function ToolRow({
  title,
  description,
  icon: Icon,
  tone,
}: {
  title: string
  description: string
  icon: typeof WandSparkles
  tone: keyof typeof tones
}) {
  return (
    <div
      aria-disabled="true"
      title={`${title} — chưa được tích hợp trong phiên bản hiện tại`}
      className="flex min-h-[62px] items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white/75 px-3 py-2 opacity-65"
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold text-slate-800">{title}</span>
        <span className="block text-[10px] text-slate-500">{description}</span>
      </span>
      <span className="text-slate-400">›</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{children}</h3>
}

export function StudioColumn({ onOpenTool }: StudioColumnProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('create')

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-b from-white via-white to-indigo-50/70 shadow-[0_8px_28px_rgba(79,70,229,0.08)]">
      <header className="shrink-0 border-b border-indigo-100/80 bg-gradient-to-r from-blue-50/80 via-white to-violet-50/80 px-3 pb-3 pt-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-sm">
              <Layers3 className="size-5" />
            </span>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Studio</h2>
          </div>
          <span className="text-[10px] font-medium text-slate-500">Workspace tools</span>
        </div>

        <div className="grid grid-cols-4 gap-1 rounded-full bg-gradient-to-r from-blue-100/80 via-violet-100/80 to-fuchsia-100/70 p-1" role="tablist" aria-label="Studio categories">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-[10px] font-semibold transition-colors ${
                activeTab === id
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 [scrollbar-gutter:stable]">
        {activeTab === 'create' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <ToolCard title="Podcast" description="Generate episodes" icon={AudioLines} tone="violet" onClick={() => onOpenTool('podcast')} />
              <ToolCard title="Transformations" description="Create and manage" icon={WandSparkles} tone="blue" onClick={() => onOpenTool('transformations')} />
            </div>

            <section className="space-y-2">
              <SectionLabel>Open Notebook</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                <ToolCard title="Sources" description="Browse and manage" icon={FileText} tone="green" onClick={() => onOpenTool('sources')} />
                <ToolCard title="Notebooks" description="Browse and organize" icon={BookOpen} tone="cyan" onClick={() => onOpenTool('notebooks')} />
              </div>
            </section>

            <section className="space-y-2 border-t border-slate-200/80 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Open Notebook Tools</h3>
                <span className="text-[10px] text-slate-500">More tools</span>
              </div>
              <div className="space-y-2">
                <ToolRow title="Table Overview" description="Chưa được tích hợp trong phiên bản hiện tại" icon={Table2} tone="green" />
                <ToolRow title="Knowledge Graph" description="Chưa được tích hợp trong phiên bản hiện tại" icon={Network} tone="blue" />
                <ToolRow title="Insight Extraction" description="Chưa được tích hợp trong phiên bản hiện tại" icon={Lightbulb} tone="amber" />
                <button type="button" onClick={() => onOpenTool('notes')} className="flex min-h-[62px] w-full items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white px-3 py-2 text-left shadow-sm hover:bg-violet-50/40">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tones.violet}`}><StickyNote className="size-[18px]" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-slate-900">Notebook Notes</span><span className="block text-[10px] text-slate-500">Manage notes and Chat context</span></span>
                  <span className="text-slate-400">›</span>
                </button>
                <button type="button" onClick={() => onOpenTool('embeddings')} className="flex min-h-[62px] w-full items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white px-3 py-2 text-left shadow-sm hover:bg-cyan-50/40">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tones.cyan}`}><BrainCircuit className="size-[18px]" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-slate-900">Embeddings</span><span className="block text-[10px] text-slate-500">Manage vector embeddings</span></span>
                  <span className="text-slate-400">›</span>
                </button>
              </div>
            </section>
          </>
        )}

        {activeTab === 'analyze' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <ToolCard title="Transformations" description="Create and manage" icon={WandSparkles} tone="blue" onClick={() => onOpenTool('transformations')} />
              <ToolCard title="Embeddings" description="Manage vector index" icon={BrainCircuit} tone="cyan" onClick={() => onOpenTool('embeddings')} />
            </div>
            <section className="space-y-2 border-t border-slate-200/80 pt-4">
              <h3 className="text-sm font-bold text-slate-900">Open Notebook Tools</h3>
              <div className="space-y-2">
                <ToolRow title="Table Overview" description="Chưa được tích hợp trong phiên bản hiện tại" icon={Table2} tone="green" />
                <ToolRow title="Knowledge Graph" description="Chưa được tích hợp trong phiên bản hiện tại" icon={Network} tone="blue" />
                <ToolRow title="Insight Extraction" description="Chưa được tích hợp trong phiên bản hiện tại" icon={Lightbulb} tone="amber" />
              </div>
            </section>
          </>
        )}

        {activeTab === 'learn' && (
          <section className="space-y-2">
            <SectionLabel>Open Notebook</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <ToolCard title="Sources" description="Browse and manage" icon={FileText} tone="green" onClick={() => onOpenTool('sources')} />
              <ToolCard title="Notebooks" description="Browse and organize" icon={BookOpen} tone="cyan" onClick={() => onOpenTool('notebooks')} />
            </div>
            <button type="button" onClick={() => onOpenTool('notes')} className="flex min-h-[62px] w-full items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white px-3 py-2 text-left shadow-sm hover:bg-violet-50/40">
              <span className={`flex size-9 items-center justify-center rounded-full ${tones.violet}`}><StickyNote className="size-[18px]" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-slate-900">Notebook Notes</span><span className="block text-[10px] text-slate-500">Manage notes and Chat context</span></span>
              <span className="text-slate-400">›</span>
            </button>
          </section>
        )}

        {activeTab === 'present' && (
          <section className="space-y-2">
            <SectionLabel>Present</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <ToolCard title="Podcast" description="Generate episodes" icon={AudioLines} tone="violet" onClick={() => onOpenTool('podcast')} />
              <ToolCard title="Slide Deck" description="Not integrated yet" icon={Presentation} tone="amber" disabled />
              <ToolCard title="Video Overview" description="Not integrated yet" icon={MonitorPlay} tone="rose" disabled />
              <ToolCard title="Infographic" description="Not integrated yet" icon={GraduationCap} tone="blue" disabled />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
