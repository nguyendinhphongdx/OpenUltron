# Code review checklist

> **Checklist canonical duy nhất** cho mọi review trong Ultron — dùng bởi subagent `code-reviewer`
> và self-check của `backend-engineer`/`frontend-engineer`/`qa-engineer` trước khi báo done. Các nơi
> đó **KHÔNG liệt kê lại** — trỏ vào đây. (Pattern giống `cap`'s `10-code-review.md`.)

Khác với "Self-check trước khi xong" ở từng convention doc ([01](01-backend-fastapi.md)/
[02](02-frontend-nextjs.md)/[03](03-testing.md).../[07](07-logging-observability.md)) — những mục
đó là checklist nhanh cho tác giả tự soát theo từng domain riêng; file này là checklist **review
đầy đủ, có phân severity**, dùng khi review 1 diff hoàn chỉnh (có thể đụng nhiều domain cùng lúc).

## Cách dùng

1. `git status`/`git diff` xem thay đổi thật (review diff — `code-reviewer`) hoặc đọc toàn bộ
   `apps/api/app/modules/<name>/**` + `apps/web/src/features/<name>/**` (audit toàn module — skill
   `module-review`, xem nhóm 10).
2. Soát đủ 10 nhóm dưới, map mỗi finding vào severity 🔴/🟡/🟢.
3. Output: `file:line — issue — fix`, nhóm theo severity, nặng nhất trước.

## Checklist (9 nhóm)

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

### 5. UI visual design

- [ ] `apps/web` UI mới khớp [`09-ui-visual-design.md`](09-ui-visual-design.md): Soft Glass
      Workspace Console, chat-first, low-contrast workspace, không generic admin dashboard.
- [ ] Màu/layout/typography dùng token/direction chung; không tự tạo palette riêng trong feature.
- [ ] Chat/voice/tool trace có state rõ, responsive, accessible, không lấn át nội dung chính.

### 6. Naming

- [ ] Đúng casing per-language ([`05-naming.md`](05-naming.md)), không mix trong 1 file.
- [ ] Field JSON mới vẫn `snake_case` — không tự đổi camelCase.
- [ ] Entity mới → có trong "Domain glossary" của `05-naming.md`.

### 7. Test

- [ ] Code mới có test tương ứng (unit hoặc integration — [`03-testing.md`](03-testing.md)).
- [ ] `apps/api`: test integration dùng DB thật (testcontainer), không mock repository.
- [ ] Edge case/invariant (không chỉ happy path) có test reject.
- [ ] `apps/web`: golden path + 1 edge case đã verify tay trong browser (nếu chưa có test tự động).

### 8. Scope / ADR — 🔴 nếu vi phạm

- [ ] Không vượt scope yêu cầu (AGENTS.md rule 2) — feature không nhỏ mà chưa có
      `docs/features/<slug>.md` thì đây là vấn đề, không phải chi tiết code.
- [ ] Quyết định kiến trúc mới (thư viện lớn, đổi storage, đổi cách agent gọi nhau) → có ADR, không
      code trước rồi giải thích sau (AGENTS.md rule 3).
- [ ] Convention chưa cover case này → đã đề xuất bổ sung trước khi code (rule 4), không tự nghĩ
      pattern riêng.

### 9. Hygiene

- [ ] Không `console.log`/`print`/`debugger`/`it.only`/`pytest.mark.skip` sót lại.
- [ ] Không commit `.env`/secret/file build.
- [ ] Conventional Commits, không dead code/block comment-out.
- [ ] `import openjarvis` không tồn tại ở `apps/api/app` (rule 1).

### 10. Module completeness & modularity

> Dùng khi diff động tới phần lớn 1 module (không chỉ sửa nhỏ), hoặc khi audit toàn diện 1
> feature/module hiện có (skill `module-review` — không chỉ diff mới). Rubric đầy đủ ở
> [10-module-completeness.md](10-module-completeness.md), không lặp lại ở đây.

- [ ] Flow end-to-end đúng — trace 1 request thật qua toàn bộ chain (router→service→...→response
      BE; service→hook→component FE), không có đoạn gãy/mồ côi (hàm gọi sai tên, import thiếu).
- [ ] Không còn route/endpoint/hook/component/schema của cách làm CŨ sau khi đã thay bằng cách làm
      MỚI (dead code) — trừ khi có ghi rõ lý do + điều kiện xoá (compatibility layer chủ đích).
- [ ] Có `docs/features/<slug>.md`/ADR/domain doc tương ứng, khớp trạng thái code thật.
- [ ] Pattern nhất quán với module cùng loại đã có (không tự bịa cấu trúc khác cho cùng 1 loại vấn
      đề); nếu có registry mới — đúng ngưỡng + shape ở mục "Modular/swappable component"
      ([01-backend-fastapi.md](01-backend-fastapi.md)).
- [ ] Mở rộng thêm 1 biến thể cùng loại (provider/tool kind/feature tương tự) chỉ cần 1
      class/file mới + đăng ký, không phải sửa nhiều call site không liên quan.

## Severity

| Mức | Gồm |
|---|---|
| 🔴 **Blocker** (phải sửa) | Security, error handling sai (raise HTTPException/leak trace), scope creep (multi-tenant/vượt scope), thiếu ADR cho quyết định kiến trúc thật |
| 🟡 **Warning** (nên sửa) | Lệch convention layering/naming, thiếu test, thiếu log field, dead code không rõ lý do giữ lại (nhóm 10), tài liệu lệch code thật |
| 🟢 **Nit** (tùy chọn) | Style/format (ruff/prettier lo), tên biến chưa tối ưu |
