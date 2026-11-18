const NAME = 'citation'
const KEEP = /[\p{L}\p{N}\p{M}]/u

type HighlightRegistry = Map<string, unknown>
const getRegistry = (): HighlightRegistry | undefined =>
  (CSS as unknown as { highlights?: HighlightRegistry }).highlights

function ensureHighlightStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById('citation-highlight-style')) return
  const style = document.createElement('style')
  style.id = 'citation-highlight-style'
  style.textContent = '::highlight(citation){background-color:rgba(250,204,21,0.55);color:inherit;}'
  document.head.appendChild(style)
}

function normalizeQuote(s: string): string {
  let out = ''
  for (const ch of s.normalize('NFC')) {
    if (KEEP.test(ch)) out += ch.toLowerCase()
  }
  return out
}

interface Index {
  sig: number
  text: string
  nodes: Text[]
  nodeOf: number[]
  startOf: number[]
  lenOf: number[]
}
const cache = new WeakMap<HTMLElement, Index>()

function buildIndex(root: HTMLElement): Index {
  const sig = (root.textContent || '').length
  const hit = cache.get(root)
  if (hit && hit.sig === sig) return hit

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  const nodeOf: number[] = []
  const startOf: number[] = []
  const lenOf: number[] = []
  const parts: string[] = []

  let current: Node | null
  while ((current = walker.nextNode())) {
    const node = current as Text
    const ni = nodes.length
    nodes.push(node)
    const data = node.data
    let i = 0
    while (i < data.length) {
      const cp = data.codePointAt(i)!
      const len = cp > 0xffff ? 2 : 1
      const ch = data.substr(i, len)
      if (KEEP.test(ch)) {
        const lower = ch.toLowerCase()
        for (let k = 0; k < lower.length; k++) {
          nodeOf.push(ni)
          startOf.push(i)
          lenOf.push(len)
        }
        parts.push(lower)
      }
      i += len
    }
  }

  const index: Index = { sig, text: parts.join(''), nodes, nodeOf, startOf, lenOf }
  cache.set(root, index)
  return index
}

export function clearCitationHighlight() {
  getRegistry()?.delete(NAME)
}

export function applyCitationHighlight(root: HTMLElement, quote: string): boolean {
  clearCitationHighlight()
  ensureHighlightStyle()
  const target = normalizeQuote(quote)
  if (target.length < 8) return false

  const idx = buildIndex(root)
  let start = idx.text.indexOf(target)
  if (start === -1) {
    start = idx.text.indexOf(target.slice(0, 40))
    if (start === -1) return false
  }
  const end = Math.min(start + target.length, idx.nodeOf.length) - 1

  const range = document.createRange()
  range.setStart(idx.nodes[idx.nodeOf[start]], idx.startOf[start])
  range.setEnd(idx.nodes[idx.nodeOf[end]], idx.startOf[end] + idx.lenOf[end])

  const Ctor = (window as unknown as { Highlight?: new (r: Range) => unknown }).Highlight
  getRegistry()?.set(NAME, Ctor ? new Ctor(range) : undefined)
  idx.nodes[idx.nodeOf[start]].parentElement?.scrollIntoView({ behavior: 'auto', block: 'center' })
  return true
}