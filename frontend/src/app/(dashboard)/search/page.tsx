'use client'

import { Suspense } from 'react'
import { SearchPageContent } from './StudioContent'

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  )
}
