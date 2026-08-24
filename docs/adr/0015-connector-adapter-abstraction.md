# ADR-0015 — Connector adapter: abstraction riêng cho dịch vụ ngoài (GitHub...), tách khỏi model provider

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-24

## Context

Ultron sắp thêm builtin tool "GitHub search/read" (agent tự tra cứu code/file trên GitHub qua
GitHub REST API). GitHub API cần token (Bearer) để gọi — cần lưu trữ + verify token này, đúng bài
toán đã giải cho model provider ở [ADR-0010](0010-provider-credential-in-db.md) (`Credential` DB
table, mã hoá AES-256-GCM) và [ADR-0012](0012-provider-adapter-abstraction.md) (`ProviderAdapter`
Protocol + registry `PROVIDERS`, `test_connection` để verify key khi lưu).

Cách làm nhanh nhất là nhồi GitHub vào thẳng `app/core/provider_adapter.py`: thêm 1
`GitHubAdapter` implement `ProviderAdapter`, cho `build_chat_model`/`build_embeddings` raise lỗi
(vì GitHub không phải model provider, không build được chat model/embeddings từ nó). User đã bác
hướng này: "github là connector provider khác với model provider nên abstract cx phải khác, trong
code cx phải chia folder ra rõ ràng có model và connector chứ" — GitHub (và sau này có thể
Jira/Confluence, xem roadmap "Tool thật tự viết") là một trục hoàn toàn khác: agent gọi ra 1 dịch
vụ ngoài để lấy dữ liệu/thực thi hành động, không liên quan gì tới việc build LLM chat
model/embeddings. Ép 2 khái niệm vào 1 `Protocol` khiến interface có method không bao giờ dùng tới
ở 1 phía (raise lỗi cho có), sai semantics của `ProviderAdapter`.

`app/modules/tool/builder.py` ([ADR-0013](0013-tool-execution-builder-registry.md)) đã có
`BuiltinToolBuilder` đứng sẵn trong registry (`TOOL_BUILDERS["builtin"]`) nhưng chưa có builtin
tool thật nào — đây đúng chỗ builtin tool GitHub sẽ được đăng ký, nhưng `tool/builder.py` là tầng
"adapter LangChain-tool hoá 1 logic", không phải chỗ viết logic gọi GitHub REST API trực tiếp.

Cần 1 quyết định kiến trúc: abstraction nào cho "connector provider" (GitHub, và sau này các dịch
vụ ngoài khác), đặt ở đâu trong code, và cách credential (đã có sẵn `Credential` DB table từ
ADR-0010) mở rộng để chứa cả token của connector, không riêng API key của model provider.

## Decision

Thêm module mới **`app/modules/connector/`** (song song với `app/modules/model/`,
`app/modules/tool/`, `app/modules/credential/` — tách rõ folder theo đúng yêu cầu user), chứa:

- **`app/modules/connector/adapter.py`** — `ConnectorAdapter` Protocol riêng, độc lập hoàn toàn với
  `ProviderAdapter` (ADR-0012), chỉ có method connector thật sự cần:

  ```python
  class ConnectorAdapter(Protocol):
      async def test_connection(self, secret: str) -> bool: ...
  ```

  Không có `build_chat_model`/`build_embeddings` — connector không bao giờ "build model", đúng
  đúng lý do user bác phương án nhồi vào `ProviderAdapter`.

  Registry tĩnh, cùng lối với `PROVIDERS` (ADR-0012)/`TOOL_BUILDERS` (ADR-0013) — dict thường,
  không dynamic plugin discovery:

  ```python
  CONNECTORS: dict[str, ConnectorAdapter] = {"github": GitHubConnectorAdapter()}

  def get_connector(name: str) -> ConnectorAdapter | None: ...
  ```

- **`app/modules/connector/github.py`** — `GitHubConnectorAdapter` (`test_connection` gọi
  `GET https://api.github.com/user` với `Authorization: Bearer <token>`) + các hàm thực thi thật
  (search code, read file) mà builtin tool GitHub sẽ gọi tới.

**Credential integration**: `Credential` DB table (ADR-0010) **giữ nguyên schema** — không đổi
cột. Coi field `provider: str` hiện có là "tên định danh secret" chung (model provider hoặc
connector), không đổi tên cột để tránh migration không cần thiết. Chỉ đổi ở tầng validation/type:

- `credential/schemas.py::CredentialProvider` mở rộng từ `Literal["gemini", "openai"]` thành union
  cho phép cả tên connector, ví dụ `Literal["gemini", "openai", "github"]` (hoặc kiểm tra runtime
  qua `provider_adapter.CREDENTIAL_PROVIDERS | connector.CREDENTIAL_CONNECTORS` nếu
  `solution-architect` thấy union type tĩnh không đủ linh hoạt khi thêm connector sau — chi tiết
  implementation, không quyết ở ADR này).
