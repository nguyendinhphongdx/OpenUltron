# Feature: Quản lý provider credential (API key) qua DB + UI

Status: draft

## Vấn đề / động lực

Hiện tại (ADR-0007) API key provider (`GEMINI_API_KEY`, `OPENAI_API_KEY`) chỉ đọc từ `.env` qua
`settings.gemini_api_key`/`settings.openai_api_key` (`app/core/config.py`). Vấn đề cụ thể đang gặp:

- Đổi/thêm API key phải sửa file `.env` trên máy chạy server rồi **restart** — không có cách làm
  qua UI hay API, dù các resource khác (Model/Tool/KnowledgeBase/Settings) đều CRUD được qua API.
- `pydantic-settings` đọc `.env` vào field Pydantic nhưng **không export ra `os.environ`** cho tiến
  trình (khác `python-dotenv`) — đã gây confusion thật trong 1 session debug trước đó (tưởng key đã
  set vì có trong `.env` nhưng code đọc `os.environ.get(...)` trực tiếp sẽ không thấy).
  Chưa có ai vô tình phạm lỗi đó trong code hiện tại, nhưng đây là 1 lớp friction thật khi
  thêm/verify key.
- Không biết 1 API key có hợp lệ hay không cho tới khi thực sự gọi model và gặp lỗi (401/403) giữa
  lúc chat — không có bước xác nhận sớm.
- Khi có nhiều provider (ollama/gemini/openai/sglang, xem ADR-0007) và nhiều model mỗi provider,
  không có nơi nào nhìn tổng quan "provider nào đã có key, model nào dùng được, capabilities của
  từng model" — hiện `Model` (DB) chỉ có `provider`/`model_id`/`base_url`, không có capabilities.

## Mục tiêu (Goals) — nháp, cần user confirm

- Lưu credential (API key) provider trong **database** thay vì chỉ `.env`, có mã hoá at-rest (cơ
  chế cụ thể — xem "Câu hỏi mở", không tự chọn ở spec này).
- Có UI quản lý credential dạng **1 dialog 3 cột** (theo mô tả user):
  - Cột trái: danh sách provider, có bộ lọc, **mặc định chọn hết** provider (không lọc gì).
  - Cột giữa: danh sách model của (các) provider đang lọc, kèm capabilities của từng model (vd
    tools/vision/json_mode/context window).
  - Cột phải: credential hiện có cho provider đang chọn (list/thêm/sửa/xoá), secret bị mask.
