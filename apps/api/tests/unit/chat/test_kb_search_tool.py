from dataclasses import dataclass

import pytest

from app.modules.chat.graph import KnowledgeBaseSpec, _build_kb_search_tool
from app.modules.knowledge_base.service import KnowledgeBaseService


@dataclass
class FakeChunk:
    id: int
    content: str
    file_id: int | None = None


@dataclass
class FakeSearchResult:
    chunk: FakeChunk
    score: float
    file_name: str | None = None


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
        return [
            FakeSearchResult(
                chunk=FakeChunk(id=1, content="Đoạn tài liệu liên quan", file_id=42),
                score=0.1,
                file_name="giá.pdf",
            )
        ]

    monkeypatch.setattr(KnowledgeBaseService, "search", fake_search)

    sources: list[dict] = []
    kb_tool = _build_kb_search_tool(_spec(), session=None, sources=sources)  # type: ignore[arg-type]
    assert kb_tool.name == "search-knowledge-base-product-docs"

    result = await kb_tool.ainvoke({"query": "giá sản phẩm"})

    assert captured["kb_id"] == 7
    assert captured["query"] == "giá sản phẩm"
    assert "Đoạn tài liệu liên quan" in result
    assert '<source id="1">' in result
    assert sources == [
        {
            "id": 1,
            "kb_id": 7,
            "kb_name": "Product Docs",
            "file_id": 42,
            "file_name": "giá.pdf",
            "chunk_id": 1,
            "snippet": "Đoạn tài liệu liên quan",
            "score": 0.1,
        }
    ]


@pytest.mark.asyncio
async def test_kb_search_tool_ids_continue_across_multiple_calls_in_same_turn(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_search(self: KnowledgeBaseService, kb_id: int, query: str, top_k: int) -> list:
        return [FakeSearchResult(chunk=FakeChunk(id=99, content="Nội dung"), score=0.2)]

    monkeypatch.setattr(KnowledgeBaseService, "search", fake_search)

    sources: list[dict] = []
    kb_tool = _build_kb_search_tool(_spec(), session=None, sources=sources)  # type: ignore[arg-type]

    first = await kb_tool.ainvoke({"query": "lần 1"})
    second = await kb_tool.ainvoke({"query": "lần 2"})

    assert '<source id="1">' in first
    assert '<source id="2">' in second
    assert [s["id"] for s in sources] == [1, 2]


@pytest.mark.asyncio
async def test_kb_search_tool_returns_clear_message_when_no_results(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_search(self: KnowledgeBaseService, kb_id: int, query: str, top_k: int) -> list:
        return []

    monkeypatch.setattr(KnowledgeBaseService, "search", fake_search)

    kb_tool = _build_kb_search_tool(_spec(), session=None, sources=[])  # type: ignore[arg-type]

    result = await kb_tool.ainvoke({"query": "không tồn tại"})

    assert "Không tìm thấy" in result


def test_kb_search_tool_description_includes_name_and_description() -> None:
    kb_tool = _build_kb_search_tool(_spec(), session=None, sources=[])  # type: ignore[arg-type]

    assert "Product Docs" in kb_tool.description
    assert "Tài liệu sản phẩm" in kb_tool.description
