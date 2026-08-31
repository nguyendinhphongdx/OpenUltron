"""1 interface + 1 registry cho tool builder theo `Tool.kind` (ADR-0013) — cùng tinh thần
`app/core/provider_adapter.py` (ADR-0012): N cách dựng khác nhau cho cùng 1 trục cố định (`kind`),
KHÔNG dynamic plugin discovery. Thêm implementation cho 1 kind = viết/sửa 1 class + đăng ký lại
đúng key trong `TOOL_BUILDERS`, không sửa `chat/graph.py`.
"""

from __future__ import annotations

import asyncio
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, Protocol

import httpx
from langchain_core.tools import BaseTool, StructuredTool
from pydantic import BaseModel, Field, ValidationError, create_model
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.core.workspace import resolve_safe_path
from app.modules.connector import github as github_connector
from app.modules.tool.schemas import (
    HttpToolConfig,
    McpHttpServerConfig,
    McpStdioServerConfig,
    McpToolConfig,
)

_HTTP_TIMEOUT_SECONDS = 30.0
_MAX_RESPONSE_CHARS = 8000
_RUN_COMMAND_TIMEOUT_SECONDS = 30.0

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


# Slug tool cần approval gate (ADR-0014). GitHub search/read chỉ đọc, không có side-effect nên
# KHÔNG cần approval. `write-file`/`run-command`/`execute-code` (ADR-0016) có side-effect thật
# trên máy — BẮT BUỘC nằm trong tập này, không có cách nào tắt approval cho các slug đó.
APPROVAL_TEST_TOOL_SLUG = "approval-test-echo"
GITHUB_SEARCH_CODE_SLUG = "github-search-code"
GITHUB_READ_FILE_SLUG = "github-read-file"
WRITE_FILE_SLUG = "write-file"
RUN_COMMAND_SLUG = "run-command"
EXECUTE_CODE_SLUG = "execute-code"
TOOLS_REQUIRING_APPROVAL: frozenset[str] = frozenset(
    {APPROVAL_TEST_TOOL_SLUG, WRITE_FILE_SLUG, RUN_COMMAND_SLUG, EXECUTE_CODE_SLUG}
)

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
    WRITE_FILE_SLUG: (
        "Ghi nội dung vào 1 file trong workspace sandbox (ADR-0016) — cần duyệt trước khi chạy."
    ),
    RUN_COMMAND_SLUG: (
        "Chạy 1 lệnh shell trong workspace sandbox (ADR-0016) — cần duyệt trước khi chạy."
    ),
    EXECUTE_CODE_SLUG: (
        "Chạy source code Python hoặc JavaScript trong workspace sandbox (ADR-0016) — khác "
        "'run-command' ở chỗ agent tự viết code thay vì gõ 1 lệnh có sẵn. Cần duyệt trước khi chạy."
    ),
}

