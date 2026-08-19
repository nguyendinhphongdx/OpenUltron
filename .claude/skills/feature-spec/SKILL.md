---
name: feature-spec
description: Scaffold a new feature spec at docs/features/<slug>.md before implementing a non-trivial feature. Use when the user describes a new capability (new UI surface, new execution model, new resource type) that isn't just a small fix — write the spec first, then implement against it. Triggers on "thiết kế tính năng", "spec cho feature", "trước khi code thì viết spec", or when session-start hook flags the current task as non-trivial.
---

# Feature spec

Ultron viết spec cho feature **trước khi code**, không phải sau — mục tiêu là tránh code xong mới
phát hiện không đúng ý (đã xảy ra 1 lần với org-chart 1 tầng).

## Khi nào cần 1 file spec, khi nào không

Cần: feature mới thêm 1 UI surface, đổi mô hình lưu trữ (entity/bảng mới), đổi cách agent/graph thực
thi, hoặc bất kỳ thứ gì bạn sẽ dùng Plan Mode để bàn với user trước khi code.

Không cần: sửa bug, thêm 1 field, đổi copy/UI text, refactor nội bộ không đổi hành vi — code thẳng.

## Workflow

1. Đọc `docs/roadmap/README.md` (mục "Tầm nhìn sản phẩm") xem feature này có nằm trong tầm nhìn đã
   phác không — nếu không, hỏi user trước khi viết spec (tránh scope creep, AGENTS.md rule 2).
2. Slug hoá tên feature (kebab-case, ví dụ `knowledge-base-v2`, `orchestrator-graph-editor`).
3. Copy `docs/features/_template.md` → `docs/features/<slug>.md`, điền dựa trên context cuộc trò
   chuyện hiện tại (đừng bịa Goals/Non-goals — nếu chưa rõ, để trong "Câu hỏi mở" và hỏi user).
4. Nếu phần "Thiết kế" kéo theo 1 quyết định kiến trúc thật (thêm thư viện lớn, đổi bảng/entity,
   đổi cách agent gọi nhau) — spec chỉ **link** sang 1 ADR sẽ soạn riêng (dùng `/new-adr` hoặc
   `adr-writer`), không tự chốt kiến trúc trong file spec.
5. Cập nhật `docs/roadmap/README.md`: thêm/di chuyển dòng feature này trong bảng tầm nhìn, trỏ link
   sang `docs/features/<slug>.md` vừa tạo.
6. Việc code thực tế bắt đầu sau khi spec ở trạng thái `accepted` (user xác nhận) — nếu vẫn `draft`,
   dùng Plan Mode để tiếp tục bàn thiết kế thay vì code thẳng.

## Anti-pattern

- ❌ Viết spec rồi code luôn trong cùng lượt mà chưa cho user xác nhận Goals/Non-goals.
- ❌ Nhét quyết định kiến trúc (đổi schema, đổi thư viện) vào spec thay vì tách ADR riêng.
- ❌ Tạo file spec cho việc nhỏ (1-2 file, không đổi hành vi lưu trữ/kiến trúc) — over-process.
