# Mockups

HTML mockup — mở trực tiếp bằng trình duyệt (không phải implementation, không có build step). Vẽ
để chốt hình dung với user trước khi viết `docs/features/<slug>.md` chi tiết. Xem
[docs/roadmap/README.md](../roadmap/README.md) mục "Tầm nhìn sản phẩm" cho trạng thái từng feature.

| File | Nội dung |
|---|---|
| [`ultron-console.html`](ultron-console.html) | Chat cockpit (conversation + message + tool-call trace) và agent org-chart 1 tầng (đã có thật) |
| [`ultron-orchestrator-canvas.html`](ultron-orchestrator-canvas.html) | Canvas kiểu ReactFlow — 1 supervisor + nhiều agent liên kết tự do (LangGraph, SGLang, streaming) — bản đầu, đã implement 1 phần (xem/thêm/gỡ cạnh, `OrchestratorCanvas.tsx`); kèm tab mockup Models/Tools/Knowledge bases/Settings phối lại cùng ngôn ngữ thiết kế |
| [`orchestrator-v2.html`](orchestrator-v2.html) | Mở rộng canvas orchestrator ở trên với 4 mảnh còn thiếu: edge contract (mô tả nhiệm vụ riêng theo từng `AgentDelegation`), readiness check (badge lỗi cấu hình trên node), tab Run simulator (chạy thử + xem path/stream), tab Trace inspector (xem lại lần chạy theo từng node/edge) — **chưa code**, spec: [`docs/features/orchestrator-v2.md`](../features/orchestrator-v2.md) |
| [`model-credential-management.html`](model-credential-management.html) | Dialog 3 cột quản lý provider credential — cột trái filter provider (mặc định chọn hết), cột giữa model + capabilities (catalog tĩnh), cột phải credential của provider đang chọn (mask secret, test connection, valid/invalid) — **chưa code**, spec: [`docs/features/model-credential-management.md`](../features/model-credential-management.md) |
| [`agent-creation-wizard.html`](agent-creation-wizard.html) | (A) Wizard tạo Agent nhiều bước (Định danh & Model → Tool → Knowledge Base → Sub-agent, mỗi bước có nút "Bỏ qua") thay flow form phẳng hiện tại; (B) Trang chi tiết Agent nâng cấp — cột trái tóm tắt "readiness" (đã gán Model/Tool/KB/Sub-agent chưa), panel Knowledge Base mới (hiện chưa có UI nào) — **chưa code**, spec: [`docs/features/agent-creation-wizard.md`](../features/agent-creation-wizard.md) |

Khi 1 mockup được implement thật, cập nhật dòng tương ứng trong bảng trên (đổi thành link tới feature
spec/screenshot thật) thay vì xoá file — giữ lại làm lịch sử thiết kế.
