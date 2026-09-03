# Feature: Conversation UX v2

Status: draft

## Vấn đề / động lực

Roadmap có mục "Conversation UX v2" ghi từ trước, liệt kê 1 danh sách việc chung chung. Đọc lại
code thật (2026-09-04) trước khi viết spec này thấy **1 phần đã làm rồi** (roadmap bị stale, không
cập nhật khi code xong):

- ✅ Chọn agent TRƯỚC khi vào chat — `NewConversationView.tsx` đã bắt buộc chọn agent, composer chỉ
  enable sau khi chọn (kiểu ChatGPT/Claude "new chat"), không phải form điền tên hội thoại tay.
- ✅ Search theo tên/kênh/ID — `ConversationList.tsx` đã có ô search client-side filter.
- ✅ Trạng thái stream/approval — `ThinkingIndicator.tsx`/`ApprovalInterruptPanel.tsx` đã hiện rõ
  lúc agent đang chạy/chờ duyệt tool.

**Còn thiếu thật** (phạm vi spec này):

- Empty state ở `/conversations/new` chỉ có ô nhập chat trơn — không có gợi ý ("starter prompts")
  giúp user biết nên hỏi gì, đặc biệt agent mới tạo chưa quen thuộc.
- Không pin/archive được hội thoại — danh sách dài dần vô hạn, hội thoại cũ/không dùng nữa vẫn nằm
  chung với hội thoại đang dùng.
- Không rename được — tiêu đề tự động lấy từ tin nhắn đầu (`deriveTitle`), không sửa lại được nếu
  tin nhắn đầu không đại diện đúng nội dung cả hội thoại.
- Danh sách phẳng, không group theo thời gian (Hôm nay/Hôm qua/7 ngày qua...) hay theo agent — khó
  tìm khi có nhiều hội thoại.
- Không có keyboard shortcut (mở hội thoại mới, tìm kiếm, điều hướng danh sách).

## Mục tiêu (Goals)

- **Pin/Archive**: 1 hội thoại có thể pin (luôn nổi lên đầu danh sách) hoặc archive (ẩn khỏi danh
  sách mặc định, xem lại qua filter riêng). Field mới trên `Conversation`.
- **Rename inline**: sửa tiêu đề hội thoại trực tiếp từ danh sách hoặc từ header trang chat, không
  cần mở form riêng.
- **Grouping**: danh sách hội thoại nhóm theo thời gian cập nhật gần nhất (Hôm nay/Hôm qua/7 ngày
  qua/Cũ hơn) — mặc định; có thể đổi sang group theo agent.
- **Starter prompts**: khi vào `/conversations/new` và đã chọn agent, hiện 2-4 gợi ý câu hỏi mẫu
  liên quan tới agent đó (dựa trên `Agent.description`/tool đã gán) thay vì màn hình trống.
- **Keyboard shortcuts**: tối thiểu — mở hội thoại mới (`Cmd/Ctrl+K` hoặc tương tự), focus ô search.

## Ngoài phạm vi (Non-goals)

- **Không đổi flow chọn agent trước khi chat** — đã đúng ý, giữ nguyên `NewConversationView.tsx`.
- **Không đổi cách derive title tự động** — rename là bổ sung THÊM lựa chọn, không thay thế cơ chế
  tự động hiện có.
- **Không làm folder/tag tuỳ ý cho hội thoại** — chỉ pin/archive (2 trạng thái cố định), không phải
  hệ thống gắn nhãn tự do (over-engineering cho quy mô 1 user hiện tại).
- **Starter prompts không cá nhân hoá bằng LLM** (không gọi model để tự sinh gợi ý) — v1 dùng gợi ý
  tĩnh suy từ `Agent.description`/tool đã gán, đơn giản, không thêm cost/latency.

## Thiết kế

Sơ bộ (chưa chốt schema/API cụ thể — để `solution-architect` lập plan chi tiết sau khi Goals/
Non-goals này được xác nhận):

- `Conversation` thêm 2 field: `pinned: bool = False`, `archived_at: datetime | None = None`.
  Migration Alembic thêm cột, không đổi hành vi hội thoại cũ (mặc định `pinned=False`,
  `archived_at=None` — hiện y hệt trước).
- `PATCH /conversations/{id}` (route có sẵn?) hoặc route mới — cần kiểm tra route hiện tại của
  `conversation` module trước khi quyết (tái dùng generic update nếu đã có, đúng nguyên tắc "domain
  cung cấp giải pháp, không code theo case" đã áp dụng ở Agent/AgentDelegation trước đây).
- `ConversationList.tsx`: filter mặc định `archived_at IS NULL`, toggle riêng để xem archived; sort
  `pinned DESC, updated_at DESC`; group theo `updated_at` (client-side, không cần API riêng).
- Rename: input inline (click vào tiêu đề → chuyển thành input, Enter/blur để lưu) — không cần
  dialog riêng.
- Starter prompts: hàm thuần suy gợi ý từ `Agent` (description/tool slug) — không gọi API mới, tính
  toán ở FE dựa trên data agent đã có sẵn từ `useAgents()`.

## Câu hỏi mở

- Archive có xoá được luôn không, hay chỉ ẩn (archive) — xoá vĩnh viễn là hành động riêng, khác
  scope này?
- Grouping theo agent hiển thị thế nào khi 1 hội thoại `agent_id = null` (dùng agent mặc định)?
- Starter prompts: nếu agent không có `description` và không gán tool nào, có hiện gợi ý generic
  ("Hỏi tôi bất cứ điều gì") hay ẩn hẳn phần starter prompts?

## Acceptance criteria

- [ ] `Conversation.pinned`/`archived_at` + migration, mặc định giữ hành vi cũ.
- [ ] Pin/archive/unarchive qua UI (danh sách hoặc header trang chat).
- [ ] Rename inline hoạt động, persist đúng, không phá cơ chế auto-title hiện có cho hội thoại mới.
- [ ] Danh sách group theo thời gian mặc định, có toggle group theo agent.
- [ ] Starter prompts hiện đúng khi đã chọn agent ở `/conversations/new`, ẩn/generic khi agent
      thiếu description và tool.
- [ ] Keyboard shortcut mở hội thoại mới + focus search hoạt động, không đụng shortcut trình duyệt.
