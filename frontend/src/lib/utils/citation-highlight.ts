const NAME = 'citation'
const KEEP = /[\p{L}\p{N}\p{M}]/u

function ensureHighlightStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById('citation-highlight-style')) return
  const style = document.createElement('style')
  style.id = 'citation-highlight-style'
  style.textContent =
    '::highlight(citation){background-color:rgba(250,204,21,0.55);color:inherit;}'
  document.head.appendChild(style)
}

type HighlightRegistry = Map<string, unknown>
const getRegistry = (): HighlightRegistry | undefined =>
  (CSS as unknown as { highlights?: HighlightRegistry }).highlights

function normalizeQuote(s: string): string {
  let out = ''
  for (const ch of s.normalize('NFC')) {
    if (KEEP.test(ch)) out += ch.toLowerCase()
  }
  return out
}

/** Gom toàn bộ text node thành một chuỗi chỉ gồm chữ/số, kèm bản đồ vị trí. */
function buildIndex(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const map: { node: Text; start: number; len: number }[] = []
  let text = ''
  let current: Node | null
  while ((current = walker.nextNode())) {
    const node = current as Text
    const data = node.data
    let i = 0
    while (i < data.length) {
      const cp = data.codePointAt(i)!
      const len = cp > 0xffff ? 2 : 1
      const ch = data.substr(i, len)
      if (KEEP.test(ch)) {
        const lower = ch.toLowerCase()
        for (let k = 0; k < lower.length; k++) map.push({ node, start: i, len })
        text += lower
      }
      i += len
    }
  }
  return { text, map }
}

export function clearCitationHighlight() {
  getRegistry()?.delete(NAME)
}

/** Tô sáng đoạn trích trong root và cuộn tới đó. Trả về true nếu tìm thấy. */
export function applyCitationHighlight(root: HTMLElement, quote: string): boolean {
  clearCitationHighlight()
  ensureHighlightStyle()
  const target = normalizeQuote(quote)
  if (target.length < 8) return false

  const { text, map } = buildIndex(root)
  let start = text.indexOf(target)
  if (start === -1) {
    // Model chép lệch vài chữ: neo theo 40 ký tự đầu
    start = text.indexOf(target.slice(0, 40))
    if (start === -1) return false
  }
  const end = Math.min(start + target.length, map.length) - 1
  const a = map[start]
  const b = map[end]

  const range = document.createRange()
  range.setStart(a.node, a.start)
  range.setEnd(b.node, b.start + b.len)

  const Ctor = (window as unknown as { Highlight?: new (r: Range) => unknown }).Highlight
  getRegistry()?.set(NAME, Ctor ? new Ctor(range) : undefined)
  a.node.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return true
}