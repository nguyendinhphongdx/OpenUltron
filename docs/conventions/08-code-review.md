# Code review checklist

> **Checklist canonical duy nhất** cho mọi review trong Ultron — dùng bởi subagent `code-reviewer`
> và self-check của `backend-engineer`/`frontend-engineer`/`qa-engineer` trước khi báo done. Các nơi
> đó **KHÔNG liệt kê lại** — trỏ vào đây. (Pattern giống `cap`'s `10-code-review.md`.)

Khác với "Self-check trước khi xong" ở từng convention doc ([01](01-backend-fastapi.md)/
[02](02-frontend-nextjs.md)/[03](03-testing.md).../[07](07-logging-observability.md)) — những mục
đó là checklist nhanh cho tác giả tự soát theo từng domain riêng; file này là checklist **review
đầy đủ, có phân severity**, dùng khi review 1 diff hoàn chỉnh (có thể đụng nhiều domain cùng lúc).

## Cách dùng

1. `git status`/`git diff` xem thay đổi thật.
2. Soát đủ 8 nhóm dưới, map mỗi finding vào severity 🔴/🟡/🟢.
3. Output: `file:line — issue — fix`, nhóm theo severity, nặng nhất trước.

## Checklist (8 nhóm)

### 1. Layering & module boundary

- [ ] `apps/api`: router không business logic, service không import repository module khác
      (`uv run python scripts/check_module_boundaries.py` xanh).
- [ ] `apps/web`: feature-folder layering đúng thứ tự (`types→services→hooks→components`).
- [ ] Module mới khớp mẫu (`apps/api/app/modules/model/`, `apps/web/src/features/conversation/`).

### 2. Error handling — 🔴 nếu vi phạm

- [ ] Service raise domain error (`UltronError`/subclass), không raise `HTTPException` trực tiếp.
- [ ] Code mới → đã thêm vào bảng error code ở [`04-error-handling.md`](04-error-handling.md).
- [ ] Response không leak traceback/internal path.

### 3. Security — 🔴

- [ ] Không hardcode/lưu DB secret (API key provider).
- [ ] Không đọc secret qua `os.environ.get(...)` trực tiếp — luôn qua `settings.*`
      (`app/core/config.py`); `os.environ` KHÔNG có giá trị `.env` trừ khi code tự
      `load_dotenv()` (xem [06-security.md](06-security.md)) — bug thật đã xảy ra 1 lần.
- [ ] Input HTTP có Pydantic schema validate.
- [ ] Tool mới có side-effect (file/network/shell) → validate argument, có approval gate nếu chạy
      lệnh máy — không trust argument LLM sinh ra mù.
- [ ] Không multi-tenant/workspace/RBAC mới (AGENTS.md rule 6) trừ khi có ADR khác.

### 4. Logging

- [ ] Không `print()` mới trong `apps/api/app` — dùng `logger` (`app/core/logging.py`).
- [ ] Log có `event` field theo convention `<resource>.<action>`, có field context liên quan
      (`conversation_id`/`agent_id`/`tool_name`).
- [ ] Không log PII/secret.

### 5. Naming

- [ ] Đúng casing per-language ([`05-naming.md`](05-naming.md)), không mix trong 1 file.
- [ ] Field JSON mới vẫn `snake_case` — không tự đổi camelCase.
- [ ] Entity mới → có trong "Domain glossary" của `05-naming.md`.

### 6. Test

- [ ] Code mới có test tương ứng (unit hoặc integration — [`03-testing.md`](03-testing.md)).
- [ ] `apps/api`: test integration dùng DB thật (testcontainer), không mock repository.
- [ ] Edge case/invariant (không chỉ happy path) có test reject.
- [ ] `apps/web`: golden path + 1 edge case đã verify tay trong browser (nếu chưa có test tự động).

### 7. Scope / ADR — 🔴 nếu vi phạm

- [ ] Không vượt scope yêu cầu (AGENTS.md rule 2) — feature không nhỏ mà chưa có
      `docs/features/<slug>.md` thì đây là vấn đề, không phải chi tiết code.
- [ ] Quyết định kiến trúc mới (thư viện lớn, đổi storage, đổi cách agent gọi nhau) → có ADR, không
      code trước rồi giải thích sau (AGENTS.md rule 3).
- [ ] Convention chưa cover case này → đã đề xuất bổ sung trước khi code (rule 4), không tự nghĩ
      pattern riêng.

### 8. Hygiene

- [ ] Không `console.log`/`print`/`debugger`/`it.only`/`pytest.mark.skip` sót lại.
- [ ] Không commit `.env`/secret/file build.
- [ ] Conventional Commits, không dead code/block comment-out.
- [ ] `import openjarvis` không tồn tại ở `apps/api/app` (rule 1).

## Severity

| Mức | Gồm |
|---|---|
| 🔴 **Blocker** (phải sửa) | Security, error handling sai (raise HTTPException/leak trace), scope creep (multi-tenant/vượt scope), thiếu ADR cho quyết định kiến trúc thật |
| 🟡 **Warning** (nên sửa) | Lệch convention layering/naming, thiếu test, thiếu log field |
| 🟢 **Nit** (tùy chọn) | Style/format (ruff/prettier lo), tên biến chưa tối ưu |
