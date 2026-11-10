'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/use-translation'
import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Search, ChevronDown, AlertCircle, Settings, Save, MessageCircleQuestion } from 'lucide-react'
import { useSearch } from '@/lib/hooks/use-search'
import { useAsk } from '@/lib/hooks/use-ask'
import { useModelDefaults, useModels } from '@/lib/hooks/use-models'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { StreamingResponse } from '@/components/search/StreamingResponse'
import { AdvancedModelsDialog } from '@/components/search/AdvancedModelsDialog'
import { SaveToNotebooksDialog } from '@/components/search/SaveToNotebooksDialog'
import { NotebookScopeSelector } from '@/components/search/NotebookScopeSelector'

export default function SearchPage() {
  const { t } = useTranslation()
  // URL params
  const searchParams = useSearchParams()
  const urlQuery = searchParams?.get('q') || ''
  const rawMode = searchParams?.get('mode')
  const urlMode = rawMode === 'search' ? 'search' : 'ask'

  // Tab state (controlled)
  const [activeTab, setActiveTab] = useState<'ask' | 'search'>(
    urlMode === 'search' ? 'search' : 'ask'
  )

  // Search state
  const [searchQuery, setSearchQuery] = useState(urlMode === 'search' ? urlQuery : '')
  const [searchType, setSearchType] = useState<'text' | 'vector'>('text')
  const [searchSources, setSearchSources] = useState(true)
  const [searchNotes, setSearchNotes] = useState(true)

  // Notebook scope shared by Ask and Search; empty = whole knowledge base (#574, #87)
  const [scopeNotebookIds, setScopeNotebookIds] = useState<string[]>([])

  // Ask state
  const [askQuestion, setAskQuestion] = useState(urlMode === 'ask' ? urlQuery : '')

  // Advanced models dialog
  const [showAdvancedModels, setShowAdvancedModels] = useState(false)
  const [customModels, setCustomModels] = useState<{
    strategy: string
    answer: string
    finalAnswer: string
  } | null>(null)

  // Save to notebooks dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Hooks
  const searchMutation = useSearch()
  const ask = useAsk()
  const { data: modelDefaults, isLoading: modelsLoading } = useModelDefaults()
  const { data: availableModels } = useModels()
  const { openModal } = useModalManager()

  const modelNameById = useMemo(() => {
    if (!availableModels) {
      return new Map<string, string>()
    }
    return new Map(availableModels.map((model) => [model.id, model.name]))
  }, [availableModels])

  const resolveModelName = (id?: string | null) => {
    if (!id) return t('searchPage.notSet')
    return modelNameById.get(id) ?? id
  }

  const hasEmbeddingModel = !!modelDefaults?.default_embedding_model

  // Track if we've already auto-triggered from URL params
  const hasAutoTriggeredRef = useRef(false)
  const lastUrlParamsRef = useRef({ q: '', mode: '' })

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return

    searchMutation.mutate({
      query: searchQuery,
      type: searchType,
      limit: 100,
      search_sources: searchSources,
      search_notes: searchNotes,
      minimum_score: 0.2,
      ...(scopeNotebookIds.length > 0 ? { notebook_ids: scopeNotebookIds } : {})
    })
  }, [searchQuery, searchType, searchSources, searchNotes, scopeNotebookIds, searchMutation])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleAsk = useCallback(() => {
    if (!askQuestion.trim() || !modelDefaults?.default_chat_model) return

    const models = customModels || {
      strategy: modelDefaults.default_chat_model,
      answer: modelDefaults.default_chat_model,
      finalAnswer: modelDefaults.default_chat_model
    }

    ask.sendAsk(askQuestion, models, { notebookIds: scopeNotebookIds })
  }, [askQuestion, modelDefaults, customModels, scopeNotebookIds, ask])

  // Auto-trigger search/ask when arriving with URL params
  useEffect(() => {
    // Skip if already triggered or no query
    if (hasAutoTriggeredRef.current || !urlQuery) return

    // Wait for models to load before triggering ask
    if (urlMode === 'ask' && modelsLoading) return

    if (urlMode === 'search') {
      handleSearch()
      hasAutoTriggeredRef.current = true
    } else if (urlMode === 'ask' && modelDefaults?.default_chat_model) {
      handleAsk()
      hasAutoTriggeredRef.current = true
    }
  }, [urlQuery, urlMode, modelsLoading, modelDefaults, handleSearch, handleAsk])

  // Handle URL param changes while on page (e.g., from command palette again)
  useEffect(() => {
    const currentQ = searchParams?.get('q') || ''
    const rawCurrentMode = searchParams?.get('mode')
    const currentMode = rawCurrentMode === 'search' ? 'search' : 'ask'

    // Check if URL params have changed
    if (currentQ !== lastUrlParamsRef.current.q || currentMode !== lastUrlParamsRef.current.mode) {
      lastUrlParamsRef.current = { q: currentQ, mode: currentMode }

      if (currentQ) {
        // Update state based on mode
        if (currentMode === 'search') {
          setSearchQuery(currentQ)
          setActiveTab('search')
          // Reset trigger flag so we auto-trigger with new params
          hasAutoTriggeredRef.current = false
        } else {
          setAskQuestion(currentQ)
          setActiveTab('ask')
          hasAutoTriggeredRef.current = false
        }
      }
    }
  }, [searchParams])

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        <h1 className="mb-3 font-display text-2xl font-semibold tracking-tight md:mb-5 md:text-3xl">{t('searchPage.askAndSearch')}</h1>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ask' | 'search')} className="w-full space-y-7">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('searchPage.chooseAMode')}</p>
            <TabsList aria-label={t('common.accessibility.searchKB')} className="inline-flex h-auto w-fit max-w-full flex-wrap gap-1 rounded-full bg-muted/70 p-1">
              <TabsTrigger value="ask" className="gap-2 rounded-full px-5 py-2.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <MessageCircleQuestion className="h-4 w-4" />
                {t('searchPage.askBeta')}
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-2 rounded-full px-5 py-2.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Search className="h-4 w-4" />
                {t('searchPage.search')}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ask" className="mt-5 focus-visible:outline-none">
            <Card className="rounded-3xl border-border/70 shadow-sm">
              <CardHeader className="space-y-2 px-5 pt-6 md:px-7 md:pt-7">
                <CardTitle className="text-xl font-semibold tracking-tight">{t('searchPage.askYourKb')}</CardTitle>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {t('searchPage.askYourKbDesc')}
                </p>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-6 md:px-7 md:pb-7">
                {/* Question Input */}
                <div className="space-y-2">
                  <Label htmlFor="ask-question" className="text-sm font-medium">{t('searchPage.question')}</Label>
                  <Textarea
                    id="ask-question"
                    name="ask-question"
                    placeholder={t('searchPage.enterQuestionPlaceholder')}
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      // Submit on Cmd/Ctrl+Enter
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !ask.isStreaming && askQuestion.trim()) {
                        e.preventDefault()
                        handleAsk()
                      }
                    }}
                    disabled={ask.isStreaming}
                    rows={3}
                    aria-label={t('common.accessibility.enterQuestion')}
                    className="min-h-32 resize-y rounded-2xl border-border/70 bg-background px-4 py-3 text-sm leading-6 shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground">{t('searchPage.pressToSubmit')}</p>
                </div>

                {/* Notebook scope */}
                <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                  <NotebookScopeSelector
                    selectedIds={scopeNotebookIds}
                    onChange={setScopeNotebookIds}
                    disabled={ask.isStreaming}
                  />
                </div>

                {/* Models Display */}
                {!hasEmbeddingModel ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-warn bg-warn-tint rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span>{t('searchPage.noEmbeddingModel')}</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          {customModels ? t('searchPage.usingCustomModels') : t('searchPage.usingDefaultModels')}
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAdvancedModels(true)}
                          disabled={ask.isStreaming}
                          className="h-auto py-1 px-2"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          {t('searchPage.advanced')}
                        </Button>
                      </div>
                      <div className="flex gap-2 text-xs flex-wrap">
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {t('searchPage.strategy')}: {resolveModelName(customModels?.strategy || modelDefaults?.default_chat_model)}
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {t('searchPage.answer')}: {resolveModelName(customModels?.answer || modelDefaults?.default_chat_model)}
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {t('searchPage.final')}: {resolveModelName(customModels?.finalAnswer || modelDefaults?.default_chat_model)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={handleAsk}
                        disabled={ask.isStreaming || !askQuestion.trim()}
                        className="h-11 w-full rounded-full px-6 sm:w-auto"
                      >
                        {ask.isStreaming ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            {t('searchPage.processing')}
                          </>
                        ) : (
                          t('searchPage.ask')
                        )}
                      </Button>

                      {ask.finalAnswer && (
                        <Button
                          variant="outline"
                          onClick={() => setShowSaveDialog(true)}
                          className="h-11 w-full rounded-full px-6 sm:w-auto"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {t('searchPage.saveToNotebooks')}
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* Streaming Response */}
                <StreamingResponse
                  isStreaming={ask.isStreaming}
                  strategy={ask.strategy}
                  answers={ask.answers}
                  finalAnswer={ask.finalAnswer}
                />

                {/* Advanced Models Dialog */}
                <AdvancedModelsDialog
                  open={showAdvancedModels}
                  onOpenChange={setShowAdvancedModels}
                  defaultModels={{
                    strategy: customModels?.strategy || modelDefaults?.default_chat_model || '',
                    answer: customModels?.answer || modelDefaults?.default_chat_model || '',
                    finalAnswer: customModels?.finalAnswer || modelDefaults?.default_chat_model || ''
                  }}
                  onSave={setCustomModels}
                />

                {/* Save to Notebooks Dialog */}
                {ask.finalAnswer && (
                  <SaveToNotebooksDialog
                    open={showSaveDialog}
                    onOpenChange={setShowSaveDialog}
                    question={askQuestion}
                    answer={ask.finalAnswer}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="mt-5 focus-visible:outline-none">
            <Card className="rounded-3xl border-border/70 shadow-sm">
              <CardHeader className="space-y-2 px-5 pt-6 md:px-7 md:pt-7">
                <CardTitle className="text-xl font-semibold tracking-tight">{t('searchPage.search')}</CardTitle>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {t('searchPage.searchDesc')}
                </p>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-6 md:px-7 md:pb-7">
                {/* Search Input */}
                <div className="space-y-2">
                  <Label htmlFor="search-query" className="sr-only">
                    {t('searchPage.search')}
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="search-query"
                      name="search-query"
                      placeholder={t('searchPage.enterSearchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={searchMutation.isPending}
                      className="h-12 flex-1 rounded-full border-border/70 bg-background px-5 shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/20"
                      aria-label={t('common.accessibility.enterSearch')}
                      autoComplete="off"
                    />
                    <Button
                      onClick={handleSearch}
                      disabled={searchMutation.isPending || !searchQuery.trim()}
                      aria-label={t('common.accessibility.searchKBBtn')}
                      className="h-12 w-full rounded-full px-6 sm:w-auto"
                    >
                      {searchMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      {t('searchPage.search')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('searchPage.pressToSearch')}</p>
                  {searchType === 'vector' ? (
                    <p className="text-xs text-muted-foreground">{t('searchPage.searchCoverageVector')}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('searchPage.searchCoverageText')}</p>
                  )}
                </div>

                {/* Search Options */}
                <div className="grid gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4 md:grid-cols-2 md:gap-5 md:p-5">
                  {/* Notebook scope */}
                  <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3 md:col-span-2">
                    <NotebookScopeSelector
                      selectedIds={scopeNotebookIds}
                      onChange={setScopeNotebookIds}
                      disabled={searchMutation.isPending}
                    />
                  </div>

                  {/* Search Type */}
                  <div className="space-y-3 rounded-xl bg-background/70 p-4" role="group" aria-labelledby="search-type-label">
                    <span id="search-type-label" className="text-sm font-semibold leading-none">{t('searchPage.searchType')}</span>
                    {!hasEmbeddingModel && (
                      <div className="flex items-center gap-2 text-sm text-warn">
                        <AlertCircle className="h-4 w-4" />
                        <span>{t('searchPage.vectorSearchWarning')}</span>
                      </div>
                    )}
                    <RadioGroup
                      name="search-type"
                      value={searchType}
                      onValueChange={(value: 'text' | 'vector') => setSearchType(value)}
                      disabled={modelsLoading || searchMutation.isPending}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="text" id="text" />
                        <Label htmlFor="text" className="font-normal cursor-pointer">
                          {t('searchPage.textSearch')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="vector"
                          id="vector"
                          disabled={!hasEmbeddingModel || searchMutation.isPending}
                        />
                        <Label
                          htmlFor="vector"
                          className={`font-normal ${!hasEmbeddingModel ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {t('searchPage.vectorSearch')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Search Locations */}
                  <div className="space-y-3 rounded-xl bg-background/70 p-4" role="group" aria-labelledby="search-in-label">
                    <span id="search-in-label" className="text-sm font-semibold leading-none">{t('searchPage.searchIn')}</span>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sources"
                          name="sources"
                          checked={searchSources}
                          onCheckedChange={(checked) => setSearchSources(checked as boolean)}
                          disabled={searchMutation.isPending}
                        />
                        <Label htmlFor="sources" className="font-normal cursor-pointer">
                          {t('searchPage.searchSources')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="notes"
                          name="notes"
                          checked={searchNotes}
                          onCheckedChange={(checked) => setSearchNotes(checked as boolean)}
                          disabled={searchMutation.isPending}
                        />
                        <Label htmlFor="notes" className="font-normal cursor-pointer">
                          {t('searchPage.searchNotes')}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search Results */}
                {searchMutation.data && (
                  <div className="mt-7 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold tracking-tight">
                        {t('searchPage.resultsFound', { count: searchMutation.data.total_count })}
                      </h3>
                      <Badge variant="outline">{searchMutation.data.search_type === 'text' ? t('searchPage.textSearch') : t('searchPage.vectorSearch')}</Badge>
                    </div>

                    {searchMutation.data.results.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          {t('searchPage.noResultsFor', { query: searchQuery })}
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {searchMutation.data.results.map((result, index) => {
                          const [type, id] = result.id.split(':')
                          const modalType = type === 'source_insight' ? 'insight' : type as 'source' | 'note' | 'insight'

                          return (
                          <Card key={index} className="rounded-2xl border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <button
                                    onClick={() => openModal(modalType, id)}
                                    className="text-left font-medium leading-snug text-foreground transition-colors hover:text-primary hover:underline"
                                  >
                                    {result.title}
                                  </button>
                                  <Badge variant="secondary" className="ml-2 font-mono text-[11px]">
                                    {result.final_score.toFixed(2)}
                                  </Badge>
                                </div>
                              </div>

                              {result.matches && result.matches.length > 0 && (
                                <Collapsible className="mt-4 border-t border-border/50 pt-3">
                                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                                    <ChevronDown className="h-4 w-4" />
                                    {t('searchPage.matches', { count: result.matches.length })}
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2 space-y-1">
                                    {result.matches.map((match, i) => (
                                      <div key={i} className="text-sm pl-6 py-1 border-l-2 border-muted">
                                        {match}
                                      </div>
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </CardContent>
                          </Card>
                        )})}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
