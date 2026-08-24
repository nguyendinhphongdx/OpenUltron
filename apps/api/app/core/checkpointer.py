"""Checkpointer cho LangGraph pause/resume (ADR-0014, approval gate) — `AsyncPostgresSaver` tự
quản lý schema riêng của nó (`checkpoints`/`checkpoint_writes`/`checkpoint_blobs`/
`checkpoint_migrations`) qua `.setup()`, KHÔNG qua Alembic — tách biệt hoàn toàn khỏi schema
Ultron (không FK/join, driver khác — `psycopg`, không phải SQLAlchemy async engine).
"""

from contextlib import AsyncExitStack

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.core.config import settings

_exit_stack: AsyncExitStack | None = None
_checkpointer: AsyncPostgresSaver | None = None


def _psycopg_conninfo() -> str:
    # settings.database_url là dạng SQLAlchemy (`postgresql+asyncpg://...`) — psycopg cần
    # `postgresql://...` (không có `+asyncpg`).
    return settings.database_url.replace("postgresql+asyncpg://", "postgresql://")


async def init_checkpointer() -> None:
    """Gọi 1 lần lúc app khởi động (`main.py` lifespan). `.setup()` tạo bảng riêng nếu chưa có —
    an toàn gọi lại nhiều lần (idempotent, tự check `checkpoint_migrations`)."""
    global _exit_stack, _checkpointer
    _exit_stack = AsyncExitStack()
    _checkpointer = await _exit_stack.enter_async_context(
        AsyncPostgresSaver.from_conn_string(_psycopg_conninfo())
    )
    await _checkpointer.setup()


async def close_checkpointer() -> None:
    global _exit_stack, _checkpointer
    if _exit_stack is not None:
        await _exit_stack.aclose()
    _exit_stack = None
    _checkpointer = None


def get_checkpointer() -> AsyncPostgresSaver:
    if _checkpointer is None:
        raise RuntimeError("Checkpointer chưa init — gọi init_checkpointer() lúc app startup")
    return _checkpointer