- `credential/service.py::CredentialService._verify(provider, secret)` — thử tra
  `provider_adapter.get_provider(provider)` (registry model provider, ADR-0012) trước; nếu không
  có, tra `connector.get_connector(provider)` (registry connector, ADR này); gọi đúng
  `test_connection` của registry tìm thấy. **2 registry độc lập, không gộp chung 1 Protocol** — chỉ
  gộp ở đúng 1 điểm duy nhất (`_verify`, nơi cần biết "secret này thuộc registry nào để verify"),
  không lan ra chỗ khác.

**Tool builder integration**: `app/modules/tool/builder.py::BuiltinToolBuilder` khi build tool
GitHub **import và gọi hàm từ `app/modules/connector/github.py`** — không tự viết logic GitHub
ngay trong `tool/builder.py`. Giữ tách bạch rõ ràng: `connector/` = logic gọi dịch vụ ngoài (biết
GitHub API shape ra sao), `tool/` = adapter LangChain-tool hoá logic đó (biết `Tool`/`AgentTool`
row, `args_schema`, cách LangGraph gọi tool).

**Phạm vi bản này**: chỉ implement `github` connector. Kiến trúc mở cho connector khác sau này
(Jira/Confluence — đã có trong roadmap "Tool thật tự viết") nhưng **không tự implement trước khi
có yêu cầu thật** (AGENTS.md rule 2).

## Consequences

- ✅ Model provider (LLM) và connector provider (dịch vụ ngoài) là 2 trục độc lập, đúng bản chất —
  thêm connector mới (Jira/Confluence...) = viết 1 class implement `ConnectorAdapter` + 1 dòng
  registry trong `connector/`, không đụng `provider_adapter.py`/`tool/builder.py`.
- ✅ Tái dùng nguyên `Credential` DB table + cơ chế mã hoá (ADR-0010) cho token GitHub — không cần
  bảng mới, không cần UI mới (`CredentialManageDialog` hiện có mở rộng để hiển thị thêm connector).
- ✅ Builtin tool GitHub (`tool/builder.py`) chỉ gọi vào `connector/github.py`, không tự viết logic
  HTTP GitHub — sửa cách gọi GitHub API (vd đổi endpoint search) chỉ sửa đúng 1 file, không ảnh
  hưởng tầng tool.
- ⚠️ `CredentialService._verify` giờ phải biết thử cả 2 registry (`provider_adapter.PROVIDERS` rồi
  `connector.CONNECTORS`) — chấp nhận vì đây là đúng 1 điểm cần biết "secret thuộc ai" để verify,
  không lan logic if/elif ra chỗ khác; nếu số registry cần thử tăng lên ≥3 sau này, cân nhắc gộp
  thành 1 registry tổng hợp lookup theo tên — chưa cần ở bản này (chỉ 2 registry).
- ⚠️ `CredentialProvider` (Literal) phải sửa mỗi khi thêm connector mới cần credential — chấp nhận
  cho use-case hiện tại (số connector nhỏ, biết trước); nếu về sau connector tăng nhanh, đổi qua
  validate runtime từ union 2 registry là đủ, không cần ADR mới cho việc đó (đã nêu hướng ở
  Decision).
- ⚠️ Chưa xử lý rate-limit/pagination của GitHub API trong `connector/github.py` ở bản đầu — chấp
  nhận vì đây là chi tiết implementation của builtin tool GitHub, không phải quyết định kiến trúc;
  nếu cần retry/backoff phức tạp sau, không đổi lại `ConnectorAdapter` Protocol, chỉ sửa trong
  `github.py`.

## Alternatives considered

- **Thêm `GitHubAdapter` vào `provider_adapter.py`, `build_chat_model`/`build_embeddings` raise
  lỗi**: loại — user từ chối trực tiếp; lẫn 2 khái niệm khác nhau (model provider build LLM vs
  connector provider gọi dịch vụ ngoài) vào 1 abstraction, sai semantics của `ProviderAdapter`
  Protocol (ADR-0012), và mọi implementation tương lai của connector đều phải "giả vờ" có
  `build_chat_model` không dùng tới.
- **Gộp `ConnectorAdapter` và `ProviderAdapter` thành 1 Protocol chung (superset method)**: loại —
  không đúng tinh thần "chia rõ folder" user yêu cầu; Protocol phình ra method không dùng tới ở 1
  phía (`build_chat_model`/`build_embeddings` vô nghĩa với connector, `test_connection` với
  signature khác nhau về mặt ý nghĩa — provider verify API key để dùng LLM, connector verify token
  để gọi dịch vụ ngoài), làm registry lẫn 2 loại "provider" khác bản chất vào cùng 1 dict.
- **Đặt `connector/github.py` trực tiếp trong `app/modules/tool/` (không tách module riêng)**:
  loại — vi phạm đúng yêu cầu user "chia folder ra rõ ràng có model và connector"; đồng thời
  `connector/` cần độc lập với `tool/` vì logic gọi GitHub API có thể tái dùng ngoài phạm vi 1 tool
  cụ thể (vd sau này agent gọi connector trực tiếp không qua tool wrapper).
