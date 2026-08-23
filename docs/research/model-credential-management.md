# Research: Quản lý provider API key/credential qua DB + UI

Liên quan spec: `docs/features/model-credential-management.md`

## Câu hỏi nghiên cứu

Hiện tại `apps/api` đọc API key provider (Gemini/OpenAI) từ `.env` (`settings.gemini_api_key`,
`settings.openai_api_key`) — quyết định có chủ đích ở [ADR-0007](../adr/0007-resource-model-provider-tool-kb.md)
("tránh bài toán mã hoá secret at-rest" cho 1 người dùng). User muốn đổi sang lưu DB + có UI quản
lý (dialog 3 cột: provider → model + capabilities → credential). Câu hỏi cần trả lời trước khi viết
spec:

1. Đổi sang lưu DB thì mã hoá thế nào cho vừa đủ (không cần phức tạp như hệ multi-tenant) nhưng vẫn
   an toàn hơn plaintext DB?
2. "Model + capabilities" hiển thị ở cột giữa lấy từ đâu — DB table hay static catalog trong code?
3. Có nên verify credential thật (gọi API provider) ngay lúc lưu, hay chỉ lưu và để lỗi xảy ra lúc
   chat?
4. UI quản lý credential nên là 1 trang riêng hay 1 dialog gắn vào chỗ khác (theo model đang chọn)?

## Sản phẩm/tài liệu tham khảo

- **cap** (`/Users/dinhphong/Documents/C-OpenAI/cap`, đọc trực tiếp code, không phải research
  từ trí nhớ — đã cho 1 agent đọc code thật và đối chiếu lại 2 file dưới đây): nền tảng multi-tenant
  nội bộ, có bảng `credentials` lưu DB, mã hoá per-tenant, UI quản lý credential gắn vào chỗ chọn
  model chứ không phải trang top-level riêng.

### Đối chiếu code cap (đọc trực tiếp)

- `apps/api/src/domains/credential/credential.entity.ts` — bảng `credentials`: `credentialType`,
  `purpose`, `name`, `scope` (tenant/workspace/user), `workspaceId`, `ciphertextEncrypted`
  (AES-256-GCM, key derive **per-tenant** qua HKDF từ `APP_ENCRYPTION_KEY` env), `publicConfig`
  (jsonb — field không nhạy cảm như `baseUrl`), `isValid`, `expiresAt`, `rotatedAt`. Chỉ field đánh
  dấu `SECRET` trong Zod schema (`CREDENTIAL_REGISTRY`) mới bị encrypt trước khi lưu.
- `apps/api/src/libs/llm/llm.catalog.ts` (kiểu Zod ở `packages/shared`) — `MODEL_CATALOG`/
  `PROVIDERS` (capabilities: tools/vision/json_mode/thinking, contextWindow, maxOutput) là
  **static code catalog**, KHÔNG phải DB table. ADR-0019 của cap có đề xuất DB-catalog + per-tenant
  entitlement nhưng **bị park** (chưa dùng) vì deployment hiện tại chỉ single-tenant nội bộ — bài
  học áp dụng trực tiếp cho Ultron (cũng single-user).
- `ModelConfigEntity` (`model_configs` table) — preset đặt tên, bind `modelId` (vd
  `"openai/gpt-4o"`) + `temperature`/`maxTokens` tới 1 `credentialId` FK. Đây là lớp trung gian
  giữa "model" (catalog tĩnh) và "credential" (DB) — Model của Ultron hiện đã đóng vai gần giống
  `ModelConfigEntity` (có `provider`, `model_id`, `base_url`) nhưng chưa có credential FK.
- `CredentialService.create/update` — validate plaintext qua Zod schema theo `credentialType`
  (`CREDENTIAL_REGISTRY`), encrypt, lưu. `testConnection` gọi thật API provider (`GET /v1/models`
  cho OpenAI, tương đương cho Anthropic/Google/Ollama) để set `isValid` ngay lúc lưu — không đợi
  tới lúc chat mới biết key sai.
- UI: **không có trang top-level `/credentials`** — sống dưới dạng `CredentialManageDrawer.tsx`
  (Sheet list/edit/delete/test, mask secret, badge validity theo `isValid`),
  `CredentialPickerDialog.tsx`/`CredentialPickerPanel.tsx` (mở khi gắn credential vào 1
  model-config/tool), `ConnectCredentialDialog.tsx` — tất cả ở `apps/web/src/features/credential/`.
  `apps/web/src/app/(main)/models/hub/page.tsx` là trang browse-catalog kiểu marketplace (đọc
  static catalog), không phải trang quản lý credential.
