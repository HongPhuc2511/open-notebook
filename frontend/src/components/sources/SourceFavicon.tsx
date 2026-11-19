'use client'

import { useState } from 'react'
import {
  Globe,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function getHostname(url: string): string | null {
  try {
    const withScheme = url.includes('://') ? url : 'https://' + url
    const host = new URL(withScheme).hostname
    // localhost / địa chỉ nội bộ không có favicon công khai
    return host.includes('.') ? host : null
  } catch {
    return null
  }
}

// Icon theo loại file cho nguồn tải lên
export function getUploadIcon(filePath?: string | null): LucideIcon {
  const ext = (filePath ?? '').split('.').pop()?.toLowerCase() ?? ''
  if (['xls', 'xlsx', 'csv', 'tsv', 'ods'].includes(ext)) return FileSpreadsheet
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return FileImage
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(ext)) return FileAudio
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return FileVideo
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FileArchive
  return FileText
}

interface SourceFaviconProps {
  url: string
  className?: string
}

// Favicon thật của trang web; lỗi tải ảnh thì quay về icon quả địa cầu.
export function SourceFavicon({ url, className }: SourceFaviconProps) {
  const host = getHostname(url)
  const [failedHost, setFailedHost] = useState<string | null>(null)

  if (!host || failedHost === host) {
    return <Globe className={cn('text-muted-foreground', className)} />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(host) + '&sz=64'}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn('rounded-sm object-contain', className)}
      onError={() => setFailedHost(host)}
    />
  )
}
