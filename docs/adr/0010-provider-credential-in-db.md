# ADR-0010 — Provider credential (API key) lưu DB có mã hoá, thay vì chỉ `.env`

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-23

## Context

[ADR-0007](0007-resource-model-provider-tool-kb.md) quyết định API key provider (Gemini/OpenAI) chỉ
đọc từ `.env` (`settings.gemini_api_key`/`settings.openai_api_key`), lý do lúc đó: "1 người dùng,
env var đơn giản hơn, tránh bài toán mã hoá secret at-rest". Quyết định đó bị đảo ngược ở đây, dựa
trên 3 vấn đề thật vừa gặp trong chính phiên làm việc build Live Voice Agent ([ADR-0009](0009-live-voice-gemini-live-websocket-relay.md)):

1. **Đổi/thêm API key phải sửa `.env` trên máy chạy server rồi restart tay** — không có cách nào
   làm qua UI/API, trong khi mọi resource khác (Model/Tool/KnowledgeBase/Settings) đều CRUD được
   qua API rồi, riêng credential vẫn là ngoại lệ đòi SSH vào máy sửa file.
2. **Bug thật xảy ra ngay trong phiên này**: lúc debug module `voice`, có chỗ tưởng đọc được
   `GEMINI_API_KEY` qua `os.environ.get(...)` vì key có mặt trong `.env`, nhưng `pydantic-settings`
   chỉ nạp `.env` vào field Pydantic (`settings.gemini_api_key`), **không tự export ra
   `os.environ`** như `python-dotenv` làm — gây nhầm lẫn thật khi debug, mất thời gian truy ngược
   lý do key "không tồn tại" dù rõ ràng có trong file.
3. **Không biết 1 API key hợp lệ hay không cho tới khi thật sự gọi model và gặp lỗi 401/403 giữa
   lúc chat/voice session** — không có bước xác nhận sớm, tức key sai chỉ lộ ra khi user đang dùng
   thật (trải nghiệm tệ, khó debug vì lỗi xuất hiện xa chỗ gây ra).

User đã confirm qua AskUserQuestion trong phiên: đồng ý đảo ngược phần "secret ở đâu" của ADR-0007
(phần resource Model/Tool/KnowledgeBase/AgentTool/AgentKnowledgeBase của ADR-0007 **giữ nguyên**,
không bị ADR này động tới) và chốt luôn các điểm kỹ thuật ở mục Decision dưới đây, tham khảo pattern
đã dùng thật trong `cap` ([docs/research/model-credential-management.md](../research/model-credential-management.md)),
đơn giản hoá cho đúng use-case 1 người dùng (AGENTS.md rule 6).

## Decision

**Entity mới `Credential`**, module riêng `apps/api/app/modules/credential/` theo đúng layering
convention (`model.py`/`schema.py`/`repository.py`/`service.py`/`router.py`/`deps.py`,
[01-backend-fastapi.md](../conventions/01-backend-fastapi.md)):

```
Credential
  id            UUID, PK
  provider      str, UNIQUE       — "gemini" | "openai" (chỉ provider cần key thật; ollama/sglang
                                     không có row Credential vì không cần key — self-host, đã đúng
                                     hiện trạng core/providers.py)
  ciphertext    bytea/text        — AES-256-GCM, xem cơ chế mã hoá bên dưới
  is_valid      bool              — set sau khi test connection thật, KHÔNG mặc định true khi lưu mù
  created_at    datetime
  updated_at    datetime
```

**1 credential/provider** (unique constraint trên `provider`) — không hỗ trợ nhiều credential cùng
provider để rotate. Đây là lược bỏ có chủ đích so với `cap` (nhiều credential/scope), phù hợp use
case 1 người dùng thường chỉ có đúng 1 key/provider tại 1 thời điểm.