- Verify credential khi lưu (gọi thử API provider — học từ cap's `testConnection`), hiển thị trạng
  thái valid/invalid ngay trong UI.

## Ngoài phạm vi (Non-goals) — nháp, để user xác nhận ranh giới

- Chưa rõ — xem "Câu hỏi mở". Không tự bịa Non-goals cho gọn (vd chưa chắc "multi-credential per
  provider để rotate" có nằm trong scope lần này hay không, để user quyết).

## Thiết kế

> Chỉ mô tả UX/flow, KHÔNG quyết kiến trúc mã hoá/lưu trữ — việc đó thuộc về ADR mới +
> `solution-architect`.

### Đây là thay đổi ADR-0007, không phải mở rộng êm đềm

[ADR-0007](../adr/0007-resource-model-provider-tool-kb.md) mục "Alternatives considered" đã **loại
rõ** phương án "Provider/API-key lưu trong `Model` row (DB)" với lý do: "cần mã hoá at-rest, thêm
phức tạp không cần thiết cho 1 người dùng, env var đơn giản hơn và an toàn tương đương". Feature
này **đảo ngược quyết định đó**. Trước khi code: cần 1 ADR mới supersede phần liên quan của
ADR-0007 (không sửa trực tiếp ADR cũ — theo convention ADR immutable, viết ADR mới ghi rõ lý do đổi
ý và trạng thái cũ chuyển `superseded`).

### UX flow (dialog 3 cột)

1. User mở dialog quản lý credential (entry point cụ thể — từ đâu mở, xem "Câu hỏi mở": có thể từ
   trang Models hiện có, hoặc 1 nút riêng).
2. Cột trái hiện toàn bộ provider đã biết (ollama/gemini/openai/sglang — theo catalog tĩnh, xem
   research), mỗi provider có checkbox filter, **mặc định tick hết**.
3. Cột giữa hiện danh sách model thuộc (các) provider đang được tick ở cột trái, mỗi model kèm
   badge capabilities (tools/vision/json_mode/thinking, context window...). Nguồn dữ liệu
   capabilities: catalog tĩnh trong code (xem `docs/research/model-credential-management.md` mục
   Insight) — không phải DB table, trừ khi ADR quyết khác.
4. Chọn 1 model (hoặc 1 provider) ở cột giữa → cột phải hiện credential đã lưu cho provider đó:
   tên credential, secret mask (vd `sk-...ab12`), trạng thái valid/invalid (badge), thời điểm test
   gần nhất. Có nút "Thêm credential", "Test connection", "Xoá".
5. Lưu credential mới → validate format tối thiểu → gọi thử API provider (test connection) → set
   trạng thái valid/invalid → lưu (encrypted) vào DB.

### Liên quan `Model` (DB, đã có)

`Model` hiện có field `provider`/`model_id`/`base_url` nhưng không tham chiếu credential nào — agent
chạy model nào cũng đọc chung 1 key theo provider từ `.env`. Feature này cần quyết (để
`solution-architect`): `Model` có cần thêm FK tới `Credential` mới hay không, hay 1 credential dùng
chung cho mọi `Model` cùng provider (đơn giản hơn, đủ cho 1 user thường chỉ có 1 key/provider).

## Câu hỏi mở

- **Đồng ý đảo ngược quyết định ADR-0007 (không lưu secret DB) không?** Đây là điều kiện tiên quyết
  trước khi qua `solution-architect` — nếu không đồng ý, feature này dừng ở đây.
- **Cơ chế mã hoá**: đơn giản hoá thế nào so với cap (AES-256-GCM + HKDF per-tenant)? Ví dụ 1
  symmetric key duy nhất từ biến env mới (`CREDENTIAL_ENCRYPTION_KEY`) — nhưng thuật toán/thư viện
  cụ thể để ADR mới quyết, không tự chọn ở đây.
- **Entry point mở dialog**: từ trang Models hiện có (nút "Manage credentials"), hay 1 mục menu
  riêng, hay mở tự động khi tạo `Model` mới chưa có credential hợp lệ?
- **1 credential dùng chung cho cả provider, hay có thể có nhiều credential/provider** (để rotate,
  hoặc dùng nhiều key cho cùng provider)? Ảnh hưởng trực tiếp thiết kế cột phải (list vs single
  form).
- **`Model` có cần FK tới `Credential` mới, hay chỉ cần "provider nào có credential valid thì mọi
  `Model` cùng provider dùng chung"** — đơn giản hơn nhưng kém linh hoạt hơn cap.
- **Provider `ollama`/`sglang` (self-host, thường không cần API key)** có cần xuất hiện trong dialog
  này không, hay dialog chỉ áp dụng cho provider cần key thật (gemini/openai)?
- **Có cần migrate key hiện có trong `.env` sang DB tự động** (1 lần, lúc migration) hay user tự
  nhập lại qua UI?
- Capabilities hiển thị ở cột giữa lấy từ catalog tĩnh nào — đã có sẵn danh sách capabilities per
  model/provider ở đâu trong code hiện tại, hay cần tạo mới catalog này từ đầu (nếu cần tạo mới,
  đây cũng là 1 phần việc `solution-architect` cần lên kế hoạch)?

## Acceptance criteria

- [ ] (Chờ chốt Goals/Non-goals + câu hỏi mở, và có ADR mới supersede phần liên quan của ADR-0007,
      trước khi viết AC cụ thể.)
