'use client'

import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Citation } from '@/lib/utils/citations'

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string
  children?: React.ReactNode
}

export function createCitationLinkComponent(
  citations: Citation[],
  onOpenSource: (c: Citation) => void,
  Fallback: React.ComponentType<LinkProps>
) {
  const CitationLink = (props: LinkProps) => {
    const { href, children } = props
    if (!href?.startsWith('#cite-')) return <Fallback {...props} />

    const n = Number(href.substring(6))
    const citation = citations.find((c) => c.n === n)
    if (!citation) return <>{children}</>

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary hover:bg-primary/25"
          >
            {n}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-2 text-sm" align="start">
          {citation.quote && (
            <blockquote className="border-l-2 border-primary/50 pl-2 italic text-muted-foreground">
              {citation.quote}
            </blockquote>
          )}
          <button
            type="button"
            onClick={() => onOpenSource(citation)}
            className="text-xs font-medium text-primary underline underline-offset-2"
          >
            Xem nguồn
          </button>
        </PopoverContent>
      </Popover>
    )
  }
  CitationLink.displayName = 'CitationLink'
  return CitationLink
}