**Mã hoá: AES-256-GCM với 1 symmetric key duy nhất**, đọc từ 1 biến env mới `APP_ENCRYPTION_KEY`
(thêm vào `app/core/config.py`, không lẫn với `SECRET_KEY` nếu app đã có key khác dùng cho mục đích
khác). **Không dùng HKDF derive per-tenant như `cap`** — `cap` cần derive key riêng theo tenant vì
multi-tenant, Ultron chỉ 1 user nên 1 key cố định từ env là đủ, không có "tenant" nào khác cần cách
ly. Key material không bao giờ lưu trong DB hay commit vào repo (đúng rule "không commit secret",
AGENTS.md).

**Không có FK `Model → Credential`.** `Model` (DB, ADR-0007) giữ nguyên field `provider` đã có —
lúc build chat model, `app/core/providers.py` tự tra `Credential` theo `provider` (thay vì đọc
`settings.gemini_api_key`/`settings.openai_api_key` như hiện tại):

```python
def build_chat_model(provider: str, model_id: str, base_url: str | None) -> BaseChatModel:
    if provider in {"gemini", "openai"}:
        api_key = credential_service.get_decrypted_key(provider)  # tra theo provider, không theo Model cụ thể
        ...
    # ollama/sglang: base_url, không cần credential
```

Không cần chọn thủ công "Model X dùng Credential nào" — mọi `Model` cùng `provider` dùng chung 1
credential (đúng tinh thần "đơn giản nhất cho use-case 1 người dùng").

**Model capability catalog (vision/tools/json_mode/context window...) là static code catalog**,
KHÔNG phải bảng DB — thêm module mới (vd `app/core/model_catalog.py` hoặc tương đương trong
`core/`) chứa mapping `provider + model_id → capabilities`. Học trực tiếp từ `cap`: `cap` từng đề
xuất DB-catalog + per-tenant entitlement (ADR-0019 của `cap`) rồi phải **park** vì thừa cho
single-tenant — Ultron tránh lặp lại sai lầm đó ngay từ đầu bằng cách không build DB table cho cái
này.

