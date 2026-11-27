"""First-class Report domain models."""
from typing import Any, ClassVar, Literal

from pydantic import Field, field_validator

from open_notebook.database.repository import repo_query
from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import InvalidInputError

ReportStatus = Literal[
    "draft", "collecting", "analyzing", "generating",
    "review", "completed", "failed",
]
EvidenceStatus = Literal[
    "supported", "partially_supported", "conflicting", "unsupported",
]
GenerationStatus = Literal[
    "queued", "running", "completed", "failed", "cancelled",
]


class Report(ObjectModel):
    table_name: ClassVar[str] = "report"

    notebook_id: str
    title: str
    description: str = ""
    status: ReportStatus = "draft"
    config: dict[str, Any] = Field(default_factory=dict)
    current_version: int = 1

    @field_validator("notebook_id", "title")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise InvalidInputError("notebook_id and title cannot be empty")
        return value

    @classmethod
    async def for_notebook(cls, notebook_id: str) -> list["Report"]:
        rows = await repo_query(
            "SELECT * FROM report WHERE notebook_id = $notebook_id ORDER BY updated DESC",
            {"notebook_id": notebook_id},
        )
        return [cls(**row) for row in rows or []]

    async def delete_with_children(self) -> None:
        if not self.id:
            raise InvalidInputError("Cannot delete a report without an ID")

        params = {"report_id": self.id}
        for table in (
            "report_evidence",
            "report_generation",
            "report_input",
            "report_section",
            "report_version",
        ):
            await repo_query(
                f"DELETE FROM {table} WHERE report_id = $report_id",
                params,
            )
        await self.delete()


class ReportSection(ObjectModel):
    table_name: ClassVar[str] = "report_section"

    report_id: str
    title: str
    content: str = ""
    position: int = 0
    status: Literal["draft", "generated", "edited"] = "draft"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReportInput(ObjectModel):
    table_name: ClassVar[str] = "report_input"

    report_id: str
    input_id: str
    module: str
    content_type: str
    title: str
    content: Any
    source_refs: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    content_hash: str | None = None
    source_version: str | None = None


class ReportEvidence(ObjectModel):
    table_name: ClassVar[str] = "report_evidence"

    report_id: str
    section_id: str
    input_id: str
    claim: str
    excerpt: str = ""
    location: dict[str, Any] = Field(default_factory=dict)
    support_status: EvidenceStatus = "supported"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReportVersion(ObjectModel):
    table_name: ClassVar[str] = "report_version"

    report_id: str
    version: int
    snapshot: dict[str, Any]
    change_summary: str = ""


class ReportGeneration(ObjectModel):
    table_name: ClassVar[str] = "report_generation"

    report_id: str
    status: GenerationStatus = "queued"
    config: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    result_metadata: dict[str, Any] = Field(default_factory=dict)
