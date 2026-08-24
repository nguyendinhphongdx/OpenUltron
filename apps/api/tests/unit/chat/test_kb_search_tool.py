from dataclasses import dataclass

import pytest

from app.modules.chat.graph import KnowledgeBaseSpec, _build_kb_search_tool
from app.modules.knowledge_base.service import KnowledgeBaseService


@dataclass
class FakeChunk:
    content: str


@dataclass
class FakeSearchResult:
    chunk: FakeChunk
    score: float


def _spec() -> KnowledgeBaseSpec:
    return KnowledgeBaseSpec(
        id=7, slug="product-docs", name="Product Docs", description="Tài liệu sản phẩm"
    )


@pytest.mark.asyncio
async def test_kb_search_tool_calls_service_with_correct_kb_id_and_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    async def fake_search(self: KnowledgeBaseService, kb_id: int, query: str, top_k: int) -> list:
        captured["kb_id"] = kb_id
        captured["query"] = query
        captured["top_k"] = top_k
        return [FakeSearchResult(chunk=FakeChunk(content="Đoạn tài liệu liên quan"), score=0.1)]

    monkeypatch.setattr(KnowledgeBaseService, "search", fake_search)

    kb_tool = _build_kb_search_tool(_spec(), session=None)  # type: ignore[arg-type]
    assert kb_tool.name == "search-knowledge-base-product-docs"

    result = await kb_tool.ainvoke({"query": "giá sản phẩm"})

    assert captured["kb_id"] == 7
    assert captured["query"] == "giá sản phẩm"
    assert "Đoạn tài liệu liên quan" in result


@pytest.mark.asyncio
async def test_kb_search_tool_returns_clear_message_when_no_results(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_search(self: KnowledgeBaseService, kb_id: int, query: str, top_k: int) -> list:
        return []

    monkeypatch.setattr(KnowledgeBaseService, "search", fake_search)

    kb_tool = _build_kb_search_tool(_spec(), session=None)  # type: ignore[arg-type]

    result = await kb_tool.ainvoke({"query": "không tồn tại"})

    assert "Không tìm thấy" in result


def test_kb_search_tool_description_includes_name_and_description() -> None:
    kb_tool = _build_kb_search_tool(_spec(), session=None)  # type: ignore[arg-type]

    assert "Product Docs" in kb_tool.description
    assert "Tài liệu sản phẩm" in kb_tool.description