- Không tìm thấy ADR riêng "credential lưu DB vs env" trong `docs/adr/` của cap — quyết định lưu DB
  có vẻ có từ đầu dự án (multi-tenant ngay từ gốc), không phải 1 quyết định đảo chiều có ghi lại.

## So sánh

| Khía cạnh | cap | Ultron hiện tại (ADR-0007) | Đề xuất cho Ultron |
|---|---|---|---|
| Nơi lưu credential | DB (`credentials` table) | `.env` (`settings.*_api_key`) | DB — đây là thay đổi ADR-0007, cần ADR mới |
| Mã hoá | AES-256-GCM, key derive **per-tenant** (HKDF từ `APP_ENCRYPTION_KEY`) | Không cần (không lưu DB) | Cần mã hoá, nhưng **1 key duy nhất** từ env, không cần HKDF per-tenant (không có "tenant" nào khác ngoài chính user) |
| Model + capabilities | Static code catalog (`llm.catalog.ts`), KHÔNG phải DB table | `Model` là DB row nhưng không có field capabilities | Giữ catalog tĩnh trong code (provider/model/capabilities), `Model` DB row chỉ cấu hình instance — tách 2 khái niệm như cap |
| Verify credential | `testConnection` gọi API thật lúc lưu, set `isValid` | Không có — lỗi phát hiện lúc chat | Nên học: test connection ngay khi lưu credential |
| UI | Drawer/Dialog gắn vào chỗ chọn model, không phải trang riêng | Chưa có UI | User đã chỉ định rõ: 1 dialog 3 cột (không phải trang riêng) — khớp tinh thần cap |
| Scope credential | tenant/workspace/user (3 cấp) | Không có khái niệm này | **Không áp dụng** — Ultron 1 user, không cần scope |

## Insight áp dụng cho Ultron

- **Mã hoá đơn giản hơn cap nhiều**: vì chỉ 1 user, không cần HKDF derive key per-tenant. Có thể
  dùng 1 symmetric key duy nhất (vd Fernet/AES-GCM) đọc từ 1 biến env mới (kiểu
  `CREDENTIAL_ENCRYPTION_KEY`), không cần bài toán key-rotation-per-tenant của cap. Cơ chế cụ thể
  (thuật toán, thư viện, cách quản lý key) để `solution-architect`/ADR quyết, không tự chọn ở đây.
- **Catalog capabilities nên là static code catalog**, giống cap, không phải DB table — trừ khi có
  lý do thật cần đổi capabilities tại runtime (không có ở Ultron hiện tại). Tránh lặp lại việc cap
  từng đề xuất DB-catalog (ADR-0019) rồi park vì thừa cho single-tenant.
- **Nên có bước "test connection" thật** khi lưu credential (gọi thử API provider), học từ
  `CredentialService.testConnection` — tránh tình huống lưu key sai, không biết cho tới khi chat.
- **UI nên là dialog/overlay gắn vào chỗ quản lý Model**, không phải trang top-level riêng — đúng
  cách cap làm (`CredentialManageDrawer` không có route riêng) và đúng với mô tả user (dialog 3
  cột, không phải page).
- `Model` (DB row hiện tại của Ultron: slug/provider/model_id/base_url) đóng vai gần giống
  `ModelConfigEntity` của cap — hướng tự nhiên là thêm 1 bảng `Credential` mới, `Model` giữ/thêm FK
  trỏ tới credential thay vì đọc thẳng `.env`. Đây là gợi ý hướng đi, không phải thiết kế chốt —
  `solution-architect` quyết layout bảng thật.

## Không áp dụng / ngoài phạm vi

- **`scope` (tenant/workspace/user) và `workspaceId`** — cap multi-tenant cần phân biệt credential
  thuộc tenant nào; Ultron 1 người dùng (AGENTS.md rule 6) không có khái niệm workspace/tenant, mọi
  credential đều "của user duy nhất".
- **HKDF derive key riêng cho từng tenant** — không cần vì không có nhiều tenant để cách ly.
- **Entitlement theo tenant cho catalog model** (ADR-0019 cap, đã park) — Ultron không cần vì chỉ 1
  người dùng, không có khái niệm "gói dịch vụ khác nhau cho user khác nhau".
- **`purpose`/multi-credential-per-provider ở mức phức tạp cap hỗ trợ** (1 provider có nhiều
  credential cho nhiều mục đích khác nhau trong nhiều workspace) — có thể vẫn hữu ích ở mức đơn
  giản hơn (1 provider có thể có >1 key, vd để rotate) nhưng không cần đầy đủ như cap; để "Câu hỏi
  mở" trong spec, không tự quyết.
