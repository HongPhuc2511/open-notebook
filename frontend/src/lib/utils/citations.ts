import type { ReferenceType } from './source-references'

export interface Citation {
  n: number
  type: ReferenceType
  id: string
  quote: string
}

const CLOSED_BLOCK = /<citations>([\s\S]*?)<\/citations>/i
const OPEN_BLOCK = /<citations>[\s\S]*$/i // block chưa đóng (đang stream)

function parseRef(ref: string): { type: ReferenceType; id: string } | null {
  const m = /^(source_insight|insight|note|source):([A-Za-z0-9_]+)$/.exec(ref.trim())
  if (!m) return null
  return {
    type: (m[1] === 'insight' ? 'source_insight' : m[1]) as ReferenceType,
    id: m[2],
  }
}

/** Tách khối <citations> khỏi câu trả lời. */
export function extractCitations(raw: string): { text: string; citations: Citation[] } {
  const closed = CLOSED_BLOCK.exec(raw)
  const PARTIAL_TAG = /<(?:c(?:i(?:t(?:a(?:t(?:i(?:o(?:n(?:s)?)?)?)?)?)?)?)?)?$/i

  if (!closed) {
    return { text: raw.replace(OPEN_BLOCK, '').replace(PARTIAL_TAG, '').trimEnd(), citations: [] }
  }

  const text = raw.replace(CLOSED_BLOCK, '').trimEnd()
  const citations: Citation[] = []
  try {
    const json = closed[1].replace(/```json|```/g, '').trim()
    const arr = JSON.parse(json)
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const ref = typeof item?.ref === 'string' ? parseRef(item.ref) : null
        const n = Number(item?.n)
        if (ref && Number.isFinite(n) && typeof item?.quote === 'string') {
          citations.push({ n, ...ref, quote: item.quote.trim() })
        }
      }
    }
  } catch {
    // JSON hỏng -> bỏ qua, caller sẽ dùng cách cũ
  }
  return { text, citations }
}

/** [1] -> [1](#cite-1), chỉ với số có trong citations. */
export function linkifyCitations(text: string, citations: Citation[]): string {
  const nums = new Set(citations.map((c) => c.n))
  return text.replace(/\[(\d{1,3})\](?!\()/g, (m, d) =>
    nums.has(Number(d)) ? `[${d}](#cite-${d})` : m
  )
}

const RAW_REF_GROUP =
  /\[\s*((?:source_insight|insight|note|source):[A-Za-z0-9_]+(?:\s*,\s*(?:source_insight|insight|note|source):[A-Za-z0-9_]+)*)\s*\]/g

/**
 * Model đôi khi vẫn viết [source:abc] thay vì [n] dù đã có khối <citations>.
 * Đổi các tham chiếu thô đó về số để hiện badge; id chưa có trong danh sách
 * sẽ được thêm một citation không có trích đoạn.
 */
export function resolveRawReferences(
  text: string,
  citations: Citation[]
): { text: string; citations: Citation[] } {
  const list = [...citations]
  let next = list.reduce((max, c) => Math.max(max, c.n), 0) + 1

  const numberFor = (type: ReferenceType, id: string): number => {
    const found = list.find((c) => c.type === type && c.id === id)
    if (found) return found.n
    const n = next++
    list.push({ n, type, id, quote: '' })
    return n
  }

  const out = text.replace(RAW_REF_GROUP, (_m, group: string) => {
    const nums: number[] = []
    for (const part of group.split(',')) {
      const ref = parseRef(part)
      if (!ref) continue
      const n = numberFor(ref.type, ref.id)
      if (!nums.includes(n)) nums.push(n)
    }
    return nums.map((n) => '[' + n + ']').join('')
  })

  return { text: out, citations: list }
}
