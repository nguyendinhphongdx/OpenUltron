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
from pydantic import Field, ValidationError, create_model

from app.core.logging import logger
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
    def build(self, spec: ToolSpec) -> BaseTool | None: ...


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

    def build(self, spec: ToolSpec) -> BaseTool | None:
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
# thật qua UI trước khi có builtin tool nguy hiểm thật (roadmap riêng: GitHub search/read, tạo
# file/thực thi lệnh máy). Thêm slug vào đây khi có tool thật cần duyệt trước khi chạy.
APPROVAL_TEST_TOOL_SLUG = "approval-test-echo"
TOOLS_REQUIRING_APPROVAL: frozenset[str] = frozenset({APPROVAL_TEST_TOOL_SLUG})


class BuiltinToolBuilder:
    """Chỗ đứng kiến trúc — chưa có builtin tool thật nào ở bản này (roadmap riêng), NGOẠI TRỪ 1
    tool test cho approval gate (ADR-0014, `APPROVAL_TEST_TOOL_SLUG`) — echo lại argument, không
    làm gì thật, chỉ để verify pause/resume qua UI."""

    def build(self, spec: ToolSpec) -> BaseTool | None:
        if spec.slug != APPROVAL_TEST_TOOL_SLUG:
            return None

        async def _echo(action: str) -> str:
            return f"[approval-test] đã 'thực thi' (giả, không làm gì thật): {action}"

        return StructuredTool.from_function(
            coroutine=_echo,
            name=spec.slug,
            description=spec.description
            or "Test tool cho approval gate (ADR-0014) — không làm gì thật, chỉ echo lại argument.",
            handle_tool_error=True,
        )


class McpToolBuilder:
    """`kind=mcp` — chưa implement (Non-goals của spec, roadmap riêng)."""

    def build(self, spec: ToolSpec) -> BaseTool | None:
        return None


TOOL_BUILDERS: dict[str, ToolBuilder] = {
    "http": HttpToolBuilder(),
    "builtin": BuiltinToolBuilder(),
    "mcp": McpToolBuilder(),
}


def build_tools(specs: list[ToolSpec]) -> list[BaseTool]:
    """Build tool thật cho từng `ToolSpec` — kind không có builder/`build()` trả `None` → log
    warning + bỏ qua, KHÔNG raise (agent vẫn chat được bình thường dù thiếu 1 tool)."""
    tools: list[BaseTool] = []
    for spec in specs:
        builder = TOOL_BUILDERS.get(spec.kind)
        if builder is None:
            logger.warning("tool.build_unknown_kind", tool_slug=spec.slug, kind=spec.kind)
            continue
        tool = builder.build(spec)
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
