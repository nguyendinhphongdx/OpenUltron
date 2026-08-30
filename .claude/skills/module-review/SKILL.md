---
name: module-review
description: Audit toàn diện 1 feature/module hiện có trong Ultron (FE→BE) — không chỉ diff mới, mà toàn bộ trạng thái code hiện tại. Dùng khi nghi ngờ 1 module cũ có code chết/lệch convention, trước khi mở rộng thêm 1 module đã tồn tại lâu, hoặc audit định kỳ sức khoẻ codebase. Triggers on "review module", "audit feature", "module này còn sạch không", "/module-review".
---

# Module review

Ultron dùng nhiều AI agent (Claude, Codex...) code theo thời gian — mỗi agent chỉ thấy phạm vi task
đang làm, dễ để sót code cũ/lệch convention sau khi đổi cách làm. Skill này KHÔNG viết thêm script
regex cho từng rule cụ thể (không scale — mỗi rule mới lại đẻ 1 script rời rạc); thay vào đó giao
`module-reviewer` (AI, đọc hiểu ngữ cảnh) audit toàn bộ 1 feature/module theo rubric cố định
[10-module-completeness.md](../../../docs/conventions/10-module-completeness.md).

## Khi nào dùng

- User nghi ngờ 1 module cụ thể "chắp vá"/lệch convention (không rõ ở đâu — cần audit rộng).
- Trước khi mở rộng thêm 1 module đã tồn tại lâu (đảm bảo hiểu đúng trạng thái hiện tại trước khi
  thêm code mới lên trên).
- Audit định kỳ sức khoẻ codebase (không có trigger cụ thể — user chỉ muốn biết tổng quan).

Khác `/dev` (build feature mới từ đầu, có spec) và `code-reviewer` (chỉ review diff mới, không audit
toàn bộ trạng thái hiện tại).

## Workflow

1. Xác định tên module/feature cần audit (từ context hội thoại hoặc hỏi user nếu không rõ — 1
   module = 1 tên thư mục dưới `apps/api/app/modules/` và/hoặc `apps/web/src/features/`).
2. Giao `module-reviewer` (subagent) — prompt phải nêu rõ tên module, và nhồi sẵn bất kỳ context đã
   biết trong hội thoại (vd nghi ngờ cụ thể của user, thay đổi gần đây) thay vì để subagent tự đoán
   phạm vi từ đầu.
3. Đọc báo cáo trả về — nếu có finding 🔴/🟡, hỏi user có muốn fix ngay không (không tự sửa mà chưa
   hỏi, đây là audit-only theo mặc định).
4. Nếu user đồng ý fix → giao `backend-engineer`/`frontend-engineer` tương ứng, review lại bởi
   `code-reviewer` sau khi sửa (đúng vòng implementer/reviewer tách vai, xem `AGENTS.md`).

## Anti-pattern

- ❌ Tự thêm 1 script mới bắt case cụ thể phát hiện trong lúc audit (vd "check no X pattern") thay
  vì đưa rule đó vào rubric `10-module-completeness.md`/`08-code-review.md` — trừ khi đó thật sự là
  invariant cấu trúc/topology giống `check_module_boundaries.py` (xem AGENTS.md mục Harness).
- ❌ Audit xong tự sửa code luôn mà chưa xác nhận với user — skill này mặc định chỉ audit + báo cáo.
