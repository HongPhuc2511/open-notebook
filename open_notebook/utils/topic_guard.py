import os
import re
import unicodedata
from typing import Optional

# Terms are written WITHOUT diacritics and lowercase. Matching is done on
# normalized text, so "chiến tranh" and "chien tranh" both hit "chien tranh".
BLOCKED_TERMS_VI = [
    "chien tranh", "quan su", "quan doi", "vu khi", "bom min", "chien luoc quan su",
    "chinh tri", "chinh tri gia", "dang cong san", "bau cu", "bieu tinh",
    "dao chinh", "lat do chinh quyen", "khung bo", "tuyen truyen chinh tri",
]
BLOCKED_TERMS_EN = [
    "war", "military", "army", "weapon", "weapons", "politics", "political",
    "election", "elections", "coup", "terrorism", "terrorist", "protest",
    "propaganda", "communist party",
]

REFUSAL_VI = (
    "Xin lỗi, mình không thể trả lời các câu hỏi về chiến tranh, quân sự hoặc "
    "các vấn đề chính trị nhạy cảm. Bạn có thể hỏi về nội dung khác trong tài liệu nhé."
)
REFUSAL_EN = (
    "Sorry, I can't answer questions about war, military topics or politically "
    "sensitive issues. Feel free to ask about something else in your sources."
)


def _normalize(text: str) -> str:
    text = text.lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", text).strip()


def _compile(terms: list[str]) -> Optional[re.Pattern]:
    cleaned = [_normalize(t) for t in terms if t and t.strip()]
    if not cleaned:
        return None
    alt = "|".join(re.escape(t) for t in sorted(set(cleaned), key=len, reverse=True))
    return re.compile(rf"(?<![a-z0-9])(?:{alt})(?![a-z0-9])")


def _extra_terms() -> list[str]:
    raw = os.getenv("OPEN_NOTEBOOK_BLOCKED_TOPICS", "")
    return [t for t in raw.split(",") if t.strip()]


def _enabled() -> bool:
    return os.getenv("OPEN_NOTEBOOK_TOPIC_GUARD", "on").strip().lower() not in {
        "off", "0", "false", "no",
    }


def check_message(text: str) -> Optional[str]:
    """Return a refusal message if `text` touches a blocked topic, else None."""
    if not text or not _enabled():
        return None
    norm = _normalize(text)
    extra = _extra_terms()
    vi = _compile(BLOCKED_TERMS_VI + extra)
    en = _compile(BLOCKED_TERMS_EN)
    if vi and vi.search(norm):
        return REFUSAL_VI
    if en and en.search(norm):
        return REFUSAL_EN
    return None