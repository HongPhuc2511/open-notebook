import json
import re
from typing import Any, Dict, Tuple

MAX_PASSAGE_CHARS = 1200
QUOTE_CHARS = 200
MAX_CITATIONS = 999

_CITATIONS_RE = re.compile(r"\s*<citations>[\s\S]*?</citations>\s*$")
_MULTI_RE = re.compile(r"\[\d{1,3}(?:\s*[,;]\s*\d{1,3})+\]")
_MARKER_RE = re.compile(r"\[(\d{1,3})\]")


def _split_passages(text: str) -> list[str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    passages: list[str] = []
    buf = ""
    for p in paras:
        if buf and len(buf) + len(p) + 2 > MAX_PASSAGE_CHARS:
            passages.append(buf)
            buf = p
        else:
            buf = f"{buf}\n\n{p}" if buf else p
        while len(buf) > MAX_PASSAGE_CHARS * 2:
            passages.append(buf[:MAX_PASSAGE_CHARS])
            buf = buf[MAX_PASSAGE_CHARS:]
    if buf:
        passages.append(buf)
    return passages


def _quote(text: str) -> str:
    flat = re.sub(r"\s+", " ", text).strip()
    return flat[:QUOTE_CHARS]


def build_numbered_context(context: Any) -> Tuple[str, Dict[int, Dict[str, str]]]:
    """Turn the notebook context dict into numbered text + a registry n -> {ref, quote}."""
    if not context:
        return "", {}
    if not isinstance(context, dict):
        return str(context), {}

    lines: list[str] = []
    registry: Dict[int, Dict[str, str]] = {}
    counter = 0

    def add(ref: str | None, label: str, body: str) -> None:
        nonlocal counter
        if not ref or not body or not body.strip() or counter >= MAX_CITATIONS:
            return
        counter += 1
        registry[counter] = {"ref": ref, "quote": _quote(body)}
        lines.append(f"[{counter}] {label}\n{body.strip()}\n")

    for src in context.get("sources") or []:
        if not isinstance(src, dict):
            continue
        title = src.get("title") or "Untitled source"
        sid = src.get("id")
        full_text = src.get("full_text")
        if isinstance(full_text, str) and full_text.strip():
            for i, passage in enumerate(_split_passages(full_text), start=1):
                add(sid, f'SOURCE "{title}" - passage {i}', passage)
        for ins in src.get("insights") or []:
            if isinstance(ins, dict):
                add(
                    ins.get("id"),
                    f'INSIGHT ({ins.get("insight_type") or "insight"}) of source "{title}"',
                    ins.get("content") or "",
                )

    for note in context.get("notes") or []:
        if isinstance(note, dict):
            add(note.get("id"), f'NOTE "{note.get("title") or "Untitled note"}"',
                note.get("content") or "")

    return "\n".join(lines), registry


def strip_citations_block(text: str) -> str:
    return _CITATIONS_RE.sub("", text)


def append_citations_block(answer: str, registry: Dict[int, Dict[str, str]]) -> str:
    """Normalize [1, 2] -> [1][2], then append a <citations> block for used numbers."""
    if not registry:
        return answer

    def split_multi(m: re.Match) -> str:
        return "".join(f"[{n}]" for n in re.findall(r"\d+", m.group(0)))

    answer = _MULTI_RE.sub(split_multi, strip_citations_block(answer))

    used: list[int] = []
    for m in _MARKER_RE.finditer(answer):
        n = int(m.group(1))
        if n in registry and n not in used:
            used.append(n)
    if not used:
        return answer

    entries = [{"n": n, **registry[n]} for n in sorted(used)]
    block = json.dumps(entries, ensure_ascii=False, indent=2)
    return f"{answer}\n\n<citations>\n{block}\n</citations>"