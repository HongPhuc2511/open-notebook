'use client'

import { useState } from 'react'
import {
  AudioLines, WandSparkles, FileText, BookOpen,
  ChartNoAxesCombined, Lightbulb, Presentation, PencilLine,
  ChevronRight, NotebookPen, Search
} from 'lucide-react'

export type StudioTool = 'podcasts' | 'transformations' | 'sources' | 'notebooks' | 'search'

const tabs = [
  { label: 'Create', icon: PencilLine },
  { label: 'Analyze', icon: ChartNoAxesCombined },
  { label: 'Learn', icon: Lightbulb },
  { label: 'Present', icon: Presentation },
]

const destinations: {
  id: StudioTool
  title: string
  description: string
  icon: typeof FileText
  tone: string
  group: string
}[] = [
  { id: 'podcasts', title: 'Podcast', description: 'Generate episodes', icon: AudioLines, tone: 'violet', group: 'Create' },
  { id: 'transformations', title: 'Transformations', description: 'Create and manage workflows', icon: WandSparkles, tone: 'blue', group: 'Create' },
  { id: 'sources', title: 'Sources', description: 'Browse and manage sources', icon: FileText, tone: 'green', group: 'Analyze' },
  { id: 'notebooks', title: 'Notebooks', description: 'Browse and organize', icon: BookOpen, tone: 'cyan', group: 'Learn' },
  { id: 'search', title: 'Ask & Search', description: 'Search across your knowledge', icon: Search, tone: 'amber', group: 'Learn' },
]

function StudioAction({ id, title, description, icon: Icon, tone = 'blue', onSelect }: {
  id: StudioTool
  title: string
  description: string
  icon: typeof FileText
  tone?: string
  onSelect: (tool: StudioTool) => void
}) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700', violet: 'bg-violet-100 text-violet-700',
    green: 'bg-emerald-100 text-emerald-700', cyan: 'bg-cyan-100 text-cyan-700',
    amber: 'bg-amber-100 text-amber-700',
  }
  return (
    <button type="button" onClick={() => onSelect(id)}
      className="group flex min-w-0 w-full items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 text-left transition hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-sm">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}><Icon className="size-[17px]" /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-900">{title}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{description}</span></span>
      <ChevronRight className="size-3.5 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100" />
    </button>
  )
}

export function StudioColumn({ onSelect }: { onSelect: (tool: StudioTool) => void }) {
  const [activeTab, setActiveTab] = useState('Create')
  const visible = destinations.filter(item => item.group === activeTab)
  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-sm">
      <header className="shrink-0 border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-blue-50 p-3">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-violet-100/70 p-1">
          {tabs.map(({ label, icon: Icon }) => (
            <button key={label} type="button" onClick={() => setActiveTab(label)} aria-pressed={activeTab === label}
              className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] transition ${activeTab === label ? 'bg-white font-semibold text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}>
              <Icon className="size-4" />{label}
            </button>
          ))}
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <section>
          <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{activeTab} workspace</p><span className="text-[10px] text-slate-400">{visible.length} tools</span></div>
          <div className="grid grid-cols-2 gap-2">
            {visible.map(item => <StudioAction key={item.id} {...item} onSelect={onSelect} />)}
          </div>
          {visible.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">Chưa có công cụ khả dụng trong nhóm này.</p>}
        </section>
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Open Notebook</p>
          <div className="grid grid-cols-2 gap-2">
            <StudioAction id="sources" title="Sources" description="Browse and manage" icon={FileText} tone="green" onSelect={onSelect} />
            <StudioAction id="notebooks" title="Notebooks" description="Browse and organize" icon={BookOpen} tone="cyan" onSelect={onSelect} />
          </div>
        </section>
        <section>
          <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold text-slate-900">Open Notebook Tools</p><button type="button" onClick={() => onSelect('transformations')} className="text-[10px] text-slate-500 hover:text-blue-600">More tools</button></div>
          <StudioAction id="transformations" title="Transformations" description="Manage and run text workflows" icon={WandSparkles} tone="violet" onSelect={onSelect} />
          <div className="mt-2"><StudioAction id="podcasts" title="Podcast Studio" description="Create and manage episodes" icon={AudioLines} tone="blue" onSelect={onSelect} /></div>
          <div className="mt-2"><StudioAction id="notebooks" title="Notebook Notes" description="Manage notes and chat context" icon={NotebookPen} tone="green" onSelect={onSelect} /></div>
          <div className="mt-2"><StudioAction id="search" title="Ask & Search" description="Search across your knowledge" icon={Search} tone="amber" onSelect={onSelect} /></div>
        </section>
      </div>
    </aside>
  )
}
