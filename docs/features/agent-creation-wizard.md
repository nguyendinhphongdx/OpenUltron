# Feature: Wizard tạo Agent nâng cao (gán Tool/Knowledge Base/Sub-agent ngay lúc tạo) + UI Knowledge Base binding + nâng cấp trang chi tiết Agent

Status: done (2026-08-30) — implement xong + `code-reviewer` review (2 finding 🟡 đã fix: Sub-agent
card bị ẩn hẳn khi `!is_orchestrator` thay vì giữ hint cũ; thiếu test cho
`unassign_from_agent` — đã thêm `tests/unit/knowledge_base/test_agent_kb_unassign.py`). Vẫn còn
nợ: chưa có test tự động phía `apps/web` cho `AgentKnowledgeBaseManager`/`AgentCreationWizard`
(cần bootstrap Vitest trước — xem "Risk" ở plan `solution-architect`, không thuộc phạm vi bản đầu).

## Vấn đề / động lực

Bằng chứng đọc trực tiếp code hiện tại:

1. **Flow tạo Agent chỉ là 1 form phẳng.** `NewAgentView.tsx` render thẳng `AgentForm` (slug/name/
   description/system_prompt/model_id/is_orchestrator) — không có bước nào để gán Tool, Knowledge Base,
   hay Sub-agent lúc tạo. Muốn gán bất kỳ resource nào, user bắt buộc phải: tạo agent trống → chuyển
   sang trang chi tiết (`AgentDetailView.tsx`) → tự tìm đúng section → gán từng cái một. Với 1 agent cần
   nhiều resource (vài Tool + vài KB + vài Sub-agent), đây là quy trình rời rạc, dễ quên bước, không có
   cảm giác "agent này được thiết lập xong" ở 1 chỗ.
