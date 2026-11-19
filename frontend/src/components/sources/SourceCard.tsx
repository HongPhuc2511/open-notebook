'use client'

import React, { useState, useEffect, memo } from 'react'
import { SourceListResponse } from '@/lib/types/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Globe,
  Upload,
  MoreVertical,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Unlink
} from 'lucide-react'
import { useSourceStatus } from '@/lib/hooks/use-sources'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { TFunction } from 'i18next'
import { cn } from '@/lib/utils'
import { ContextMode } from '@/app/(dashboard)/notebooks/[id]/page'
import { Checkbox } from '@/components/ui/checkbox'
import { SourceFavicon, getUploadIcon } from './SourceFavicon'

interface SourceCardProps {
  source: SourceListResponse
  onDelete?: (sourceId: string) => void
  onRetry?: (sourceId: string) => void
  onRefreshContent?: (sourceId: string) => void
  onRemoveFromNotebook?: (sourceId: string) => void
  onClick?: (sourceId: string) => void
  onRefresh?: () => void
  className?: string
  showRemoveFromNotebook?: boolean
  contextMode?: ContextMode
  onContextModeChange?: (mode: ContextMode) => void
}

const SOURCE_TYPE_ICONS = {
  link: Globe,
  upload: Upload,
  text: FileText,
} as const

const getStatusConfig = (t: TFunction) => ({
  new: {
    icon: Clock,
    color: 'text-teal',
    bgColor: 'bg-teal-tint',
    borderColor: 'border-teal/30',
    label: t('sources.statusProcessing'),
    description: t('sources.statusPreparingDesc')
  },
  queued: {
    icon: Clock,
    color: 'text-teal',
    bgColor: 'bg-teal-tint',
    borderColor: 'border-teal/30',
    label: t('sources.statusQueued'),
    description: t('sources.statusQueuedDesc')
  },
  running: {
    icon: Loader2,
    color: 'text-teal',
    bgColor: 'bg-teal-tint',
    borderColor: 'border-teal/30',
    label: t('sources.statusProcessing'),
    description: t('sources.statusProcessingDesc')
  },
  completed: {
    icon: CheckCircle,
    color: 'text-fern',
    bgColor: 'bg-fern-tint',
    borderColor: 'border-fern/30',
    label: t('sources.statusCompleted'),
    description: t('sources.statusCompletedDesc')
  },
  failed: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive-tint',
    borderColor: 'border-destructive/30',
    label: t('sources.statusFailed'),
    description: t('sources.statusFailedDesc')
  }
} as const)

type SourceStatus = 'new' | 'queued' | 'running' | 'completed' | 'failed'

function isSourceStatus(status: unknown): status is SourceStatus {
  return typeof status === 'string' && ['new', 'queued', 'running', 'completed', 'failed'].includes(status)
}

function getSourceType(source: SourceListResponse): 'link' | 'upload' | 'text' {
  // Determine type based on asset information
  if (source.asset?.url) return 'link'
  if (source.asset?.file_path) return 'upload'
  return 'text'
}

