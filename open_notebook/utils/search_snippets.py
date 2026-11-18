import asyncio
import re
from typing import Any, Dict, List

from open_notebook.domain.notebook import Note, Source, SourceInsight

MAX_ENRICH = 20
MAX_SNIPPETS = 3
RADIUS = 130

_LINK_RE = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")
_MD_RE = re.compile(r"(\*\*|__|`|^\s*#{1,6}\s*|^\s*[-*+]\s+)", re.M)


def _clean(text: str) -> str:
    text = _LINK_RE.sub(r"\1", text)
    text = _MD_RE.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


def build_snippets(text: str, query: str) -> List[str]:
    text = _clean(text)
    if not text:
        return []
    low = text.lower()
    terms = [query.lower().strip()] + [w for w in query.lower().split() if len(w) >= 2]
    hits: List[int] = []
    for term in terms:
        if not term:
            continue
        start = 0
        while len(hits) < 30:
            i = low.find(term, start)
            if i == -1:
                break
            hits.append(i)
            start = i + len(term)
        if hits:
            break  # the full phrase matched; don't fall back to single words
    snippets: List[str] = []
    last_end = -1
    for i in sorted(hits):
        if i < last_end:
            continue
        a, b = max(0, i - RADIUS), min(len(text), i + RADIUS)
        snippets.append(("…" if a > 0 else "") + text[a:b].strip() + ("…" if b < len(text) else ""))
        last_end = b
        if len(snippets) >= MAX_SNIPPETS:
            break
    return snippets or [text[: RADIUS * 2]]


async def _text_of(record_id: str) -> str:
    try:
        if record_id.startswith("source_insight:"):
            obj: Any = await SourceInsight.get(record_id)
            return getattr(obj, "content", "") or ""
        if record_id.startswith("source:"):
            obj = await Source.get(record_id)
            return getattr(obj, "full_text", "") or ""
        if record_id.startswith("note:"):
            obj = await Note.get(record_id)
            return getattr(obj, "content", "") or ""
    except Exception:
        return ""
    return ""


async def attach_snippets(results: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
    head = results[:MAX_ENRICH]
    texts = await asyncio.gather(*[_text_of(str(r.get("id", ""))) for r in head])
    for r, t in zip(head, texts):
        if t:
            r["matches"] = build_snippets(t, query)
    return results