2. **Knowledge Base hoàn toàn không có UI gán vào Agent, dù backend đã chạy được thật.** Backend có đủ:
   bảng `AgentKnowledgeBase` (`apps/api/app/modules/knowledge_base/models.py:91-100`, many-to-many
   `agent_id`/`kb_id` với `UniqueConstraint`), `POST /agents/{agent_id}/knowledge-bases` (assign) và
   `GET /agents/{agent_id}/knowledge-bases` (list) — đã verify chạy thật qua API trước đó (agent chat tự
   gọi được tool `search-knowledge-base-<slug>` sau khi gán, xem roadmap mục "Wire KnowledgeBase vào
   chat execution"). Nhưng `AgentDetailView.tsx` chỉ có 3 section: "Thông tin agent", "Sub-agent", "Tool"
   — **không có section Knowledge Base nào**, và `apps/web` không có component nào gọi 2 endpoint trên
   (đối chiếu `AgentToolManager` đã có sẵn cho `Tool`, cùng pattern nhưng thiếu bản dành cho KB). Người
   dùng hiện tại **không có cách nào qua UI để cho 1 agent dùng RAG** — phải tự gọi API bằng tay.
3. **Trang chi tiết Agent chưa đúng "cảm giác thiết lập 1 agent hoàn chỉnh".** 3 section hiện tại là
   heading + component nối tiếp nhau theo chiều dọc, không phân biệt rõ "cấu hình cốt lõi" và "năng lực
   gắn thêm" (Tool/KB/Sub-agent), không có tổng quan nhanh agent này có/thiếu gì.

## Mục tiêu (Goals) — nháp, chờ user confirm

- Tạo mới 1 Agent qua flow nhiều bước (wizard): bước cấu hình cốt lõi (định danh + model, tương đương
  `AgentForm` hiện tại), tiếp theo lần lượt các bước gán Tool, gán Knowledge Base, gán Sub-agent — gán
  được ngay trong lúc tạo, không phải rời màn hình sau khi tạo xong mới gán.
- Thêm UI Knowledge Base binding cho Agent — component `AgentKnowledgeBaseManager` (đối xứng
  `AgentToolManager` đã có), dùng ở cả wizard tạo mới và trang chi tiết, gọi đúng 2 endpoint đã có
  (`POST`/`GET /agents/{agent_id}/knowledge-bases`).
- Nâng cấp visual/trải nghiệm trang chi tiết Agent (`AgentDetailView`) theo hướng Soft Glass Workspace
  Console (`docs/conventions/09-ui-visual-design.md`) — phân biệt rõ cấu hình cốt lõi vs năng lực gắn
  thêm (Tool/KB/Sub-agent), không phải danh sách section xếp dọc rời rạc như hiện tại.
- Vẫn cho sửa Tool/KB/Sub-agent sau khi agent đã tạo (trang chi tiết) — wizard không thay thế khả năng
  chỉnh sửa hiện có, chỉ thêm khả năng làm ngay lúc tạo.

## Ngoài phạm vi (Non-goals) — nháp, chờ user confirm ranh giới ở "Câu hỏi mở"

- Không đổi backend schema/endpoint tạo Agent (`POST /agents`) sang nhận payload gộp cả Tool/KB/Sub-agent
  trong 1 request — trừ khi `solution-architect` xác định cần thiết cho UX đã chốt (xem câu hỏi mở #3).
- Không thêm field cấu hình mới cho quan hệ `AgentTool`/`AgentKnowledgeBase` (vd priority, metadata
  filter, max iterations) — bám đúng model dữ liệu hiện có, không mở rộng ngoài yêu cầu.
- Không làm preview chat trực tiếp trong wizard lúc đang tạo (xem `docs/research/agent-creation-wizard.md`
  mục "Không áp dụng" — tính năng nặng, không cần cho v1).
- Không đổi flow/UI Orchestrator canvas (`OrchestratorCanvas.tsx`) — feature này chỉ về tạo/cấu hình
  **1 agent đơn lẻ**, không phải epic "Orchestrator v2" (đang được research song song, xem roadmap).

## Thiết kế

(Không viết kiến trúc ở đây — theo đúng vai trò BA. Insight kỹ thuật liên quan đã ghi ở
`docs/research/agent-creation-wizard.md` mục "Insight áp dụng cho Ultron", để `solution-architect` đọc
và tự quyết cách áp dụng, đặc biệt điểm: agent chưa có `id` ở các bước Tool/KB/Sub-agent trong wizard —
cần quyết định tạo agent trước (draft) rồi gán tuần tự qua API sẵn có, hay cách khác.)

Wireframe cấu trúc màn hình → xem mockup `docs/mockups/agent-creation-wizard.html`.

### Gap backend phát hiện khi đọc code (cần quyết định trước khi code, KHÔNG tự quyết ở spec này)

- **Thiếu endpoint unassign Knowledge Base khỏi Agent.** `apps/api/app/modules/knowledge_base/
  agent_kb_router.py` chỉ có `POST` (assign) và `GET` (list) — không có `DELETE
  /agents/{agent_id}/knowledge-bases/{kb_id}`. Đối chiếu `Tool` đã có đủ cả 3 (`useUnassignTool` gọi
  `DELETE /agents/{agent_id}/tools/{tool_id}`). Nếu muốn `AgentKnowledgeBaseManager` đối xứng
  `AgentToolManager` (gán + gỡ), backend cần thêm endpoint này trước — việc của `solution-architect`/
  `backend-engineer`, không tự thêm ở đây.

## Câu hỏi mở — đã trả lời (2026-08-30)

1. **4 bước theo đúng đề xuất**: Định danh+Model → Tool → Knowledge Base → Sub-agent (bước 4 chỉ
   hiện nếu bước 1 bật `is_orchestrator`).
2. **CÓ cho "tạo nhanh"** — mỗi bước Tool/KB/Sub-agent có nút "Bỏ qua", user có thể thoát/tạo agent
   chỉ với bước 1 (khớp research: GPT Builder/Dify đều không ép hoàn thành cấu hình phụ).
3. **`POST /agents` persist thật ngay ở bước 1**, các bước sau gán resource tuần tự qua API sẵn có
   — không dựng khái niệm "nháp"/transaction riêng (đơn giản hơn, khớp API hiện có, rời wizard giữa
   chừng vẫn để lại agent hợp lệ chỉ thiếu resource, không phải trạng thái lỗi).
4. **Thêm `DELETE /agents/{agent_id}/knowledge-bases/{kb_id}` vào scope** — đối xứng đầy đủ với
   `Tool` (`AgentToolManager` đã có gán+gỡ), `AgentKnowledgeBaseManager` cũng cần gán+gỡ để dùng
   được thật sự (không chỉ gán 1 chiều).
5. **Theo đúng hướng mockup** (`docs/mockups/agent-creation-wizard.html`) — `frontend-engineer` bám
   sát mockup, được điều chỉnh nhỏ nếu không khớp component/token thật của `apps/web`.
6. **Giữ nguyên rule** — sub-agent chỉ hiện trong wizard/trang chi tiết khi `is_orchestrator=true`.

(Câu hỏi gốc giữ lại tham khảo ngữ cảnh bên dưới.)

1. **Bao nhiêu bước, mỗi bước gồm gì?** Đề xuất theo research (định danh trước, năng lực sau): Bước 1
   = Định danh + Model (slug/name/description/system_prompt/model_id/is_orchestrator — đúng field
   `AgentForm` hiện có), Bước 2 = Tool, Bước 3 = Knowledge Base, Bước 4 = Sub-agent (chỉ hiện nếu bước 1
   đã bật `is_orchestrator`) — user xác nhận thứ tự/số bước này hay muốn khác (vd gộp Tool+KB làm 1
   bước "Năng lực", tách bước riêng cho description).
2. **Có cho "tạo nhanh" (bỏ qua Tool/KB/Sub-agent, gán sau) không, hay bắt buộc đi hết wizard?** Theo
   research, cả OpenAI GPT Builder và Dify đều không ép hoàn thành cấu hình phụ trước khi dùng được
   (chỉ field lõi bắt buộc). Ultron có nên theo hướng này (mỗi bước Tool/KB/Sub-agent có nút "Bỏ qua"
   + luôn có thể thoát wizard sớm và tạo agent chỉ với bước 1) hay bắt buộc xem qua hết từng bước trước
   khi tạo được?
3. **Cơ chế kỹ thuật tạo agent + gán resource nhiều bước** — đây là câu hỏi biên giữa BA/kiến trúc,
   nhưng cần user biết trước khi giao `solution-architect`: có chấp nhận việc "Tạo agent" ở bước 1 gọi
   `POST /agents` thật ngay (agent đã tồn tại/persist), rồi các bước sau chỉ là gán resource tuần tự
   (rời wizard giữa chừng vẫn để lại agent đã tạo, chỉ thiếu resource) — hay bắt buộc phải có khái niệm
   "nháp" (không persist gì cho tới khi hoàn tất wizard, cần huỷ được sạch nếu bỏ giữa chừng)? Cách 1
   đơn giản hơn với API hiện có; cách 2 cần thiết kế thêm (transaction/draft state) — quyết định này
   ảnh hưởng trực tiếp plan của `solution-architect`.
4. **Có cần thêm endpoint `DELETE /agents/{agent_id}/knowledge-bases/{kb_id}` (gap đã phát hiện ở trên)
   ngay trong phạm vi feature này không**, hay `AgentKnowledgeBaseManager` v1 chỉ hỗ trợ gán (không gỡ)
   và để việc gỡ KB là nợ riêng? Khuyến nghị: nên làm cùng lúc vì đối xứng trực tiếp với `Tool` đã có,
   nhưng cần user xác nhận đưa vào scope.
5. **Trang chi tiết Agent "nâng cấp visual" tới mức nào?** Mockup đề xuất 1 hướng cụ thể (xem
   `docs/mockups/agent-creation-wizard.html` phần B) — user xem rồi chốt có đúng hình dung hay cần chỉnh
   layout/nhóm section khác.
6. **Sub-agent trong wizard chỉ hiện khi `is_orchestrator=true`** — đúng logic hiện có ở
   `DelegationManager` (agent không phải orchestrator thì không quản lý sub-agent được). Xác nhận giữ
   nguyên rule này trong wizard, không đổi.

## Acceptance criteria

- [x] Tạo Agent mới đi qua flow nhiều bước, gán được Tool/Knowledge Base/Sub-agent trong lúc tạo (không
      bắt buộc rời khỏi flow để gán sau) — chi tiết số bước/thứ tự theo quyết định ở Câu hỏi mở #1.
- [x] Có UI gán/xem Knowledge Base cho 1 Agent (component mới), dùng được cả trong wizard và trang chi
      tiết — **chưa verify qua browser thật** (không có Postgres/Ollama chạy trong sandbox môi trường
      code); code đã đúng luồng gọi API theo review, cần user tự verify tay 1 lần khi có môi trường
      chạy được.
- [x] Trang chi tiết Agent (`AgentDetailView`) cập nhật theo Soft Glass Workspace Console, có section
      Knowledge Base mới, phân biệt rõ cấu hình cốt lõi vs năng lực gắn thêm.
- [x] Không phá hành vi sửa Tool/Sub-agent hiện có ở trang chi tiết (regression đã tìm ra qua
      `code-reviewer` — Sub-agent card bị ẩn hẳn khi `!is_orchestrator` thay vì giữ hint cũ — đã fix).
- [x] `DELETE /agents/{agent_id}/knowledge-bases/{kb_id}` (unassign) đã thêm ở backend, dùng thật
      trong `AgentKnowledgeBaseManager`.
- [x] `pnpm lint`/`typecheck`/`build` xanh; `ruff`/`pytest`/`check_module_boundaries.py` xanh (91
      test pass, +2 test mới cho `unassign_from_agent`).