function SourceCardImpl({
  source,
  onClick,
  onDelete,
  onRetry,
  onRefreshContent,
  onRemoveFromNotebook,
  onRefresh,
  className,
  showRemoveFromNotebook = false,
  contextMode,
  onContextModeChange
}: SourceCardProps) {
  const { t } = useTranslation()
  const statusConfigMap = getStatusConfig(t)
  
  // Only fetch status for sources that might have async processing
  const sourceWithStatus = source as SourceListResponse & { command_id?: string; status?: string }

  // Track processing state to continue polling until we detect completion
  const [wasProcessing, setWasProcessing] = useState(false)

  // Only poll status while the source is actually being processed (or just finished
  // and we still need one more poll to catch completion). The list endpoint already
  // populates `status` alongside `command_id`, so we no longer poll for every
  // completed source — that scaled linearly with the number of cards and caused the
  // list lag reported in #503.
  //
  // A source with a `command_id` but no resolved `status` yet is still ambiguous
  // (it renders as a synthetic "new"), so keep polling those until a real status
  // arrives — otherwise such a card would be stuck "processing" forever.
  const shouldFetchStatus =
    sourceWithStatus.status === 'new' ||
    sourceWithStatus.status === 'queued' ||
    sourceWithStatus.status === 'running' ||
    (!!sourceWithStatus.command_id && !sourceWithStatus.status) ||
    wasProcessing // Keep polling if we were processing to catch the completion

  const { data: statusData, isLoading: statusLoading } = useSourceStatus(
    source.id,
    shouldFetchStatus
  )

  // Determine current status
  // If source has a command_id but no status, treat as "new" (just created)
  const rawStatus = statusData?.status || sourceWithStatus.status
  const currentStatus: SourceStatus = isSourceStatus(rawStatus)
    ? rawStatus
    : (sourceWithStatus.command_id ? 'new' : 'completed')


  // Track processing state and detect completion
  useEffect(() => {
    const currentStatusFromData = statusData?.status || sourceWithStatus.status

    // If we're currently processing, mark that we were processing
    if (currentStatusFromData === 'new' || currentStatusFromData === 'running' || currentStatusFromData === 'queued') {
      setWasProcessing(true)
    }

    // If we were processing and now completed/failed, trigger refresh and stop polling
    if (wasProcessing &&
        (currentStatusFromData === 'completed' || currentStatusFromData === 'failed')) {
      setWasProcessing(false) // Stop polling

      if (onRefresh) {
        setTimeout(() => onRefresh(), 500) // Small delay to ensure API is updated
      }
    }
  }, [statusData, sourceWithStatus.status, wasProcessing, onRefresh, source.id])
  
  const statusConfig = statusConfigMap[currentStatus] || statusConfigMap.completed
  const StatusIcon = statusConfig.icon
  const sourceType = getSourceType(source)
  const SourceTypeIcon =
    sourceType === 'upload' ? getUploadIcon(source.asset?.file_path) : SOURCE_TYPE_ICONS[sourceType]
  
   const title = source.title || t('sources.untitledSource')

  const handleRetry = () => {
    if (onRetry) {
      onRetry(source.id)
    }
  }

  const handleRefreshContent = () => {
    if (onRefreshContent) {
      onRefreshContent(source.id)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(source.id)
    }
  }

  const handleRemoveFromNotebook = () => {
    if (onRemoveFromNotebook) {
      onRemoveFromNotebook(source.id)
    }
  }

  const handleCardClick = () => {
    if (onClick) {
      onClick(source.id)
    }
  }

  const isProcessing: boolean = currentStatus === 'new' || currentStatus === 'running' || currentStatus === 'queued'
  const isFailed: boolean = currentStatus === 'failed'
  const isCompleted: boolean = currentStatus === 'completed'

  return (
    <Card
      className={cn(
        'group relative cursor-pointer gap-0 rounded-xl border-0 bg-transparent py-0 shadow-none transition-colors duration-150 hover:bg-muted',
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className="px-3 py-2">
        <div className="flex items-center gap-3">
          {sourceType === 'link' && source.asset?.url ? (
            <SourceFavicon url={source.asset.url} className="h-5 w-5 shrink-0" />
          ) : (
            <SourceTypeIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}

          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm leading-tight" title={title}>
              {title}
            </h4>

            {!isCompleted && (
              <div className="mt-1 flex items-center gap-2">
                <div className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
                  statusConfig.bgColor,
                  statusConfig.color
                )}>
                  <StatusIcon className={cn('h-3 w-3', isProcessing && 'animate-spin')} />
                  {statusLoading && shouldFetchStatus ? t('sources.checking') : statusConfig.label}
                </div>
              </div>
            )}

            {statusData?.message && (isProcessing || isFailed) && (
              <p className="mt-1 text-xs italic text-muted-foreground">
                {statusData.message}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {showRemoveFromNotebook && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFromNotebook()
                    }}
                    disabled={!onRemoveFromNotebook}
                  >
                    <Unlink className="mr-2 h-4 w-4" />
                    {t('sources.removeFromNotebook')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {isFailed && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRetry()
                    }}
                    disabled={!onRetry}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('sources.retryProcessing')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {sourceType === 'link' && isCompleted && onRefreshContent && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRefreshContent()
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('sources.refreshContent')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                disabled={!onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('sources.deleteSource')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onContextModeChange && contextMode && (
            <Checkbox
              checked={contextMode !== 'off'}
              onCheckedChange={(checked) => onContextModeChange(checked ? 'full' : 'off')}
              onClick={(e) => e.stopPropagation()}
              aria-label="Include in chat context"
            />
          )}
        </div>

        {isFailed ? (
          <div className="flex gap-2 border-t pt-2 mt-2">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleRetry()
              }}
              disabled={!onRetry}
              className="h-7 text-xs"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              {t('sources.retryProcessing')}
            </Button>
          </div>
        ) : null}

        {isProcessing && typeof statusData?.processing_info?.progress === 'number' && (
          <div className="mt-2 border-t pt-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('common.progress')}</span>
              <span className="text-xs text-muted-foreground">
                {Math.round(statusData.processing_info.progress as number)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-teal transition-all duration-300"
                style={{ width: `${statusData.processing_info.progress as number}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}  

/**
 * SourceCard is rendered in long lists (one per source). Without memoization, any
 * parent re-render (layout toggles, context-selection changes elsewhere) re-rendered
 * every card, causing UI jank that scaled with the number of sources (#503).
 *
 * We compare only the props that affect this card's rendered output. Handler identity
 * is intentionally ignored: callers often pass inline closures, and those closures
 * capture the source id, so a stale closure stays correct as long as the source data
 * below is unchanged.
 */
function topicsEqual(a?: string[], b?: string[]): boolean {
  if (a === b) return true
  if ((a?.length ?? 0) !== (b?.length ?? 0)) return false
  if (!a || !b) return true // both empty/undefined (lengths matched above)
  return a.every((topic, i) => topic === b[i])
}

function areEqual(prev: SourceCardProps, next: SourceCardProps): boolean {
  if (prev === next) return true

  const p = prev.source as SourceListResponse & { command_id?: string; status?: string }
  const n = next.source as SourceListResponse & { command_id?: string; status?: string }

  return (
    p.id === n.id &&
    p.title === n.title &&
    p.updated === n.updated &&
    p.status === n.status &&
    p.command_id === n.command_id &&
    p.embedded === n.embedded &&
    p.insights_count === n.insights_count &&
    p.asset?.url === n.asset?.url &&
    p.asset?.file_path === n.asset?.file_path &&
    topicsEqual(p.topics, n.topics) &&
    prev.contextMode === next.contextMode &&
    prev.showRemoveFromNotebook === next.showRemoveFromNotebook &&
    prev.className === next.className
  )
}

export const SourceCard = memo(SourceCardImpl, areEqual)
