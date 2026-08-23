import asyncio
import json
from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.core.logging import logger
from app.modules.ollama.catalog import OllamaCatalogEntry
from app.modules.ollama.deps import OllamaServiceDep
from app.modules.ollama.schemas import OllamaInstalledModel

router = APIRouter(prefix="/ollama", tags=["ollama"])


@router.get("/catalog", response_model=list[OllamaCatalogEntry])
async def get_catalog(service: OllamaServiceDep) -> list[OllamaCatalogEntry]:
    return service.catalog()


@router.get("/installed", response_model=list[OllamaInstalledModel])
async def list_installed(service: OllamaServiceDep) -> list[OllamaInstalledModel]:
    return await service.list_installed()


@router.get("/pull")
async def pull_model(
    model: Annotated[str, Query(min_length=1)], service: OllamaServiceDep
) -> StreamingResponse:
    """SSE — `GET` vì `EventSource` (browser API dùng ở `apps/web`) chỉ hỗ trợ GET (ADR-0011).
    Không raise HTTPException khi lỗi — connection SSE đã mở, lỗi phải đi qua chính stream đó
    thành 1 event `status: "error"`, không phải response lỗi HTTP riêng."""

    async def event_stream():
        try:
            async for event in service.pull(model):
                yield f"data: {event.model_dump_json()}\n\n"
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("ollama.pull_failed", model=model, exc_info=exc)
            yield f"data: {json.dumps({'status': 'error', 'error': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
