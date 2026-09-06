# ADR-0022 — Builtin tool SSH remote execution (host bất kỳ, approval bắt buộc)

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-09-04

## Context

Agent hiện chỉ thực thi lệnh trên chính máy chạy `apps/api`, giới hạn trong 1 workspace sandbox
([ADR-0016](0016-sandboxed-workspace-file-exec.md)). User muốn agent SSH được tới **1 host bất kỳ**
để chạy lệnh (deploy, kiểm tra log server, vận hành hạ tầng) — không whitelist host trước, đây là
quyết định chủ đích của user (đánh đổi linh hoạt lấy blast radius lớn hơn hẳn `run-command` cục bộ:
lệnh sai trên máy thật ở xa có thể không sửa lại được, khác sandbox local xoá đi tạo lại được).
Spec đầy đủ (Goals/Non-goals, "Quyết định thêm" đã chốt với user 2026-09-04) ở
[docs/features/ssh-remote-execution-tool.md](../features/ssh-remote-execution-tool.md); ADR này chỉ
formalize phần quyết định kiến trúc còn để mở ở đó (thư viện SSH client, connector module, tool
wiring, credential schema, approval card).

Đã đọc code thật trước khi quyết:

- `apps/api/pyproject.toml` — chưa có dependency SSH client nào.
- `app/modules/connector/adapter.py` + `github.py` (ADR-0015) — `ConnectorAdapter` Protocol hiện chỉ
  có `test_connection(secret: str) -> bool`, registry `CONNECTORS` dict tĩnh.
- `app/modules/tool/builder.py` (ADR-0013/0016) — `BuiltinToolBuilder.build` dispatch theo
  `spec.slug`; `TOOLS_REQUIRING_APPROVAL` là 1 `frozenset` module-level; `write-file`/`run-command`
  không cần credential, `github-*` lấy token qua `_github_token(session, slug)` gọi
  `get_provider_api_key("github", session)`.
- `app/modules/credential/schemas.py`/`service.py`/`models.py` (ADR-0010) — `CredentialUpsert` chỉ
  có `api_key: str`; `Credential` DB model chỉ có 1 cột secret (`ciphertext: bytes`), không có chỗ
  chứa 1 secret phụ (passphrase); `_verify(provider, api_key)` thử `PROVIDERS` (model) rồi
  `CONNECTORS` (connector, ADR-0015), gọi `test_connection(api_key)` — chỉ truyền đúng 1 tham số.
- `apps/web/.../ApprovalInterruptPanel.tsx` — hiện dump chung `JSON.stringify(arguments)` cho mọi
  tool, không có renderer riêng theo tool slug.

Không có sẵn chỗ nào lưu passphrase, truyền passphrase qua `test_connection`, hay hiện approval
card đẹp theo tool — cả 3 đều cần quyết định mở rộng cụ thể, không chỉ "thêm 1 tool" đơn giản.

## Decision

### 1. Thư viện SSH client: `asyncssh`

Thêm `asyncssh` vào `apps/api/pyproject.toml` (dependency mới). Chọn thay vì **Paramiko** vì
`apps/api` là codebase asyncio thuần (FastAPI + LangGraph, mọi builtin tool khác — `httpx`,
`asyncio.create_subprocess_*` — đều async): Paramiko là thư viện sync, muốn dùng trong 1 event loop
async phải tự bọc `run_in_executor`/thread pool, thêm 1 lớp phức tạp không cần thiết (quản lý
executor riêng cho đúng 1 tool) chỉ để né API sync. `asyncssh` cung cấp `connect`/`run` native
`async def`, ghép thẳng vào `StructuredTool.from_function(coroutine=...)` như mọi builtin tool khác,
không lệch pattern.

### 2. Connector module `app/modules/connector/ssh.py`

Theo đúng pattern `github.py` (ADR-0015) — connector chỉ biết "SSH shape", không biết `Tool`/
`ToolSpec`:

