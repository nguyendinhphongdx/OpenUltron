# Feature: Builtin tool tạo file / thực thi lệnh trên máy (sandboxed workspace)

Status: accepted

## Vấn đề / động lực

Roadmap đã liệt kê "builtin tool tạo file/thực thi lệnh trên máy" là bước tiếp theo sau GitHub
search/read ([docs/adr/0015-connector-adapter-abstraction.md](../adr/0015-connector-adapter-abstraction.md)),
phụ thuộc approval-gate ([ADR-0014](../adr/0014-tool-approval-gate.md), đã xong). Đây là builtin
tool rủi ro cao nhất trong roadmap hiện tại — agent có thể ghi file/chạy lệnh tuỳ ý nếu không giới
hạn phạm vi, và approval gate (human duyệt mỗi lần) giảm rủi ro nhưng không loại bỏ hoàn toàn (người
duyệt có thể không đọc kỹ argument JSON mỗi lần, đặc biệt lệnh dài/phức tạp).

User đã chốt (2026-08-24, hỏi qua `AskUserQuestion` trước khi code): **sandboxed 1 working
directory cố định** — không cho thực thi/tạo file ở path tuỳ ý trên máy.

## Mục tiêu (Goals)

- 2 builtin tool mới, cả 2 đều nằm trong `TOOLS_REQUIRING_APPROVAL` (ADR-0014 — bắt buộc duyệt mỗi
  lần chạy, không có ngoại lệ):
  - `write-file`: ghi nội dung text vào 1 file, path tương đối trong workspace sandbox.
  - `run-command`: chạy 1 lệnh shell, cwd cố định trong workspace sandbox (hoặc subdirectory của
    nó), có timeout + truncate output.
- Sandbox: 1 thư mục cố định trên máy chạy `apps/api` (path lấy từ config, không hardcode), mọi
  path tương đối agent đưa vào đều resolve rồi validate KHÔNG được thoát ra ngoài thư mục này (chặn
  path traversal `../../etc/passwd` kiểu vậy).
- `run-command` chạy trong sandbox nhưng **không** chặn nội dung lệnh (không whitelist command) —
  approval gate + giới hạn cwd là lớp bảo vệ chính; lý do: whitelist command dễ bị bypass (`bash -c`,
  alias...) và không phải mục tiêu của bản này (over-engineer nếu chưa có nhu cầu thật).

## Ngoài phạm vi (Non-goals)

- KHÔNG cho phép agent tự đổi sandbox root qua argument — cố định qua config, đổi phải sửa `.env`
  + restart, không phải quyết định của agent lúc runtime.
- KHÔNG sandbox bằng container/VM/chroot thật — chỉ validate path bằng code (đủ cho use-case cá
  nhân, single-user, ADR-0001 "Ultron là công cụ 1 người dùng"). Nếu sau này cần isolation mạnh hơn
  (network, syscall), đó là 1 ADR riêng khi có nhu cầu thật.
- KHÔNG giới hạn nội dung lệnh (block danh sách lệnh nguy hiểm như `rm -rf`) — dựa vào approval gate
  làm lớp chặn chính; whitelist/blacklist command dễ bypass và tạo cảm giác an toàn giả.
- KHÔNG thêm UI riêng để config sandbox path — dùng biến môi trường như các config khác
  (`app/core/config.py`), không cần màn hình settings mới cho việc này.
- KHÔNG đọc file (`read-file`) trong bản này — Non-goal có chủ đích, đây là feature riêng nếu cần
  (khác rủi ro: đọc không sửa đổi máy, có thể không cần approval gate).

## Thiết kế

**Module mới `app/core/workspace.py`** (không phải `connector/` — đây là năng lực cục bộ trên máy
chạy `apps/api`, không phải tích hợp dịch vụ ngoài, khác trục với ADR-0015):

- `WORKSPACE_ROOT: Path` — từ `settings.workspace_dir` (mới, `app/core/config.py`, default
  `./data/workspace`), resolve tuyệt đối + tự tạo nếu chưa có lúc import.
- `resolve_safe_path(relative_path: str) -> Path` — join `WORKSPACE_ROOT` + `relative_path`,
  resolve (`Path.resolve()`), validate kết quả nằm trong `WORKSPACE_ROOT`
  (`Path.is_relative_to`) — raise `ValueError` nếu path thoát ra ngoài (path traversal).

**Builtin tool trong `app/modules/tool/builder.py`** (cùng vị trí `github-search-code`/
`github-read-file`, dispatch theo slug trong `BuiltinToolBuilder`):

- `write-file` — args `path: str`, `content: str`. Gọi `resolve_safe_path`, tạo parent dir nếu
  chưa có, ghi UTF-8. Trả về path đã ghi (tương đối, để agent không thấy absolute path thật của
  máy — tránh leak thông tin không cần thiết vào context).
- `run-command` — args `command: str`, `cwd: str | None` (subdirectory tương đối trong sandbox,
  default gốc sandbox). Gọi `resolve_safe_path(cwd)`, chạy qua `asyncio.create_subprocess_shell`
  (cần hỗ trợ pipe/redirect — lý do dùng `_shell` không phải `_exec`), timeout 30s (kill process +
  trả lỗi rõ nếu quá giờ), capture stdout+stderr, truncate như `HttpToolBuilder` (8000 ký tự).

Cả 2 thêm vào `TOOLS_REQUIRING_APPROVAL` (ADR-0014) — không có cách tắt approval cho 2 tool này.

**`apps/web`**: không cần thay đổi UI — `ToolForm`'s builtin catalog dropdown (đã build cho
GitHub tool) tự động hiện 2 slug mới qua `GET /tools/builtin-catalog`, không cần code riêng.

## Câu hỏi mở

- Không có — Goals/Non-goals đã chốt với user qua `AskUserQuestion` trước khi viết spec này.

## Acceptance criteria

- [ ] `write-file`/`run-command` là 2 entry mới trong `BUILTIN_TOOL_CATALOG`, xuất hiện trong
      dropdown `ToolForm` (`kind=builtin`).
- [ ] Cả 2 nằm trong `TOOLS_REQUIRING_APPROVAL` — verify qua UI: agent gọi tool → turn pause chờ
      duyệt (giống `approval-test-echo` đã verify ở ADR-0014), reject → không có file/lệnh nào
      chạy thật.
- [ ] `resolve_safe_path` chặn path traversal — unit test `../../etc/passwd`,
      `/etc/passwd` (absolute), `..%2F..` kiểu encode lỗi thời (không cần, input đã qua JSON string
      thường, nhưng test `../` cơ bản là đủ) → raise `ValueError`, KHÔNG resolve ra ngoài sandbox.
- [ ] `write-file` ghi đúng nội dung, tạo parent dir nếu chưa có — verify qua live-test thật (tạo
      file trong sandbox, đọc lại bằng tay xác nhận nội dung đúng).
- [ ] `run-command` timeout đúng 30s nếu lệnh treo (`sleep 60` phải bị kill, trả lỗi rõ, không treo
      turn vô hạn) — verify qua unit test (mock subprocess hoặc lệnh sleep ngắn hơn timeout test).
- [ ] `run-command` chạy đúng cwd trong sandbox, không thoát ra ngoài dù `cwd` chứa `../`.
