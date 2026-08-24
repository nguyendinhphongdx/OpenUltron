# ADR-0016 — Sandbox 1 workspace directory cho builtin tool ghi file/thực thi lệnh

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-24

## Context

Roadmap Ultron ([ADR-0001](0001-single-python-runtime.md) — personal AI agent platform, single-user)
cần builtin tool cho agent "tạo file/thực thi lệnh trên máy" — bước tiếp theo sau GitHub search/read
([ADR-0015](0015-connector-adapter-abstraction.md)) và approval gate
([ADR-0014](0014-tool-approval-gate.md), đã xong). Đây là builtin tool rủi ro cao nhất hiện có: agent
(LLM) có thể ghi file/chạy lệnh shell tuỳ ý nếu không giới hạn phạm vi. Approval gate (ADR-0014,
`HumanInTheLoopMiddleware`) đã bắt buộc user duyệt mỗi lần tool này được gọi, nhưng không loại bỏ
hoàn toàn rủi ro — người duyệt có thể không đọc kỹ argument JSON, đặc biệt lệnh dài/phức tạp.

Đã hỏi user qua `AskUserQuestion` trước khi thiết kế: 2 lựa chọn — (a) sandbox 1 working directory
cố định, chặn path traversal ra ngoài; (b) không giới hạn, chạy path/lệnh tuỳ ý. User chọn **(a) —
sandboxed 1 working directory**. Spec đầy đủ (Goals/Non-goals, acceptance criteria) đã chốt ở
[docs/features/builtin-tool-file-exec.md](../features/builtin-tool-file-exec.md); ADR này chỉ
formalize phần quyết định kiến trúc.

## Decision

**Sandbox bằng validate path trong code, không dùng container/VM/chroot thật** — đủ cho use-case cá
nhân single-user (ADR-0001), không cần isolation mạnh (network/syscall) vì scope hiện tại chỉ là
"giới hạn agent ghi/chạy trong 1 thư mục", không phải "cách ly hoàn toàn với hệ thống" (lệnh vẫn chạy
bằng quyền của process `apps/api` thật, chỉ path bị giới hạn).

