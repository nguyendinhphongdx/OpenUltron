"""Sandbox 1 working directory cho builtin tool `write-file`/`run-command` (ADR-0016) — mọi path
agent đưa vào phải resolve qua `resolve_safe_path`, KHÔNG có cách nào khác để builtin tool ghi
file/chạy lệnh ngoài phạm vi `WORKSPACE_ROOT`. Đây là điểm chịu trách nhiệm path-safety DUY NHẤT —
builtin tool mới chạm filesystem phải gọi qua hàm này, không tự resolve path riêng.
"""

from pathlib import Path

from app.core.config import settings

WORKSPACE_ROOT = Path(settings.workspace_dir).resolve()
WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)


def resolve_safe_path(relative_path: str) -> Path:
    """Join `relative_path` vào `WORKSPACE_ROOT` rồi validate kết quả không thoát ra ngoài sandbox
    (chặn `../../etc/passwd`, absolute path lạ...). Raise `ValueError` rõ ràng nếu vi phạm — builtin
    tool gọi hàm này phải để lỗi propagate lên (LangChain `handle_tool_error=True` sẽ trả lại agent
    dưới dạng lỗi tool, không crash turn)."""
    candidate = (WORKSPACE_ROOT / relative_path).resolve()
    if not candidate.is_relative_to(WORKSPACE_ROOT):
        raise ValueError(
            f"Path '{relative_path}' thoát ra ngoài workspace sandbox — không được phép."
        )
    return candidate
