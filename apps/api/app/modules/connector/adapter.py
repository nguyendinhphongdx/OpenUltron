"""1 interface + 1 registry cho connector (ADR-0015) — độc lập với `ProviderAdapter`
(`app/core/provider_adapter.py`, ADR-0012, chỉ dành cho model provider/LLM). Connector = tích hợp
1 dịch vụ ngoài (GitHub...) mà agent gọi ra để lấy dữ liệu/thực thi hành động — không bao giờ build
chat model/embeddings. Thêm connector mới = viết 1 class implement `ConnectorAdapter` trong module
này + thêm vào `CONNECTORS`, không sửa `credential/service.py`/`tool/builder.py`.
"""

from typing import Protocol

from app.modules.connector.github import GitHubConnectorAdapter


class ConnectorAdapter(Protocol):
    async def test_connection(self, secret: str) -> bool: ...


CONNECTORS: dict[str, ConnectorAdapter] = {
    "github": GitHubConnectorAdapter(),
}


def get_connector(name: str) -> ConnectorAdapter | None:
    return CONNECTORS.get(name)


# Mọi connector hiện có đều cần credential (khác model provider — không có case self-host như
# ollama/sglang) — nhưng vẫn khai tường minh, không suy ra ngầm, đúng tinh thần
# `provider_adapter.CREDENTIAL_PROVIDERS`.
CREDENTIAL_CONNECTORS: frozenset[str] = frozenset(CONNECTORS.keys())
