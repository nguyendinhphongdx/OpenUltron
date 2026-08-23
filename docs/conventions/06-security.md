# Convention — Security

> Canonical duy nhất cho security cross-cutting. `backend-engineer`/`frontend-engineer`/
> `code-reviewer` trỏ vào đây. Ultron **không multi-tenant** (AGENTS.md rule 6) — phần tenant
> isolation của các repo SaaS khác **không áp dụng** ở đây, cố ý bỏ, không phải thiếu.

## Áp dụng cho Ultron (đã lược bỏ phần tenant/RBAC không liên quan)

1. **No secret committed** — API key Gemini/OpenAI không hardcode, không commit vào code/`.env`
   không gitignore. **Cập nhật (ADR-0010, supersede phần "secret" của
   [ADR-0007](../adr/0007-resource-model-provider-tool-kb.md))**: provider credential (Gemini/
   OpenAI API key) giờ lưu trong bảng `credentials` (module `app/modules/credential/`), **mã hoá
   AES-256-GCM tại rest** qua `app/core/crypto.py` (`encrypt`/`decrypt`, pure function — không bọc
   class), key mã hoá đọc từ `APP_ENCRYPTION_KEY` (`.env`, qua `app/core/config.py`, KHÔNG bao giờ
   lưu key mã hoá này trong DB). Vẫn giữ nguyên rule cứng: **không bao giờ log plaintext API
   key/`APP_ENCRYPTION_KEY`** (chỉ log `provider`, `is_valid` — xem
   [`07-logging-observability.md`](07-logging-observability.md)); response API (`CredentialRead`)
   chỉ trả `masked_key` (vd `"sk-...ab12"`), không bao giờ trả plaintext hay ciphertext thô.
2. **Validate ở boundary** — input HTTP qua Pydantic schema (`schemas.py`), không trust input nội
   bộ giữa service (nhưng cũng không validate lại y hệt ở mọi layer — Pydantic ở router/schema là
   đủ, service tin schema đã validate).
3. **Output encode** — SQL luôn qua SQLAlchemy parameterized (không string-concat query), FE luôn
   escape qua React (không `dangerouslySetInnerHTML` với content từ user/LLM chưa sanitize).
4. **Không log PII/secret** — xem [`07-logging-observability.md`](07-logging-observability.md)
   mục PII redaction.
