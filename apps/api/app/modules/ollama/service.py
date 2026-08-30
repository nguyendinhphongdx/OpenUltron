import json
from collections.abc import AsyncIterator

import httpx

from app.core.config import settings
from app.core.errors import ModelProviderError
from app.core.logging import logger
from app.modules.ollama.catalog import CATALOG, OllamaCatalogEntry
from app.modules.ollama.schemas import OllamaInstalledModel, OllamaPullEvent


class OllamaService:
    """Proxy tới Ollama local (ADR-0011) — không có bảng DB riêng, giống tiền lệ module `voice`
    (ADR-0009): chỉ relay, không tự lưu gì mới."""

    def catalog(self) -> list[OllamaCatalogEntry]:
        return CATALOG

    async def list_installed(self) -> list[OllamaInstalledModel]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{settings.ollama_base_url}/api/tags")
                response.raise_for_status()
        except httpx.HTTPError as exc:
            # Không phải luồng SSE (khác `pull()`, response JSON thường chưa gửi status cho
            # client) — raise UltronError bình thường, exception handler map sang HTTP như mọi
            # service khác (04-error-handling.md).
            raise ModelProviderError(
                f"Không gọi được Ollama tại {settings.ollama_base_url}: {exc}"
            ) from exc
        return [
            OllamaInstalledModel(name=m["name"], size_bytes=m.get("size"))
            for m in response.json().get("models", [])
        ]

    async def pull(self, model: str) -> AsyncIterator[OllamaPullEvent]:
        """Gọi Ollama `POST /api/pull`, forward từng NDJSON line thành `OllamaPullEvent`.

        Không catch exception ở đây — để `router.py` (SSE endpoint) tự quyết cách báo lỗi cho
        client (bản thân 1 lỗi network là thông tin cần lộ ra, không phải nuốt lặng lẽ)."""
        logger.info("ollama.pull_started", model=model)
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST", f"{settings.ollama_base_url}/api/pull", json={"name": model, "stream": True}
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    raw = json.loads(line)
                    yield OllamaPullEvent(
                        status=raw.get("status", ""),
                        completed=raw.get("completed"),
                        total=raw.get("total"),
                        error=raw.get("error"),
                    )
        logger.info("ollama.pull_completed", model=model)
