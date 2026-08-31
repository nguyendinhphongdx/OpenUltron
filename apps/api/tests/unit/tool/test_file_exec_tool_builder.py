from pathlib import Path

import pytest

import app.modules.tool.builder as builder_module
from app.modules.tool.builder import (
    EXECUTE_CODE_SLUG,
    RUN_COMMAND_SLUG,
    TOOLS_REQUIRING_APPROVAL,
    WRITE_FILE_SLUG,
    BuiltinToolBuilder,
    ToolSpec,
)


def _make_spec(slug: str) -> ToolSpec:
    return ToolSpec(id=1, slug=slug, name=slug, description=None, kind="builtin", config=None)


def test_write_file_run_command_and_execute_code_require_approval() -> None:
    assert WRITE_FILE_SLUG in TOOLS_REQUIRING_APPROVAL
    assert RUN_COMMAND_SLUG in TOOLS_REQUIRING_APPROVAL
    assert EXECUTE_CODE_SLUG in TOOLS_REQUIRING_APPROVAL


@pytest.mark.asyncio
async def test_write_file_tool_writes_content_inside_sandbox(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(builder_module, "resolve_safe_path", lambda p: tmp_path / p)

    tool = await BuiltinToolBuilder().build(_make_spec(WRITE_FILE_SLUG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"path": "notes/hello.txt", "content": "hi there"})

    written = tmp_path / "notes" / "hello.txt"
    assert written.read_text(encoding="utf-8") == "hi there"
    assert "notes/hello.txt" in result


@pytest.mark.asyncio
async def test_write_file_tool_rejects_path_traversal(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_resolve(p: str) -> Path:
        raise ValueError("Path thoát ra ngoài workspace sandbox — không được phép.")

    monkeypatch.setattr(builder_module, "resolve_safe_path", fake_resolve)

    tool = await BuiltinToolBuilder().build(_make_spec(WRITE_FILE_SLUG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"path": "../../etc/passwd", "content": "x"})

    assert "thoát ra ngoài" in result


@pytest.mark.asyncio
async def test_run_command_tool_returns_exit_code_and_output(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(builder_module, "resolve_safe_path", lambda p: tmp_path)

    tool = await BuiltinToolBuilder().build(_make_spec(RUN_COMMAND_SLUG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"command": "echo hello-world"})

    assert "Exit code: 0" in result
    assert "hello-world" in result


@pytest.mark.asyncio
async def test_run_command_tool_kills_process_on_timeout(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(builder_module, "resolve_safe_path", lambda p: tmp_path)
    monkeypatch.setattr(builder_module, "_RUN_COMMAND_TIMEOUT_SECONDS", 0.05)

    tool = await BuiltinToolBuilder().build(_make_spec(RUN_COMMAND_SLUG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"command": "sleep 5"})

    assert "quá thời gian" in result


@pytest.mark.asyncio
async def test_execute_code_tool_runs_python(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(builder_module, "resolve_safe_path", lambda p: tmp_path)

    tool = await BuiltinToolBuilder().build(_make_spec(EXECUTE_CODE_SLUG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"code": "print('hello-from-python')", "language": "python"})

    assert "Exit code: 0" in result
    assert "hello-from-python" in result


@pytest.mark.asyncio
async def test_execute_code_tool_runs_javascript(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(builder_module, "resolve_safe_path", lambda p: tmp_path)

    tool = await BuiltinToolBuilder().build(_make_spec(EXECUTE_CODE_SLUG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"code": "console.log('hello-from-js')", "language": "javascript"})

    assert "Exit code: 0" in result
    assert "hello-from-js" in result


@pytest.mark.asyncio
async def test_execute_sandboxed_code_rejects_unsupported_language(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Đi thẳng vào helper (không qua `tool.ainvoke`) — args_schema đã ràng buộc
    # `Literal["python", "javascript"]` nên LangChain chặn "ruby" từ tầng validate trước khi tới
    # được nhánh này; check này là lưới an toàn phòng `_EXECUTE_CODE_INTERPRETERS` lệch khỏi
    # `_ExecuteCodeArgs.language` trong tương lai.
    monkeypatch.setattr(builder_module, "resolve_safe_path", lambda p: tmp_path)

    result = await builder_module._execute_sandboxed_code("puts 'hi'", "ruby", None)

    assert "chưa được hỗ trợ" in result


@pytest.mark.asyncio
async def test_execute_code_tool_kills_process_on_timeout(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(builder_module, "resolve_safe_path", lambda p: tmp_path)
    monkeypatch.setattr(builder_module, "_RUN_COMMAND_TIMEOUT_SECONDS", 0.05)

    tool = await BuiltinToolBuilder().build(_make_spec(EXECUTE_CODE_SLUG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"code": "import time\ntime.sleep(5)", "language": "python"})

    assert "quá thời gian" in result
