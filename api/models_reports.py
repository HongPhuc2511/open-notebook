"""Pydantic contracts for Reports API."""
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

ReportStatusValue = Literal[
    "draft", "collecting", "analyzing", "generating",
    "review", "completed", "failed",
]


class ReportCreate(BaseModel):
    notebook_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=300)
    description: str = ""
    config: dict[str, Any] = Field(default_factory=dict)

    @field_validator("notebook_id", "title")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be empty")
        return value


class ReportUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=300)
    description: str | None = None
    status: ReportStatusValue | None = None
    config: dict[str, Any] | None = None


class ReportResponse(BaseModel):
    id: str
    notebook_id: str
    title: str
    description: str
    status: ReportStatusValue
    config: dict[str, Any]
    current_version: int
    created: str
    updated: str
