---
description: Scaffold a new feature spec at docs/features/<slug>.md before implementing (AGENTS.md/roadmap workflow — spec first, code after)
argument-hint: <tên feature>
---

Viết spec cho feature: $ARGUMENTS

Dùng skill `feature-spec` để scaffold `docs/features/<slug>.md` từ `docs/features/_template.md`.
Lấy context từ cuộc trò chuyện hiện tại (vấn đề/động lực, mục tiêu đã bàn) — nếu Goals/Non-goals
chưa rõ, hỏi user thay vì tự bịa. Nếu feature kéo theo quyết định kiến trúc thật, nhắc dùng thêm
`/new-adr` riêng thay vì quyết định kiến trúc ngay trong spec.

Sau khi tạo file, cập nhật `docs/roadmap/README.md` (mục "Tầm nhìn sản phẩm") trỏ sang file vừa tạo,
rồi cho user xem đường dẫn + tóm tắt.