```python
class SshConnectorAdapter:
    async def test_connection(self, secret: str, passphrase: str | None = None) -> bool:
        """Chỉ parse thử private key PEM (asyncssh.import_private_key(secret, passphrase)) —
        KHÔNG connect SSH thật tới host nào (đúng "Quyết định thêm" trong spec — dialog credential
        hiện tại không có ô nhập host để test connect thật)."""

async def execute_command(
    private_key_pem: str,
    host: str,
    port: int,
    username: str,
    command: str,
    passphrase: str | None = None,
) -> str:
    """Connect thật (asyncssh.connect(host, port, username, client_keys=[...], known_hosts=None)),
    chạy `command` qua `conn.run(command)`, trả string format
    "Exit code: {n}\n{stdout+stderr}" (giống format `run-command`, ADR-0016), truncate 8000 ký tự
    (nhất quán `_MAX_RESPONSE_CHARS` toàn `tool/builder.py`)."""
```

`known_hosts=None` (tắt host-key verification) là hệ quả bắt buộc của quyết định "không whitelist
host trước" — asyncssh mặc định xác minh host key qua `~/.ssh/known_hosts`, nhưng host bất kỳ do
model tự điền thì không thể có sẵn known_hosts entry, và tự động "trust on first use" + ghi lại vẫn
là chấp nhận key không xác minh ở lần đầu. Chấp nhận rủi ro MITM trên đường truyền mạng — ghi rõ ở
Consequences, không giấu.

`ConnectorAdapter` Protocol (`adapter.py`) đổi chữ ký thành
`test_connection(self, secret: str, passphrase: str | None = None) -> bool` — mở rộng thêm 1 tham
số optional có default, cùng tinh thần "mở rộng schema chung, không tạo path riêng" đã áp dụng cho
`CredentialUpsert.passphrase` (mục 4). `GitHubConnectorAdapter.test_connection` cần thêm tham số
này vào chữ ký (không dùng tới, chỉ để khớp Protocol) — thay đổi cơ học, không đổi hành vi GitHub.

Đăng ký `CONNECTORS["ssh"] = SshConnectorAdapter()` trong `CONNECTORS` dict.

### 3. Builtin tool `ssh-execute` trong `tool/builder.py`

