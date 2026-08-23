---
description: Chạy full flow business-analyst → solution-architect → backend/frontend-engineer → qa-engineer cho 1 feature, có APPROVE gate giữa mỗi bước
argument-hint: <mô tả task/feature>
---

Task: $ARGUMENTS

Trước hết phân loại theo AGENTS.md/session-start hook: task nhỏ (fix bug, sửa 1-2 file, không đổi
hành vi lưu trữ/kiến trúc) → code thẳng, không cần chạy flow dưới đây, chỉ chạy `/check` trước khi
báo xong. Chỉ chạy đủ flow này khi task là feature không nhỏ (UI surface mới, entity mới, thay đổi
kiến trúc/luồng dữ liệu).

Flow, tuần tự — mỗi bước đợi kết quả bước trước, có gate hỏi user trước khi qua bước tiếp
(không tự suy đoán user đồng ý):

1. **Business analyst** — nếu chưa có `docs/features/<slug>.md` cho task này, delegate
   `business-analyst`: viết draft spec (Vấn đề/động lực + Goals/Non-goals nháp) +
   `docs/research/<slug>.md` nếu cần so sánh sản phẩm khác.
   → **Gate 1**: cho user xem draft, hỏi Goals/Non-goals đã đúng chưa. Chờ đồng ý rồi mới đổi
   `Status: draft` → `accepted` trong spec.
2. **Solution architect** — delegate `solution-architect` đọc spec `accepted` + ADR + convention,
   ra plan chi tiết (file path, step, agent chịu trách nhiệm, verification gate). Nếu architect báo
   thiếu ADR/convention → dừng ở đây, xử lý (`/new-adr` hoặc đề xuất bổ sung convention) trước khi
   tiếp.
   → **Gate 2**: cho user xem plan, chờ đồng ý.
3. **Implement** — delegate `backend-engineer` và/hoặc `frontend-engineer` theo đúng step trong
   plan. Nếu 2 bên độc lập theo plan, có thể chạy song song (gửi cả 2 Agent call trong 1 message);
   nếu phụ thuộc nhau, chạy tuần tự đúng thứ tự plan ghi.
4. **QA** — delegate `qa-engineer` viết + chạy test theo Acceptance Criteria của spec. Nếu có AC
   không automation được, ghi rõ là manual verification.
5. **Review** — chạy `code-reviewer` (tự phân loại `apps/api`/`apps/web` đã đổi) review diff thật.
6. Tổng hợp: cập nhật `Status` của spec (`in-progress`/`done` khi AC pass + review sạch), cập nhật
   `docs/roadmap/README.md` nếu milestone đã xong. Báo user tóm tắt: cái gì xong, cái gì còn lại
   (AC chưa cover, review finding chưa fix).

Không tự bỏ qua 1 gate vì "chắc user đồng ý" — nếu user đã nói rõ trong task ban đầu là "cứ làm
luôn, không cần hỏi từng bước", mới bỏ gate tương ứng.
