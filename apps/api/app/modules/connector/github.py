"""GitHub connector (ADR-0015) — `test_connection` cho credential module (ADR-0010) + hàm gọi
GitHub REST API thật mà builtin tool (`app/modules/tool/builder.py`) dùng. Module này chỉ biết
GitHub API shape, không biết gì về `Tool`/`ToolSpec` — tầng tool gọi vào đây, không ngược lại.
"""

import base64

import httpx

from app.core.logging import logger

_TIMEOUT_SECONDS = 10.0
_MAX_SEARCH_RESULTS = 10


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}


class GitHubConnectorAdapter:
    async def test_connection(self, secret: str) -> bool:
        if not secret:
            return False
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
                response = await client.get(
                    "https://api.github.com/user", headers=_auth_headers(secret)
                )
            return response.status_code == 200
        except httpx.HTTPError as exc:
            logger.warning(
                "connector.test_connection_network_error", connector="github", error=str(exc)
            )
            return False


async def search_code(token: str, query: str, repo: str | None = None) -> str:
    """`GET /search/code` — GitHub yêu cầu auth cho mọi request tới endpoint này (từ 2023, không
    có unauthenticated fallback), rate-limit 10 req/min kể cả có token. `repo` (dạng "owner/name")
    giới hạn phạm vi tìm kiếm nếu có."""
    search_query = f"{query} repo:{repo}" if repo else query
    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
        response = await client.get(
            "https://api.github.com/search/code",
            headers=_auth_headers(token),
            params={"q": search_query, "per_page": _MAX_SEARCH_RESULTS},
        )
    if response.status_code != 200:
        return f"GitHub search lỗi (HTTP {response.status_code}): {response.text[:300]}"
    items = response.json().get("items", [])
    if not items:
        return "Không tìm thấy kết quả nào."
    return "\n".join(f"- {item['repository']['full_name']}: {item['path']}" for item in items)


async def read_file(token: str, owner: str, repo: str, path: str, ref: str | None = None) -> str:
    """`GET /repos/{owner}/{repo}/contents/{path}` — content trả base64, decode UTF-8 để agent đọc
    trực tiếp; thư mục/file binary trả lỗi rõ thay vì decode sai/crash."""
    params = {"ref": ref} if ref else None
    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
        response = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
            headers=_auth_headers(token),
            params=params,
        )
    if response.status_code != 200:
        return f"GitHub read file lỗi (HTTP {response.status_code}): {response.text[:300]}"
    data = response.json()
    if data.get("type") != "file" or "content" not in data:
        return f"'{path}' không phải file đọc trực tiếp được (có thể là thư mục)."
    try:
        return base64.b64decode(data["content"]).decode("utf-8")
    except UnicodeDecodeError:
        return f"'{path}' là file binary, không đọc được dạng text."
