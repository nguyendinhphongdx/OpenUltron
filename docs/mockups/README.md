# Mockups

HTML mockup — mở trực tiếp bằng trình duyệt (không phải implementation, không có build step). Vẽ
để chốt hình dung với user trước khi viết `docs/features/<slug>.md` chi tiết. Xem
[docs/roadmap/README.md](../roadmap/README.md) mục "Tầm nhìn sản phẩm" cho trạng thái từng feature.

| File | Nội dung |
|---|---|
| [`ultron-console.html`](ultron-console.html) | Chat cockpit (conversation + message + tool-call trace) và agent org-chart 1 tầng (đã có thật) |
| [`ultron-orchestrator-canvas.html`](ultron-orchestrator-canvas.html) | Canvas kiểu ReactFlow — 1 supervisor + nhiều agent liên kết tự do (LangGraph, SGLang, streaming) — **chưa code**; kèm tab mockup Models/Tools/Knowledge bases/Settings phối lại cùng ngôn ngữ thiết kế |

Khi 1 mockup được implement thật, cập nhật dòng tương ứng trong bảng trên (đổi thành link tới feature
spec/screenshot thật) thay vì xoá file — giữ lại làm lịch sử thiết kế.
