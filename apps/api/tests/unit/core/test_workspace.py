from pathlib import Path

import pytest

from app.core import workspace


def test_resolve_safe_path_returns_path_inside_root(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(workspace, "WORKSPACE_ROOT", tmp_path)

    resolved = workspace.resolve_safe_path("notes/todo.md")

    assert resolved == (tmp_path / "notes" / "todo.md").resolve()


def test_resolve_safe_path_empty_string_returns_root(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(workspace, "WORKSPACE_ROOT", tmp_path)

    assert workspace.resolve_safe_path("") == tmp_path.resolve()


def test_resolve_safe_path_rejects_parent_traversal(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(workspace, "WORKSPACE_ROOT", tmp_path)

    with pytest.raises(ValueError, match="thoát ra ngoài"):
        workspace.resolve_safe_path("../../etc/passwd")


def test_resolve_safe_path_rejects_absolute_path_outside_root(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(workspace, "WORKSPACE_ROOT", tmp_path)

    with pytest.raises(ValueError, match="thoát ra ngoài"):
        workspace.resolve_safe_path("/etc/passwd")