# Interpreter + phần mở rộng file tạm cho từng ngôn ngữ hỗ trợ — thêm ngôn ngữ mới = thêm 1 dòng ở
# đây, không sửa gì khác trong `_execute_sandboxed_code`.
_EXECUTE_CODE_INTERPRETERS: dict[str, tuple[str, str]] = {
    "python": ("python3", ".py"),
    "javascript": ("node", ".js"),
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


class _WriteFileArgs(BaseModel):
    path: str = Field(
        description="Đường dẫn file tương đối trong workspace sandbox, vd 'notes/todo.md'"
    )
    content: str = Field(description="Nội dung text ghi vào file (UTF-8)")


class _RunCommandArgs(BaseModel):
    command: str = Field(description="Lệnh shell cần chạy, vd 'ls -la'")
    cwd: str | None = Field(
        default=None,
        description="Subdirectory tương đối trong sandbox để chạy lệnh — bỏ trống dùng gốc sandbox",
    )


class _ExecuteCodeArgs(BaseModel):
    code: str = Field(description="Source code cần chạy")
    language: Literal["python", "javascript"] = Field(
        description="Ngôn ngữ của source code — 'python' hoặc 'javascript'"
    )
    cwd: str | None = Field(
        default=None,
        description="Subdirectory tương đối trong sandbox để chạy code — bỏ trống dùng gốc sandbox",
    )


async def _github_token(session: AsyncSession, tool_slug: str) -> str | None:
    from app.core.providers import get_provider_api_key

    token = await get_provider_api_key("github", session)
    if not token:
        logger.warning("tool.github_missing_credential", tool_slug=tool_slug)
    return token


class BuiltinToolBuilder:
    """Dispatch theo `spec.slug` (ADR-0013) — GitHub search/read gọi vào
    `app/modules/connector/github.py` (ADR-0015); `write-file`/`run-command` gọi vào
    `app/core/workspace.py::resolve_safe_path` (ADR-0016, sandbox 1 working directory) — không tự
    viết logic gọi API ngoài/thao tác filesystem trực tiếp ở đây."""

    async def build(self, spec: ToolSpec, *, session: AsyncSession) -> BaseTool | None:
        if spec.slug == APPROVAL_TEST_TOOL_SLUG:
            return _build_approval_test_tool(spec)
        if spec.slug == GITHUB_SEARCH_CODE_SLUG:
            return await _build_github_search_tool(spec, session)
        if spec.slug == GITHUB_READ_FILE_SLUG:
            return await _build_github_read_file_tool(spec, session)
        if spec.slug == WRITE_FILE_SLUG:
            return _build_write_file_tool(spec)
        if spec.slug == RUN_COMMAND_SLUG:
            return _build_run_command_tool(spec)
        if spec.slug == EXECUTE_CODE_SLUG:
            return _build_execute_code_tool(spec)
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


def _build_write_file_tool(spec: ToolSpec) -> BaseTool:
    async def _write_file(path: str, content: str) -> str:
        try:
            target = resolve_safe_path(path)
        except ValueError as exc:
            return str(exc)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return f"Đã ghi file '{path}' ({len(content)} ký tự)."

    return StructuredTool.from_function(
        coroutine=_write_file,
        name=spec.slug,
        description=spec.description or BUILTIN_TOOL_CATALOG[WRITE_FILE_SLUG],
        args_schema=_WriteFileArgs,
        handle_tool_error=True,
    )


def _build_run_command_tool(spec: ToolSpec) -> BaseTool:
    async def _run_command(command: str, cwd: str | None = None) -> str:
        return await _execute_sandboxed_command(command, cwd)

    return StructuredTool.from_function(
        coroutine=_run_command,
        name=spec.slug,
        description=spec.description or BUILTIN_TOOL_CATALOG[RUN_COMMAND_SLUG],
        args_schema=_RunCommandArgs,
        handle_tool_error=True,
    )


async def _execute_sandboxed_command(command: str, cwd: str | None) -> str:
    try:
        working_dir = resolve_safe_path(cwd or "")
    except ValueError as exc:
        return str(exc)
    process = await asyncio.create_subprocess_shell(
        command,
        cwd=working_dir,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    try:
        stdout, _ = await asyncio.wait_for(
            process.communicate(), timeout=_RUN_COMMAND_TIMEOUT_SECONDS
        )
    except TimeoutError:
        process.kill()
        await process.wait()
        return f"Lệnh quá thời gian cho phép ({_RUN_COMMAND_TIMEOUT_SECONDS}s), đã bị hủy."

    output = stdout.decode("utf-8", errors="replace")
    result = f"Exit code: {process.returncode}\n{output}"
    return result[:_MAX_RESPONSE_CHARS]


def _build_execute_code_tool(spec: ToolSpec) -> BaseTool:
    async def _execute_code(
        code: str, language: Literal["python", "javascript"], cwd: str | None = None
    ) -> str:
        return await _execute_sandboxed_code(code, language, cwd)

    return StructuredTool.from_function(
        coroutine=_execute_code,
        name=spec.slug,
        description=spec.description or BUILTIN_TOOL_CATALOG[EXECUTE_CODE_SLUG],
        args_schema=_ExecuteCodeArgs,
        handle_tool_error=True,
    )


async def _execute_sandboxed_code(
    code: str, language: Literal["python", "javascript"], cwd: str | None
) -> str:
    """Khác `_execute_sandboxed_command` — code ghi ra file tạm rồi chạy qua
    `create_subprocess_exec` (không qua shell) thay vì nhét thẳng vào 1 chuỗi lệnh shell, tránh
    ký tự đặc biệt trong code (quote/backtick/$...) bị shell diễn giải sai. `language` đã được
    `_ExecuteCodeArgs` (Pydantic `Literal`) validate trước khi tới đây — không cần tự check lại
    giá trị lạ, mọi lời gọi qua tool thật đều đảm bảo có mặt trong `_EXECUTE_CODE_INTERPRETERS`."""
    command, extension = _EXECUTE_CODE_INTERPRETERS[language]

    try:
        working_dir = resolve_safe_path(cwd or "")
    except ValueError as exc:
        return str(exc)

    with tempfile.NamedTemporaryFile(
        "w", suffix=extension, dir=working_dir, delete=False, encoding="utf-8"
    ) as script_file:
        script_file.write(code)
        script_path = Path(script_file.name)

    try:
        process = await asyncio.create_subprocess_exec(
            command,
            str(script_path),
            cwd=working_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        try:
            stdout, _ = await asyncio.wait_for(
                process.communicate(), timeout=_RUN_COMMAND_TIMEOUT_SECONDS
            )
        except TimeoutError:
            process.kill()
            await process.wait()
            return f"Code chạy quá thời gian cho phép ({_RUN_COMMAND_TIMEOUT_SECONDS}s), đã bị hủy."
    finally:
        script_path.unlink(missing_ok=True)

    output = stdout.decode("utf-8", errors="replace")
    result = f"Exit code: {process.returncode}\n{output}"
    return result[:_MAX_RESPONSE_CHARS]


_JSON_SCHEMA_TYPE_MAP: dict[str, Any] = {
    "string": str,
    "integer": int,
    "number": float,
    "boolean": bool,
    "array": list,
    "object": dict,
}


def _mcp_transport(server: McpStdioServerConfig | McpHttpServerConfig) -> Any:
    if server.transport == "stdio":
        from mcp import StdioServerParameters
        from mcp.client.stdio import stdio_client

        return stdio_client(StdioServerParameters(command=server.command, args=server.args))
    return server.url


def _args_schema_from_json_schema(name: str, input_schema: dict[str, Any]) -> type[BaseModel]:
    """Convert JSON Schema thật của remote tool (`list_tools()`, ADR-0017) sang pydantic model —
    KHÔNG bắt user tự khai lại như `kind=http`'s `ai_params`, MCP server đã tự chuẩn hoá schema."""
    properties: dict[str, Any] = input_schema.get("properties", {})
    required: set[str] = set(input_schema.get("required", []))
    fields: dict[str, Any] = {}
    for prop_name, prop_schema in properties.items():
        python_type = _JSON_SCHEMA_TYPE_MAP.get(prop_schema.get("type"), Any)
        description = prop_schema.get("description", "")
        if prop_name in required:
            fields[prop_name] = (python_type, Field(description=description))
        else:
            fields[prop_name] = (python_type | None, Field(default=None, description=description))
    return create_model(f"{name}_mcp_args", **fields)


class McpToolBuilder:
    """`kind=mcp` (ADR-0017) — connect tới MCP server thật qua SDK chính thức (`mcp` package),
    discover args schema qua `list_tools()`, gọi `call_tool()` khi agent invoke. Không giữ session
    xuyên nhiều lần gọi — connect mới mỗi lần, cùng tinh thần `HttpToolBuilder`."""

    async def build(self, spec: ToolSpec, *, session: AsyncSession) -> BaseTool | None:
        from mcp import Client

        try:
            config = McpToolConfig.model_validate(spec.config or {})
        except ValidationError as exc:
            logger.warning("tool.mcp_build_invalid_config", tool_slug=spec.slug, error=str(exc))
            return None

        try:
            async with Client(_mcp_transport(config.server)) as client:
                remote_tools = await client.list_tools()
        except Exception as exc:  # noqa: BLE001 — server ngoài, mọi lỗi kết nối đều hợp lệ ở đây
            logger.warning("tool.mcp_server_unreachable", tool_slug=spec.slug, error=str(exc))
            return None

        remote_tool = next(
            (t for t in remote_tools.tools if t.name == config.remote_tool_name), None
        )
        if remote_tool is None:
            logger.warning(
                "tool.mcp_remote_tool_not_found",
                tool_slug=spec.slug,
                remote_tool_name=config.remote_tool_name,
            )
            return None

        args_schema = _args_schema_from_json_schema(spec.slug, remote_tool.input_schema)

        async def _call(**kwargs: Any) -> str:
            return await _call_mcp_tool(config, kwargs)

        return StructuredTool.from_function(
            coroutine=_call,
            name=spec.slug,
            description=spec.description or remote_tool.description or spec.name,
            args_schema=args_schema,
            handle_tool_error=True,
        )


async def _call_mcp_tool(config: McpToolConfig, params: dict[str, Any]) -> str:
    from mcp import Client

    try:
        async with Client(_mcp_transport(config.server)) as client:
            result = await client.call_tool(config.remote_tool_name, params)
    except Exception as exc:  # noqa: BLE001 — server ngoài, trả lỗi rõ thay vì crash turn
        return f"Không gọi được MCP tool '{config.remote_tool_name}': {exc}"

    if result.is_error:
        return f"MCP tool '{config.remote_tool_name}' lỗi: {result.content}"
    output = str(result.structured_content) if result.structured_content else str(result.content)
    return output[:_MAX_RESPONSE_CHARS]


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