Module mới **`app/core/workspace.py`** (đặt ở `core/`, không phải `app/modules/connector/` — đây là
năng lực cục bộ trên máy chạy `apps/api`, không tích hợp dịch vụ ngoài, khác trục với "connector
provider" của ADR-0015):

- `WORKSPACE_ROOT: Path` — đọc từ `settings.workspace_dir` (field mới trong
  `app/core/config.py::Settings`, default `"./data/workspace"`), resolve tuyệt đối lúc import
  module, tự tạo thư mục nếu chưa tồn tại (`Path.mkdir(parents=True, exist_ok=True)`).
- `resolve_safe_path(relative_path: str) -> Path` — join `WORKSPACE_ROOT` với `relative_path`,
  `.resolve()`, rồi validate kết quả `is_relative_to(WORKSPACE_ROOT)` — raise `ValueError` rõ ràng
  nếu path thoát ra ngoài sandbox (chặn `../../etc/passwd`, absolute path lạ...). Đây là hàm DUY
  NHẤT chịu trách nhiệm path-safety — mọi builtin tool ghi file/chạy lệnh phải gọi qua hàm này,
  không tự resolve path riêng.

2 builtin tool mới trong `app/modules/tool/builder.py` (cùng vị trí `github-search-code`/
`github-read-file` từ ADR-0015 — dispatch theo slug trong `BuiltinToolBuilder`, KHÔNG phải connector
vì không gọi dịch vụ ngoài):

- `write-file` (args `path`, `content`) — ghi UTF-8 vào path đã qua `resolve_safe_path`, tự tạo
  parent dir.
- `run-command` (args `command`, `cwd` tuỳ chọn — subdirectory tương đối trong sandbox) — chạy qua
  `asyncio.create_subprocess_shell` (cần hỗ trợ pipe/redirect nên dùng shell variant, không phải
  `create_subprocess_exec`), cwd = `resolve_safe_path(cwd hoặc "")`, timeout 30s (kill + trả lỗi rõ
  nếu quá giờ, không treo turn), stdout+stderr capture, truncate 8000 ký tự (giống
  `HttpToolBuilder`/GitHub tool đã có, ADR-0013/0015 — nhất quán cách truncate output).

Cả 2 tool bắt buộc nằm trong `TOOLS_REQUIRING_APPROVAL` (ADR-0014) — không có cờ/flag nào tắt
approval cho riêng 2 tool này; đây là lớp bảo vệ CHÍNH, sandbox path chỉ là lớp bổ sung.

**Chủ đích KHÔNG làm** (không phải thiếu sót, xem thêm Consequences):

- Không whitelist/blacklist nội dung lệnh shell (không chặn `rm -rf` theo string match) — dễ bypass
  (`bash -c "..."`, alias, encoding), tạo cảm giác an toàn giả; approval gate là lớp chặn chính,
  không phải string-matching lệnh.
- Không cho agent tự đổi `WORKSPACE_ROOT` qua argument runtime — chỉ đổi qua `.env` + restart, là
  quyết định vận hành (operator), không phải quyết định của agent lúc chạy.
- Không sandbox bằng container/chroot/VM — nếu sau này cần isolation mạnh hơn (network/syscall), đó
  là 1 ADR riêng khi có nhu cầu thật, không làm trước (AGENTS.md rule 2, không vượt scope).

## Consequences

- ✅ Chặn được lớp rủi ro dễ mắc lỗi nhất (path traversal do argument LLM sinh ra sai/ác ý) bằng 1
  hàm validate duy nhất, dễ unit test độc lập (`resolve_safe_path` không phụ thuộc DB/network).
- ✅ Không thêm hạ tầng nặng (Docker daemon, VM) — đúng quy mô use-case cá nhân, single-user
  (ADR-0001), triển khai/maintain đơn giản.
- ✅ Tái dùng nguyên cơ chế approval gate đã build ở ADR-0014 (`TOOLS_REQUIRING_APPROVAL`,
  `HumanInTheLoopMiddleware`) — không cần cơ chế duyệt riêng cho 2 tool này.
- ⚠️ Sandbox chỉ giới hạn **path**, không giới hạn nội dung lệnh — `run-command` vẫn có thể làm hại
  trong phạm vi sandbox (xoá hết file trong `WORKSPACE_ROOT`, chiếm CPU/memory của process
  `apps/api`...). Chấp nhận vì approval gate là lớp chặn chính, và whitelist command bị loại có chủ
  đích (xem Alternatives) — nếu sau này cần giới hạn resource (cgroup, ulimit), đó là quyết định
  riêng khi có nhu cầu thật.
- ⚠️ Lệnh chạy bằng đúng quyền OS của process `apps/api` (không phải user riêng bị hạ quyền) — nếu
  process chạy với quyền cao hơn cần thiết, sandbox path không bảo vệ được tài nguyên ngoài
  filesystem (network, quyền hệ điều hành khác). Chấp nhận ở quy mô cá nhân hiện tại; vận hành nên
  tự chạy `apps/api` với user OS giới hạn quyền nếu cần thêm 1 lớp bảo vệ (không phải việc của ADR
  này).
- ⚠️ `resolve_safe_path` là điểm chịu trách nhiệm duy nhất — builtin tool tương lai lỡ tự resolve
  path riêng (không gọi qua hàm này) sẽ phá vỡ sandbox mà không có cảnh báo tự động; cần code review
  chú ý khi thêm builtin tool mới chạm filesystem.

## Alternatives considered

- **Không giới hạn path/command (chạy tuỳ ý trên máy)**: bị user bác trực tiếp qua
  `AskUserQuestion`; rủi ro quá cao cho 1 tool do LLM tự quyết định gọi.
- **Sandbox bằng container/Docker thật** (mỗi lần `run-command` spawn 1 container riêng): loại vì
  over-engineer cho use-case cá nhân single-user hiện tại (ADR-0001), thêm dependency nặng (Docker
  daemon) không cần thiết ở quy mô này; có thể revisit bằng ADR riêng nếu nhu cầu tăng.
- **Whitelist command cụ thể** (chỉ cho phép 1 danh sách lệnh cố định như `ls`, `cat`, `mkdir`): loại
  vì quá hạn chế cho use-case thật (agent cần chạy nhiều loại lệnh khác nhau tuỳ tác vụ user giao),
  và whitelist dễ tạo false sense of security (vẫn có thể compose lệnh nguy hiểm từ lệnh "an toàn"
  nếu không cẩn thận).
