"""1 interface + 1 registry cho tool builder theo `Tool.kind` (ADR-0013) — cùng tinh thần
`app/core/provider_adapter.py` (ADR-0012): N cách dựng khác nhau cho cùng 1 trục cố định (`kind`),
KHÔNG dynamic plugin discovery. Thêm implementation cho 1 kind = viết/sửa 1 class + đăng ký lại
đúng key trong `TOOL_BUILDERS`, không sửa `chat/graph.py`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import httpx
from langchain_core.tools import BaseTool, StructuredTool
from pydantic import BaseModel, Field, ValidationError, create_model
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.modules.connector import github as github_connector
from app.modules.tool.schemas import HttpToolConfig

_HTTP_TIMEOUT_SECONDS = 30.0
_MAX_RESPONSE_CHARS = 8000

_TYPE_MAP: dict[str, Any] = {
    "string": str,
    "number": float,
    "boolean": bool,
    "json": Any,
}


@dataclass
class ToolSpec:
    """DTO thuần — tách graph khỏi ORM `Tool` (cùng tinh thần `ModelConfig`/`SubAgentSpec`,
    `chat/graph.py`)."""

    id: int
    slug: str
    name: str
    description: str | None
    kind: str
    config: dict[str, Any] | None


class ToolBuilder(Protocol):
    async def build(self, spec: ToolSpec, *, session: AsyncSession) -> BaseTool | None: ...


def _substitute(value: str, params: dict[str, Any]) -> str:
    for name, param_value in params.items():
        value = value.replace(f"{{{{{name}}}}}", str(param_value))
    return value


def _substitute_body(body: Any, params: dict[str, Any]) -> Any:
    if isinstance(body, dict):
        return {key: _substitute_body(value, params) for key, value in body.items()}
    if isinstance(body, list):
        return [_substitute_body(item, params) for item in body]
    if isinstance(body, str):
        return _substitute(body, params)
    return body


class HttpToolBuilder:
    """`kind=http` — user tự khai 1 HTTP endpoint qua UI (ADR-0013), không viết code."""

    async def build(self, spec: ToolSpec, *, session: AsyncSession) -> BaseTool | None:
        try:
            config = HttpToolConfig.model_validate(spec.config or {})
        except ValidationError as exc:
            # Phòng thủ — config đã validate lúc tạo/sửa (`tool/service.py`), lỗi ở đây nghĩa là
            # data cũ/hỏng, không crash graph.
            logger.warning("tool.http_build_invalid_config", tool_slug=spec.slug, error=str(exc))
            return None

        args_schema = create_model(
            f"{spec.slug}_args",
            **{
                param.name: (_TYPE_MAP[param.type], Field(description=param.description))
                for param in config.ai_params
            },
        )

        async def _call(**kwargs: Any) -> str:
            return await _execute_http_tool(config, kwargs)

        return StructuredTool.from_function(
            coroutine=_call,
            name=spec.slug,
            description=spec.description or spec.name,
            args_schema=args_schema,
            handle_tool_error=True,
        )


# Slug tool cần approval gate (ADR-0014) — hiện chỉ có 1 tool test để verify cơ chế pause/resume
# thật qua UI trước khi có builtin tool nguy hiểm thật (roadmap riêng: tạo file/thực thi lệnh
# máy). GitHub search/read chỉ đọc, không có side-effect nên KHÔNG cần approval. Thêm slug vào đây
# khi có tool thật cần duyệt trước khi chạy.
APPROVAL_TEST_TOOL_SLUG = "approval-test-echo"
GITHUB_SEARCH_CODE_SLUG = "github-search-code"
GITHUB_READ_FILE_SLUG = "github-read-file"
TOOLS_REQUIRING_APPROVAL: frozenset[str] = frozenset({APPROVAL_TEST_TOOL_SLUG})

# Catalog builtin tool có sẵn — nguồn cho endpoint `GET /tools/builtin-catalog` (fix UX: form tạo
# tool `kind=builtin` trước đây không hiện gì để chọn). Thêm builtin tool mới = thêm 1 entry ở đây
# + 1 nhánh dispatch trong `BuiltinToolBuilder.build`.
BUILTIN_TOOL_CATALOG: dict[str, str] = {
    APPROVAL_TEST_TOOL_SLUG: (
        "Test tool cho approval gate (ADR-0014) — không làm gì thật, chỉ echo lại argument."
    ),
    GITHUB_SEARCH_CODE_SLUG: (
        "Tìm code trên GitHub qua GitHub Search API — cần credential 'github' (ADR-0015)."
    ),
    GITHUB_READ_FILE_SLUG: (
        "Đọc nội dung 1 file trên GitHub theo owner/repo/path — cần credential 'github' (ADR-0015)."
    ),
}


class _GitHubSearchArgs(BaseModel):
    query: str = Field(description="Từ khoá tìm kiếm code trên GitHub")
    repo: str | None = Field(
        default=None, description="Giới hạn tìm trong 1 repo, dạng 'owner/repo'"
    )


class _GitHubReadFileArgs(BaseModel):
    owner: str = Field(description="Tên owner/organization trên GitHub")
    repo: str = Field(description="Tên repository")
    path: str = Field(description="Đường dẫn file trong repo, vd 'src/main.py'")
    ref: str | None = Field(
        default=None, description="Branch/tag/commit SHA — bỏ trống dùng default branch"
    )


async def _github_token(session: AsyncSession, tool_slug: str) -> str | None:
    from app.core.providers import get_provider_api_key

    token = await get_provider_api_key("github", session)
    if not token:
        logger.warning("tool.github_missing_credential", tool_slug=tool_slug)
    return token


class BuiltinToolBuilder:
    """Dispatch theo `spec.slug` (ADR-0013) — mỗi builtin tool thật (GitHub search/read) chỉ gọi
    vào `app/modules/connector/github.py` (ADR-0015), không tự viết logic gọi GitHub API ở đây."""

    async def build(self, spec: ToolSpec, *, session: AsyncSession) -> BaseTool | None:
        if spec.slug == APPROVAL_TEST_TOOL_SLUG:
            return _build_approval_test_tool(spec)
        if spec.slug == GITHUB_SEARCH_CODE_SLUG:
            return await _build_github_search_tool(spec, session)
        if spec.slug == GITHUB_READ_FILE_SLUG:
            return await _build_github_read_file_tool(spec, session)
        return None


def _build_approval_test_tool(spec: ToolSpec) -> BaseTool:
    async def _echo(action: str) -> str:
        return f"[approval-test] đã 'thực thi' (giả, không làm gì thật): {action}"

    return StructuredTool.from_function(
        coroutine=_echo,
        name=spec.slug,
        description=spec.description or BUILTIN_TOOL_CATALOG[APPROVAL_TEST_TOOL_SLUG],
        handle_tool_error=True,
    )


async def _build_github_search_tool(spec: ToolSpec, session: AsyncSession) -> BaseTool | None:
    token = await _github_token(session, spec.slug)
    if not token:
        return None

    async def _search(query: str, repo: str | None = None) -> str:
        return await github_connector.search_code(token, query, repo)

    return StructuredTool.from_function(
        coroutine=_search,
        name=spec.slug,
        description=spec.description or BUILTIN_TOOL_CATALOG[GITHUB_SEARCH_CODE_SLUG],
        args_schema=_GitHubSearchArgs,
        handle_tool_error=True,
    )


async def _build_github_read_file_tool(spec: ToolSpec, session: AsyncSession) -> BaseTool | None:
    token = await _github_token(session, spec.slug)
    if not token:
        return None

    async def _read_file(owner: str, repo: str, path: str, ref: str | None = None) -> str:
        return await github_connector.read_file(token, owner, repo, path, ref)

    return StructuredTool.from_function(
        coroutine=_read_file,
        name=spec.slug,
        description=spec.description or BUILTIN_TOOL_CATALOG[GITHUB_READ_FILE_SLUG],
        args_schema=_GitHubReadFileArgs,
        handle_tool_error=True,
    )


class McpToolBuilder:
    """`kind=mcp` — chưa implement (Non-goals của spec, roadmap riêng)."""

    async def build(self, spec: ToolSpec, *, session: AsyncSession) -> BaseTool | None:
        return None


TOOL_BUILDERS: dict[str, ToolBuilder] = {
    "http": HttpToolBuilder(),
    "builtin": BuiltinToolBuilder(),
    "mcp": McpToolBuilder(),
}


async def build_tools(specs: list[ToolSpec], *, session: AsyncSession) -> list[BaseTool]:
    """Build tool thật cho từng `ToolSpec` — kind không có builder/`build()` trả `None` → log
    warning + bỏ qua, KHÔNG raise (agent vẫn chat được bình thường dù thiếu 1 tool). `session`
    dùng để tra credential (vd token GitHub, ADR-0015) khi builtin tool cần — cùng lối
    `build_chat_model(..., session=session)`."""
    tools: list[BaseTool] = []
    for spec in specs:
        builder = TOOL_BUILDERS.get(spec.kind)
        if builder is None:
            logger.warning("tool.build_unknown_kind", tool_slug=spec.slug, kind=spec.kind)
            continue
        tool = await builder.build(spec, session=session)
        if tool is None:
            logger.warning("tool.build_skipped", tool_slug=spec.slug, kind=spec.kind)
            continue
        tools.append(tool)
    return tools


async def _execute_http_tool(config: HttpToolConfig, params: dict[str, Any]) -> str:
    request = config.request
    headers = {kv.name: _substitute(kv.value, params) for kv in request.headers}
    query = {kv.name: _substitute(kv.value, params) for kv in request.query}
    body = _substitute_body(request.body, params) if request.body is not None else None

    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT_SECONDS) as client:
        response = await client.request(
            request.method, request.url, headers=headers, params=query, json=body
        )

    try:
        text = response.content.decode("utf-8")
    except UnicodeDecodeError:
        return "Tool trả về nội dung binary, không đọc được (không phải JSON/text UTF-8)."

    try:
        result: Any = response.json()
        result_text = str(result)
    except ValueError:
        result_text = text

    return result_text[:_MAX_RESPONSE_CHARS]
