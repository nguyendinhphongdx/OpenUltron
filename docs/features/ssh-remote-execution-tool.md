# Feature: SSH remote execution tool

Status: draft

## Vấn đề / động lực

Agent hiện chỉ thực thi được lệnh trên MÁY CHẠY `apps/api` (sandbox 1 thư mục,
[ADR-0016](../adr/0016-sandboxed-workspace-file-exec.md)) — không chạm được tới hạ tầng thật khác
(server, NAS, VPS...). User muốn agent có khả năng SSH tới máy khác để thực thi lệnh — mở rộng
đáng kể phạm vi việc agent tự làm được (deploy, kiểm tra log server, vận hành hạ tầng), nhưng đây
là blast radius lớn hơn hẳn `run-command` cục bộ: 1 lệnh sai chạy trên máy thật ở xa có thể gây hậu
quả không sửa lại được như sandbox local (xoá workspace cũ tạo lại được, xoá nhầm dữ liệu server
production thì không).

## Mục tiêu (Goals)

- 1 builtin tool mới (`ssh-execute` — tên chính xác chốt ở ADR) cho agent SSH tới 1 host bất kỳ
  (không whitelist trước — quyết định của user 2026-09-04: agent tự do chọn host, params
  host/port/username/command đều do model điền lúc gọi tool, giống cách `HttpToolBuilder` đã cho
  model tự điền `ai_params`).
- **Approval gate BẮT BUỘC** (quyết định của user, nhất quán ADR-0014) — mọi lệnh SSH đều phải qua
  duyệt tay trước khi chạy thật, không có cách tắt. Card duyệt phải hiện rõ **host + username +
  lệnh** để user biết chính xác lệnh nào chạy ở đâu trước khi bấm duyệt (khác approval card hiện
  tại chỉ hiện tool name + argument JSON chung chung — cần đủ rõ để user không duyệt nhầm).
- Lưu 1 SSH identity (private key) qua cơ chế `Credential` đã có (ADR-0010) — tái dùng, không tạo
  bảng riêng (đúng nguyên tắc domain reuse — `Credential.provider` vốn đã unique, phù hợp "1 SSH
  identity" như user muốn, giống cách `github`/`gemini`/`openai` đã lưu).
- Kết quả lệnh (stdout/stderr/exit code) trả về cho model, giống format `run-command` hiện có.

## Ngoài phạm vi (Non-goals)

- **Không whitelist host trước** — quyết định chủ đích của user (đánh đổi lấy sự linh hoạt), không
  tự thêm cơ chế giới hạn host nào khác thay thế.
- **Không hỗ trợ nhiều SSH identity/multi-key** — v1 chỉ 1 key mặc định dùng cho mọi host (giống
  cách `Credential` hiện chỉ 1 bản ghi/provider). Nhiều key/theo host là mở rộng sau nếu cần thật.
- **Không SFTP/file transfer** — chỉ thực thi lệnh (exec), không upload/download file qua SSH ở v1.
- **Không port-forwarding/tunnel** — chỉ 1 lệnh, 1 kết quả, không giữ session SSH mở lâu dài.
- **Không tự động retry/reconnect** — lỗi kết nối trả thẳng về model như lỗi bất kỳ tool nào khác.

## Thiết kế

Sơ bộ (quyết định kiến trúc cụ thể — thư viện SSH client, connector module, prompt approval card,
migration credential — chốt ở ADR riêng, dự kiến ADR tiếp theo sau ADR-0021, soạn qua `adr-writer`
sau khi spec này được xác nhận):

- Connector mới `app/modules/connector/ssh.py` (cùng pattern `github.py`, ADR-0015 — connector là
  provider độc lập, khác model provider) — cần chọn 1 thư viện async SSH client (candidate:
  `asyncssh`, thuần asyncio, không cần thread pool như Paramiko).
- Builtin tool mới trong `tool/builder.py::BuiltinToolBuilder` (giống `write-file`/`run-command`,
  ADR-0016) — luôn nằm trong `TOOLS_REQUIRING_APPROVAL` (ADR-0014), không có cách khai trừ.
- `Credential` provider mới (`provider="ssh"`) — đã đọc `credential/service.py` thật:
  `CredentialUpsert.api_key: str` xuyên suốt pipeline (`upsert`/`_verify`/`_mask_key`) giả định 1
  string token trần, KHÔNG dễ đổi sang object có cấu trúc mà không sửa pipeline chung (ảnh hưởng
  gemini/openai/github đang chạy). Quyết định đơn giản hoá: `api_key` cho provider `ssh` CHỈ chứa
  private key PEM text (giống hệt GitHub PAT — 1 secret string) — `username`/`host`/`port` đều là
  tham số model tự điền lúc gọi tool (khớp đúng quyết định "agent tự do chọn host" của user, không
  cố định trước username theo credential). `test_connection` cho provider `ssh` CHỈ parse thử PEM
  hợp lệ (xem "Quyết định thêm" bên dưới), không connect SSH thật tới host nào.
- Approval card (`apps/web`) — cần hiện `host`/`username`/`command` rõ ràng, không chỉ dump JSON
  argument chung như card hiện tại (`ApprovalInterruptPanel.tsx`) — có thể cần 1 renderer riêng
  theo tool slug thay vì generic JSON dump.

## Quyết định thêm (chốt với user 2026-09-04)

- **Passphrase**: CÓ hỗ trợ — `CredentialUpsert` thêm 1 field mới `passphrase: str | None = None`
  (optional, mọi provider khác bỏ qua/không set — cùng tinh thần mở rộng schema chung thay vì tạo
  path riêng đã áp dụng cho `Agent.execution_strategy`/`pos_x`/`pos_y` trước đó trong repo). Chỉ
  provider `ssh` đọc field này khi giải mã private key lúc build connector.
- **Test connection**: CHỈ validate format PEM hợp lệ (parse thử private key, không connect SSH
  thật tới host nào) — không cần thêm ô nhập host vào `CredentialManageDialog` chỉ cho riêng
  provider này.

## Câu hỏi mở

- Timeout lệnh SSH bao lâu là hợp lý (giống `run-command` có timeout 30s tự kill) — lệnh chạy trên
  máy khác có thể cần lâu hơn (deploy, build) hay giữ nguyên ngưỡng 30s?
- Approval card hiện tool-specific detail (host/user/command rõ ràng thay vì JSON dump chung) có
  ảnh hưởng tool khác đang dùng chung UI approval hiện tại không, hay chỉ thêm nhánh riêng cho
  `ssh-execute`?

## Acceptance criteria

- [ ] ADR mới (kiến trúc: thư viện SSH client, connector module, credential payload shape) ở
      trạng thái accepted.
- [ ] `Credential` lưu được SSH private key (mã hoá tại rest, cùng cơ chế AES-256-GCM đã có).
- [ ] Tool `ssh-execute` gán được cho agent qua UI (giống tool khác), luôn yêu cầu duyệt.
- [ ] Approval card hiện rõ host/username/command trước khi user duyệt.
- [ ] Live-test thật: SSH tới 1 host thật (VD máy ảo test), chạy lệnh vô hại (`whoami`/`uptime`),
      xác nhận approve → chạy đúng trả kết quả thật; reject → không chạy gì.
