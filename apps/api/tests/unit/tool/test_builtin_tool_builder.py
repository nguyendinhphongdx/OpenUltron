import pytest

from app.modules.tool.builder import (
    GITHUB_READ_FILE_SLUG,
    GITHUB_SEARCH_CODE_SLUG,
    SSH_EXECUTE_SLUG,
    BuiltinToolBuilder,
    ToolSpec,
)


def _make_spec(slug: str) -> ToolSpec:
    return ToolSpec(id=1, slug=slug, name=slug, description=None, kind="builtin", config=None)


@pytest.mark.asyncio
async def test_github_search_tool_skipped_when_no_credential(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_get_provider_api_key(provider: str, session: object) -> str | None:
        return None

    monkeypatch.setattr("app.core.providers.get_provider_api_key", fake_get_provider_api_key)

    tool = await BuiltinToolBuilder().build(_make_spec(GITHUB_SEARCH_CODE_SLUG), session=None)  # type: ignore[arg-type]

    assert tool is None


@pytest.mark.asyncio
async def test_github_search_tool_calls_connector_with_stored_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    async def fake_get_provider_api_key(provider: str, session: object) -> str | None:
        assert provider == "github"
        return "ghp_stored_token"

    async def fake_search_code(token: str, query: str, repo: str | None = None) -> str:
        captured["token"] = token
        captured["query"] = query
        captured["repo"] = repo
        return "- owner/repo: path/to/file.py"

    monkeypatch.setattr("app.core.providers.get_provider_api_key", fake_get_provider_api_key)
    import app.modules.tool.builder as builder_module

    monkeypatch.setattr(builder_module.github_connector, "search_code", fake_search_code)

    tool = await BuiltinToolBuilder().build(_make_spec(GITHUB_SEARCH_CODE_SLUG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"query": "def foo", "repo": "owner/repo"})

    assert captured == {"token": "ghp_stored_token", "query": "def foo", "repo": "owner/repo"}
    assert "path/to/file.py" in result


@pytest.mark.asyncio
async def test_github_read_file_tool_calls_connector_with_stored_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    async def fake_get_provider_api_key(provider: str, session: object) -> str | None:
        return "ghp_stored_token"

    async def fake_read_file(
        token: str, owner: str, repo: str, path: str, ref: str | None = None
    ) -> str:
        captured.update(token=token, owner=owner, repo=repo, path=path, ref=ref)
        return "print('hi')"

    monkeypatch.setattr("app.core.providers.get_provider_api_key", fake_get_provider_api_key)
    import app.modules.tool.builder as builder_module

    monkeypatch.setattr(builder_module.github_connector, "read_file", fake_read_file)

    tool = await BuiltinToolBuilder().build(_make_spec(GITHUB_READ_FILE_SLUG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"owner": "octocat", "repo": "hello-world", "path": "main.py"})

    assert captured == {
        "token": "ghp_stored_token",
        "owner": "octocat",
        "repo": "hello-world",
        "path": "main.py",
        "ref": None,
    }
    assert "print" in result


@pytest.mark.asyncio
async def test_ssh_execute_tool_skipped_when_no_credential(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_provider_api_key(provider: str, session: object) -> str | None:
        return None

    monkeypatch.setattr("app.core.providers.get_provider_api_key", fake_get_provider_api_key)

    tool = await BuiltinToolBuilder().build(_make_spec(SSH_EXECUTE_SLUG), session=None)  # type: ignore[arg-type]

    assert tool is None


@pytest.mark.asyncio
async def test_ssh_execute_tool_calls_connector_with_stored_key_and_passphrase(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    async def fake_get_provider_api_key(provider: str, session: object) -> str | None:
        assert provider == "ssh"
        return "-----BEGIN OPENSSH PRIVATE KEY-----\nfake-key\n-----END KEY-----"

    async def fake_get_provider_passphrase(provider: str, session: object) -> str | None:
        assert provider == "ssh"
        return "hunter2"

    async def fake_execute_command(
        private_key: str,
        host: str,
        port: int,
        username: str,
        command: str,
        *,
        passphrase: str | None = None,
    ) -> str:
        captured.update(
            private_key=private_key,
            host=host,
            port=port,
            username=username,
            command=command,
            passphrase=passphrase,
        )
        return "Exit code: 0\nhello from remote"

    monkeypatch.setattr("app.core.providers.get_provider_api_key", fake_get_provider_api_key)
    monkeypatch.setattr("app.core.providers.get_provider_passphrase", fake_get_provider_passphrase)
    import app.modules.tool.builder as builder_module

    monkeypatch.setattr(builder_module.ssh_connector, "execute_command", fake_execute_command)

    tool = await BuiltinToolBuilder().build(_make_spec(SSH_EXECUTE_SLUG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"host": "10.0.0.5", "username": "deploy", "command": "uptime"})

    assert captured == {
        "private_key": "-----BEGIN OPENSSH PRIVATE KEY-----\nfake-key\n-----END KEY-----",
        "host": "10.0.0.5",
        "port": 22,
        "username": "deploy",
        "command": "uptime",
        "passphrase": "hunter2",
    }
    assert "hello from remote" in result
