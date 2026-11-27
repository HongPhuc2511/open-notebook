"""Extensible integration contract for report input providers."""
from abc import ABC, abstractmethod
from typing import Any


class ReportInputAdapter(ABC):
    @property
    @abstractmethod
    def module_id(self) -> str:
        raise NotImplementedError

    @abstractmethod
    async def collect(
        self, notebook_id: str, config: dict[str, Any]
    ) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def get_input(self, input_id: str) -> dict[str, Any] | None:
        raise NotImplementedError


class ReportInputRegistry:
    def __init__(self) -> None:
        self._adapters: dict[str, ReportInputAdapter] = {}

    def register(self, adapter: ReportInputAdapter) -> None:
        module_id = adapter.module_id.strip()
        if not module_id:
            raise ValueError("Adapter module_id cannot be empty")
        if module_id in self._adapters:
            raise ValueError(f"Adapter already registered: {module_id}")
        self._adapters[module_id] = adapter

    def get(self, module_id: str) -> ReportInputAdapter | None:
        return self._adapters.get(module_id)

    def list_modules(self) -> list[str]:
        return sorted(self._adapters)


report_input_registry = ReportInputRegistry()