5. **Tool execution có ranh giới rõ** — tool chạy lệnh trên máy (roadmap "Tool thật tự viết... có
   approval gate") phải qua approval gate trước khi thực thi, không tự động chạy lệnh tuỳ ý từ output
   LLM (prompt injection từ nội dung web/tool result khác không được tự leo quyền chạy lệnh mới).

## Secret management

```text
.env                     ← gitignored, mỗi máy tự config
.env.example             ← committed, placeholder value
infra/                   ← docker-compose, KHÔNG chứa secret thật committed
```

Đọc secret qua `app/core/config.py` (`pydantic-settings`, `BaseSettings` đọc `.env`) — service
import `settings` từ đây, **không** `os.environ["X"]`/`os.environ.get("X")` rải rác trong code.

**Lý do kỹ thuật, không chỉ là style**: `pydantic-settings` đọc `.env` vào field của `Settings`
object — nó **không** export biến đó ra `os.environ` của process (khác `python-dotenv`'s
`load_dotenv()`). Code nào lỡ đọc `os.environ.get("GEMINI_API_KEY")` thay vì `settings.gemini_api_key`
sẽ **luôn nhận `None`** dù `.env` có giá trị thật — bug này từng xảy ra thật ở `core/providers.py`
và `voice/gemini_live_client.py` (phát hiện lúc live-test với `GEMINI_API_KEY` thật, không phải lúc
review code). Thêm biến env mới → thêm
field vào `Settings` class (fail-fast nếu thiếu, do Pydantic validate lúc khởi động).

Provider API key (Gemini/OpenAI) là secret nhạy cảm nhất trong repo. **Cập nhật (ADR-0010)**: key
không còn đọc từ env lúc runtime nữa — lưu mã hoá trong bảng `credentials`, tra theo `provider` qua
`CredentialService.get_decrypted_key` (chỉ dùng nội bộ bởi `app/core/providers.py`, KHÔNG expose
qua router). Vẫn giữ nguyên: **không** bao giờ lưu key vào cột DB của `Model`/`Agent` (dù có field
`extra_config` JSON, không nhét key vào đó) — `Model`/`Agent` không tham chiếu `Credential`, chỉ
tra theo `provider` (ADR-0010, tránh thêm FK không cần thiết cho use-case 1 người dùng).

## Input validation (boundary)

```python
# HTTP boundary — Pydantic schema tự validate qua FastAPI
@router.post("/agents")
async def create_agent(payload: AgentCreate, service: AgentService = Depends(get_agent_service)):
    return await service.create(payload)

# Business validation (thứ Pydantic schema không tự làm được, ví dụ check FK tồn tại)
# → raise ValidationFailedError trong service, xem 04-error-handling.md
```

- Không trust `Content-Type` cho file upload (khi có feature upload — hiện chưa có) — check magic
  bytes nếu/khi thêm tính năng đó, không chỉ tin header.
- LangGraph tool call: tool nhận input từ LLM — vẫn phải qua Pydantic schema của tool trước khi thực
  thi hành động thật (đọc file, gọi API ngoài, chạy lệnh) — không trust argument LLM sinh ra là an
  toàn tuyệt đối, đặc biệt tool có side-effect.

## Output sanitization

| Source | Sink | Cần gì |
|---|---|---|
| User/LLM text | HTML render (`apps/web`) | React tự escape — không dùng `dangerouslySetInnerHTML` trừ khi đã qua sanitize (`dompurify`) |
| User/LLM text | SQL | SQLAlchemy parameterized — không string-format query |
| LLM tool call argument | Shell command (tool tự viết sau) | **Tuyệt đối không** `subprocess.run(..., shell=True)` với argument LLM sinh ra chưa validate; dùng arg list + allowlist lệnh |
| LLM output | Markdown render (chat UI) | Sanitize trước render nếu render HTML từ Markdown (XSS qua `<script>`/`<img onerror>` trong output LLM) |

## Rate limiting

Ultron 1 người dùng, chạy local/self-host — chưa cần rate limit per-tenant/per-key như SaaS. Vẫn nên
có khi mở channel ngoài (Telegram/webhook — roadmap "Channel điện thoại"):

| Resource | Mức đề xuất khi có channel ngoài |
|---|---|
| Webhook/channel vào (Telegram/WhatsApp) | Giới hạn cơ bản chống spam/loop vô hạn — chưa quyết số cụ thể, quyết khi làm channel đó (ADR riêng nếu cần) |
| LLM invocation | Không giới hạn cứng (1 người dùng), nhưng nên log cost/token để tự theo dõi (xem logging) |

## Headers (khi expose ra ngoài local, ví dụ deploy thật)

Cấu hình CORS ở `apps/api/app/main.py` — origin whitelist (không `*`) khi deploy, cho phép rộng hơn
khi chạy dev local. Chưa cần `helmet`-style header đầy đủ (HSTS/CSP) khi chỉ chạy local — thêm khi
thật sự expose public.

## Anti-pattern

- ❌ Hardcode API key "tạm để test" — quên revert, leak nếu commit.
- ❌ Lưu API key provider **plaintext** vào DB (cột `extra_config` hay bất kỳ đâu) — chỉ
  `Credential.ciphertext` (mã hoá qua `app/core/crypto.py`, ADR-0010) mới được lưu, và chỉ ở bảng
  `credentials`, không lẫn vào `Model`/`Agent`.
- ❌ Trả plaintext/ciphertext của `Credential` ra response API — chỉ trả `masked_key`.
- ❌ `subprocess`/`eval`/`exec` với input từ LLM tool call chưa qua allowlist/schema.
- ❌ Log raw request body chứa token/API key.
- ❌ Catch lỗi security rồi nuốt (`except: pass`).
- ❌ Trust tool argument LLM sinh ra là an toàn cho hành động có side-effect (file/network/shell).

## Self-check trước khi xong

- [ ] Không secret hardcode/lưu DB — chỉ qua `app/core/config.py`/`.env`.
- [ ] Input HTTP có Pydantic schema validate.
- [ ] Tool mới có side-effect (file/network/shell) → có validate argument + (nếu chạy lệnh máy) có
      approval gate, không tự động thực thi mù.
- [ ] Không log PII/secret (xem `07-logging-observability.md`).
- [ ] Không multi-tenant/RBAC mới (rule 6) trừ khi có ADR khác.