**Test connection khi lưu**: `CredentialService.create`/`update` sau khi lưu ciphertext, gọi thật
API rẻ nhất của provider tương ứng để verify (vd Gemini `GET /v1beta/models` — đã dùng thật trong
phiên build voice module để tra danh sách model Live), set `is_valid` theo kết quả thật — không lưu
mù rồi để user tự phát hiện lúc chat fail (đúng vấn đề #3 ở Context).

**Không auto-migrate key cũ từ `.env` sang DB.** Sau khi deploy tính năng này, user tự nhập lại key
qua UI 1 lần. Đây là quyết định có chủ đích, không phải thiếu sót — key cũ chỉ là 1-2 dòng plaintext
trong `.env`, viết migration script tự động đọc `.env` lúc chạy Alembic để insert vào DB không đáng
effort so với việc user tự gõ lại 1 lần.

**UI: dialog 3 cột**, mở từ trang Models hiện có (`apps/web/src/app/models/`), KHÔNG phải route
riêng — đúng cách `cap` làm (`CredentialManageDrawer` không có route top-level):

- Cột trái: filter theo provider (mặc định chọn hết).
- Cột giữa: model + capability badge (đọc từ static catalog nói trên).
- Cột phải: credential hiện có cho provider đang chọn (mask secret, badge `is_valid`, nút Test
  connection/Xoá/Thêm).

**Cập nhật ADR-0007**: phần "Alternatives considered" của ADR-0007 — mục "Provider/API-key lưu
trong `Model` row (DB): loại — cần mã hoá at-rest..." — coi như **superseded bởi ADR-0010** kể từ
đây. Phần resource Model/Tool/KnowledgeBase/AgentTool/AgentKnowledgeBase của ADR-0007 không đổi.

## Consequences

- ✅ Đổi/thêm API key qua UI, không cần sửa `.env` + restart server.
- ✅ Biết credential có hợp lệ hay không ngay lúc lưu (test connection thật), không đợi tới lúc chat
  mới phát hiện lỗi 401/403.
- ✅ Capability catalog tĩnh trong code — không tốn công build/maintain 1 bảng DB thừa cho use-case
  1 người dùng, tránh lặp lại sai lầm `cap` đã tự sửa (ADR-0019 park).
- ✅ Model không cần chọn thủ công credential — tra theo `provider` là đủ, giữ đúng field `Model`
  hiện có, không cần migration thêm FK/cột mới trên bảng `models`.
- ⚠️ **1 credential/provider, không rotate được mà không downtime** (phải xoá + tạo lại). Chấp nhận
  vì use-case 1 người dùng hiếm khi cần 2 key cùng provider chạy song song; nếu cần rotate sau này,
  đó là 1 ADR riêng (thêm concept version/history), không mở rộng ADR này trước.
- ⚠️ **1 symmetric key duy nhất từ `APP_ENCRYPTION_KEY`** — nếu key này lộ, toàn bộ credential
  trong DB bị lộ theo (không có per-tenant isolation như `cap`, nhưng Ultron cũng không có tenant
  nào khác để cách ly). Chấp nhận vì đây đúng model bảo mật "1 user, 1 máy chủ" — tương đương mức
  bảo vệ của `.env` file cũ (ai đọc được máy chủ thì đọc được key), không kém an toàn hơn.
- ⚠️ **Không migrate `.env` cũ tự động** — sau khi deploy, key hiện tại trong `.env` tạm thời "vô
  hình" với code mới cho tới khi user nhập lại qua UI. Cần note rõ trong changelog/release khi
  triển khai để user không bất ngờ khi model đột nhiên báo thiếu credential.
- ⚠️ **`app/core/config.py` vẫn giữ field `gemini_api_key`/`openai_api_key` cũ hay xoá luôn** — để
  `solution-architect` quyết lúc lập plan (có thể giữ tạm làm fallback đọc-only trong 1 giai đoạn
  chuyển tiếp, hoặc xoá hẳn ngay — không quyết trong ADR này vì đây là chi tiết implementation, không
  phải quyết định kiến trúc).

## Alternatives considered

- **AES-256-GCM + HKDF derive key per-tenant (như `cap`)**: loại — `cap` cần vì multi-tenant, phải
  cách ly key giữa các tenant khác nhau; Ultron chỉ 1 user, không có "tenant" nào khác cần cách ly,
  nên 1 symmetric key cố định từ env là đủ, tránh phức tạp không cần thiết.
- **DB-catalog cho model capabilities (bảng riêng, có thể sửa runtime)**: loại — `cap` từng làm
  hướng này (ADR-0019) rồi phải park vì thừa cho single-tenant; Ultron học thẳng bài học đó, dùng
  static code catalog ngay từ đầu thay vì tự đi lại con đường đã biết là ngõ cụt.
- **Nhiều credential/provider để rotate**: loại — thừa cho use-case 1 người dùng hiện tại (thường
  chỉ có đúng 1 key/provider); nếu cần rotate zero-downtime sau này, đó là 1 quyết định riêng cần
  ADR mới, không thêm độ phức tạp ngay bây giờ khi chưa có nhu cầu thật.
- **Auto-migrate key cũ từ `.env` sang DB lúc chạy migration**: loại — effort viết + test migration
  script không đáng so với việc user tự nhập lại 1-2 key qua UI đúng 1 lần sau khi deploy; đồng thời
  tránh rủi ro đọc nhầm/insert sai giá trị plaintext cũ vào DB một cách âm thầm.
- **FK `Model → Credential` cụ thể (chọn credential cho từng Model)**: loại — thừa linh hoạt so với
  nhu cầu thật; user 1 người thường chỉ có 1 key/provider, tra theo `provider` tại thời điểm build
  chat model là đủ, giữ `Model` đơn giản đúng ADR-0007.