- Slug mới: `SSH_EXECUTE_SLUG = "ssh-execute"`, thêm vào `BUILTIN_TOOL_CATALOG` (mô tả: "SSH tới 1
  host bất kỳ để chạy lệnh — cần credential 'ssh' (ADR-0022), luôn yêu cầu duyệt, không whitelist
  host").
- `args_schema` — `_SshExecuteArgs(BaseModel)`: `host: str`, `port: int = 22`, `username: str`,
  `command: str` — tất cả do model tự điền lúc gọi tool (giống cách `HttpToolBuilder` cho model tự
  điền `ai_params`, ADR-0013), không cố định trước theo credential.
- `_build_ssh_execute_tool(spec, session)` — lấy private key + passphrase qua 2 hàm mới trong
  `app/core/providers.py`: `get_provider_api_key("ssh", session)` (đã có sẵn, tái dùng) và
  `get_provider_passphrase("ssh", session)` (mới, mirror `get_provider_api_key`, tra
  `CredentialService.get_decrypted_passphrase`). Thiếu private key → trả `None` (log warning, cùng
  cách `_github_token` xử lý thiếu credential). Hàm `_call(host, port, username, command)` gọi
  `ssh_connector.execute_command(private_key, host, port, username, command, passphrase)`.
- **Timeout: 120 giây** (dài hơn 30s của `run-command`/`execute-code`, cùng file) — lệnh SSH chạy
  trên hạ tầng thật thường là deploy/build/kiểm tra log, có xu hướng lâu hơn lệnh sandbox cục bộ;
  120s đủ dư cho phần lớn tác vụ vận hành thông thường mà vẫn chặn được treo turn vô hạn nếu host
  đứng hình/network treo. Không cho model tự điền timeout qua argument — cùng lý do `WORKSPACE_ROOT`
  không cho agent tự đổi runtime (ADR-0016): đây là giới hạn vận hành, không phải quyết định của
  agent lúc chạy.
- `TOOLS_REQUIRING_APPROVAL` (frozenset, cùng file) thêm `SSH_EXECUTE_SLUG` — **không có cờ/flag nào
  tắt được**, giống `write-file`/`run-command`/`execute-code` (ADR-0016): approval gate
  (`HumanInTheLoopMiddleware`, ADR-0014) là lớp chặn chính cho mọi builtin tool có side-effect thật,
  và với `ssh-execute` đây là lớp chặn DUY NHẤT (không có sandbox path nào bảo vệ như ADR-0016, vì
  host nằm ngoài `apps/api`).

### 4. `Credential` schema — thêm `passphrase` (field mới, không đổi pipeline chung)

- `Credential` DB model (`credential/models.py`) — thêm cột mới, nullable:
  `passphrase_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)` (cùng
  cơ chế AES-256-GCM qua `app/core/crypto.py`, ADR-0010). Cần 1 Alembic migration mới (additive,
  không ảnh hưởng row hiện có — `gemini`/`openai`/`github` luôn `NULL` ở cột này).
- `CredentialUpsert` (`credential/schemas.py`) thêm `passphrase: str | None = None` — optional, mọi
  provider khác không set/bỏ qua field này, không ảnh hưởng gì tới pipeline `gemini`/`openai`/
  `github` hiện có. Đúng tinh thần "mở rộng schema chung thay vì tạo path riêng" đã dùng cho
  `Agent.execution_strategy`/`pos_x`/`pos_y`.
- `CredentialProvider` (Literal) thêm `"ssh"`.
- `CredentialService.upsert` — mã hoá `input.passphrase` (nếu có) vào `passphrase_ciphertext`
  (`None` nếu không truyền, không ép buộc mọi provider phải có). `_verify(provider, api_key,
  passphrase=None)` — thêm tham số optional, truyền xuống `connector.test_connection(api_key,
  passphrase)` khi tra registry connector; nhánh model provider (`PROVIDERS`) gọi
  `test_connection(api_key)` như cũ (không đổi, model provider không có khái niệm passphrase).
- `CredentialService.get_decrypted_passphrase(provider) -> str | None` — method mới, mirror
  `get_decrypted_key`, dùng nội bộ bởi `app/core/providers.py::get_provider_passphrase` (KHÔNG
  expose qua router, cùng rule `get_decrypted_key`).

### 5. Approval card — thêm renderer riêng cho `ssh-execute`

Quyết định: **thêm 1 nhánh renderer riêng theo tool slug** trong `ApprovalInterruptPanel.tsx`, giữ
JSON dump chung làm fallback cho mọi tool khác chưa có renderer riêng. Lý do chọn thay vì để nguyên
JSON dump: chi phí thấp (1 hàm nhỏ kiểm tra `interruptToolName(interrupt) === 'ssh-execute'` rồi
render `host`/`username`/`command` từ `interruptArguments(interrupt)` thành text rõ ràng thay vì
`<pre>` JSON), lợi ích cao và trực tiếp — đây là tool đầu tiên có blast radius "không thể hoàn tác
trên máy khác", user cần đọc đúng host/lệnh trước khi bấm duyệt, không nên bắt user tự parse JSON
argument để tránh duyệt nhầm. Không tổng quát hoá thành 1 hệ thống renderer-per-slug đầy đủ (registry
map slug → component) ở bản này — chỉ thêm đúng 1 nhánh `if` cho `ssh-execute`, tổng quát hoá khi có
tool thứ 2 cần renderer riêng (chưa cần bây giờ, AGENTS.md rule 2).

## Consequences

- ✅ Agent có thể vận hành hạ tầng thật (deploy, kiểm tra log server) — mở rộng đáng kể use-case
  "agent tự làm được", tái dùng nguyên cơ chế approval gate (ADR-0014) và `Credential` (ADR-0010),
  không cần bảng/cơ chế duyệt mới.
- ✅ `asyncssh` giữ toàn bộ pipeline builtin tool async thuần nhất quán — không cần thread pool
  riêng cho 1 tool.
- ✅ Approval card hiện rõ host/username/command — giảm rủi ro user duyệt nhầm lệnh nguy hiểm trên
  sai host vì không đọc kỹ JSON.
- ⚠️ `known_hosts=None` (không xác minh host key) — chấp nhận rủi ro MITM trên đường truyền mạng
  giữa `apps/api` và host đích, đây là hệ quả trực tiếp của quyết định "không whitelist host trước"
  (không thể có sẵn known_hosts cho host tuỳ ý model chọn). Chấp nhận cho use-case cá nhân
  (ADR-0001) nơi user thường SSH trong mạng riêng/VPN đã tin cậy; nếu cần xác minh host key sau này,
  đó là 1 quyết định riêng (vd cho phép user khai trước known_hosts qua credential), không làm trước
  khi có nhu cầu thật.
- ⚠️ **Không có sandbox path nào bảo vệ** như `run-command` cục bộ (ADR-0016) — approval gate là lớp
  chặn DUY NHẤT, không có lớp bổ sung nào khác cho tool này. Chấp nhận vì bản chất "SSH tới host bất
  kỳ" không có khái niệm sandbox path (host nằm ngoài `apps/api`); user phải đọc kỹ approval card
  mỗi lần duyệt — đây là lý do mục 5 (renderer riêng) không thể bỏ qua như 1 nice-to-have.
- ⚠️ **1 SSH identity duy nhất cho mọi host** (không multi-key theo host, đúng Non-goals đã chốt) —
  nếu user cần identity khác nhau cho host khác nhau, phải tự đổi credential `ssh` thủ công trước
  mỗi lần dùng identity khác; mở rộng multi-key là 1 ADR riêng nếu có nhu cầu thật.
- ⚠️ `ConnectorAdapter.test_connection` đổi chữ ký (thêm `passphrase` optional) — ảnh hưởng cơ học
  tới `GitHubConnectorAdapter` (phải thêm tham số không dùng tới vào chữ ký để khớp Protocol); chấp
  nhận vì đây đúng 1 điểm mở rộng chung (Protocol), không tạo Protocol thứ 2 riêng cho SSH.
  `docs/conventions/06-security.md` mục "No secret committed" hiện chỉ nhắc `Credential.ciphertext`
  — cần 1 follow-up nhỏ (không thuộc phạm vi ADR này) bổ sung câu về cột `passphrase_ciphertext`
  mới + rule "known_hosts=None cho SSH connector là quyết định có chủ đích, không phải lỗ hổng bỏ
  sót" để `code-reviewer` không tự flag nhầm khi review connector này.
- ⚠️ Timeout 120s là số cố định chọn theo phỏng đoán hợp lý (không đo thực tế), có thể cần chỉnh lại
  sau khi live-test thật (acceptance criteria trong spec) cho thấy tác vụ thật cần lâu hơn/ngắn hơn.

## Alternatives considered

- **Paramiko thay `asyncssh`**: loại — Paramiko là thư viện sync, dùng trong codebase asyncio thuần
  (FastAPI + LangGraph) đòi hỏi tự bọc `run_in_executor`/thread pool riêng cho đúng 1 tool, thêm 1
  lớp phức tạp không cần thiết khi `asyncssh` đã cung cấp API async native khớp thẳng vào
  `StructuredTool.from_function(coroutine=...)` như mọi builtin tool khác.
- **JSON credential (object có cấu trúc `{private_key, passphrase}`) thay vì PEM string trần +
  field `passphrase` riêng**: loại — `CredentialUpsert.api_key: str` xuyên suốt pipeline hiện có
  (`upsert`/`_verify`/`_mask_key`) giả định 1 string token trần cho `gemini`/`openai`/`github`; đổi
  `api_key` thành object có cấu trúc bắt buộc sửa `_mask_key`/`_verify`/`CredentialRead` để xử lý cả
  2 shape (string cho provider cũ, object cho `ssh`), rủi ro phá vỡ provider đang chạy tốt chỉ để
  phục vụ 1 provider mới. Thêm 1 field optional mới (`passphrase`) là thay đổi cộng thêm thuần tuý,
  không đổi shape `api_key` đã có.
- **Không bắt buộc approval, để user tự bật/tắt theo tool**: loại — user đã chốt "approval gate BẮT
  BUỘC cho mọi lệnh SSH, không có cách tắt", nhất quán ADR-0014 và cách `write-file`/`run-command`/
  `execute-code` (ADR-0016) không có cờ tắt approval; đây là tool rủi ro cao nhất từ trước tới nay
  (không có sandbox path bảo vệ, host tuỳ ý, không whitelist) — cho phép tắt approval sẽ mâu thuẫn
  trực tiếp với chính lý do tool này cần được thiết kế cẩn trọng hơn `run-command` cục bộ.
- **Tổng quát hoá renderer approval card thành registry slug → component ngay từ đầu**: loại cho bản
  này — chỉ có đúng 1 tool (`ssh-execute`) cần renderer riêng tại thời điểm này, xây registry tổng
  quát trước khi có tool thứ 2 cần là speculative (AGENTS.md rule 2); thêm 1 nhánh `if` đơn giản là
  đủ, tổng quát hoá khi nhu cầu thật xuất hiện.
