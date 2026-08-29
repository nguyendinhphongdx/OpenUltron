# Convention — UI Visual Design (`apps/web`)

> Canonical cho visual direction của Ultron. File này biến reference screenshot kiểu
> "AI-native productivity workspace" thành rule cụ thể để mọi coding agent thiết kế UI nhất quán,
> không tự freestyle mỗi màn. Dùng cùng với [`02-frontend-nextjs.md`](02-frontend-nextjs.md);
> file đó quản kiến trúc code, file này quản cảm giác sản phẩm.

## Product direction

Ultron là **chat-first AI workspace**, không phải admin dashboard generic.

UI phải tạo cảm giác một workspace nhẹ, thông minh, luôn có agent ở cạnh người dùng:

- Conversation là trung tâm trải nghiệm.
- Agent, Tool, KnowledgeBase, Model, Credential là surface phụ để cấu hình năng lực cho agent.
- Live Voice là chế độ chính của agent, không phải widget trang trí.
- Tool call, RAG, sub-agent delegation là trace có thể mở ra khi cần, không lấn át dòng hội thoại.

Tên direction nội bộ: **Soft Glass Workspace Console**.

## Visual reference

Reference user chọn có ngôn ngữ thị giác gần với:

- Linear/Notion/Airtable style workspace.
- macOS-like translucent sidebar.
- Database/table-first productivity UI.
- AI copilot panel nổi nhưng không phá layout chính.

Không copy pixel-perfect từ sản phẩm nào. Copy **nguyên tắc**: quiet, bright, precise, tactile.

## Layout rules

- App shell ưu tiên 3 vùng: sidebar trái, surface chính, inspector/copilot phụ khi cần.
- Sidebar dùng nền mờ rất nhẹ (`bg-background/70`, `backdrop-blur`, border phải nhạt), không dùng
  block màu đậm.
- Surface chính dùng background trắng/off-white, grid/table/list rõ ràng bằng border nhạt.
- Chat route phải là chat-first: thread ở giữa, composer cố định gần đáy, agent/model controls gần
  composer hoặc header.
- Admin/config route vẫn dùng workspace style: list/table bên trái hoặc trên, form/detail bên phải
  khi có thể; tránh form dài một cột trông như CRUD scaffold.
- Inspector/trace panel dùng aside hoặc drawer nhẹ, không chen vào nội dung chính nếu không cần.
- Không đặt card trong card. Section không phải card; card chỉ dùng cho item lặp, dialog, inspector
  hoặc tool panel có biên rõ.

## Color system

Ultron mặc định là light-first, low-contrast, không dark hacker dashboard.

| Role | Token/Hex đề xuất | Cách dùng |
|---|---|---|
| App background | `#F7F8F6` | nền tổng thể hơi ấm, không trắng gắt |
| Surface | `#FFFFFF` | bảng, form, panel chính |
| Surface muted | `#F2F4F1` | selected row, hover, chip nền |
| Border | `#E5E7E2` | grid line, divider, input border |
| Text primary | `#242624` | nội dung chính |
| Text secondary | `#6F746D` | metadata, helper text |
| Accent | `#0D9488` | focus, active nav, primary agent state |
| Action | `#F97316` | CTA hiếm, attention, destructive-adjacent warning |
| Success | `#16A34A` | connected/done |
| Danger | `#DC2626` | error/destructive |

Rules:

- Accent dùng tiết chế: active state, focus ring, icon trạng thái, progress. Không nhuộm cả page
  thành teal.
- Action orange chỉ dùng cho hành động nổi bật thật sự. Không dùng làm màu primary chung mọi button.
- Border luôn mỏng và nhạt; tránh shadow nặng để phân cấp.
- Không dùng gradient/orb/bokeh/background trang trí. Nếu cần chiều sâu, dùng blur + border + shadow
  rất mềm.
- Dark mode nếu làm sau phải là bản tương đương quiet workspace, không chuyển sang cyber/neon.

## Typography

- Font chính: ưu tiên `Inter`, `Geist`, hoặc `Plus Jakarta Sans` qua `next/font`; không import Google
  Fonts bằng CSS/link runtime.
- Body text desktop: `14px` hoặc `15px`; mobile không dưới `16px` cho nội dung đọc dài.
- Heading trong app nhỏ và chắc: `text-lg`/`text-xl`, không hero-scale trong tool surface.
- Metadata dùng `text-xs`, màu secondary, không dùng letter spacing âm.
- Không dùng font display vui nhộn cho app shell hoặc data surface.

## Components

- Primitive UI phải qua shadcn/ui theo [`02-frontend-nextjs.md`](02-frontend-nextjs.md).
- Button bình thường cao 32-36px desktop; mobile/touch target tối thiểu 44px.
- Icon dùng `lucide-react`, size 16-18px trong nav/button; không dùng emoji làm icon.
- Row/table hover dùng background muted nhẹ, không scale row.
- Chip/badge dùng rounded pill nhẹ, border hoặc muted background, text nhỏ.
- Avatar/logo/icon nhỏ được phép dùng để tăng nhận diện entity, nhưng không biến page thành logo wall.
- Dialog/dropdown/drawer dùng shadow mềm, border nhạt, backdrop vừa đủ.
- Dialog luôn có cấu trúc cố định: header ở trên, body/content là vùng duy nhất được scroll dọc,
  footer ở dưới; không để cả dialog/page scroll làm mất CTA hoặc làm footer tràn mép.
- Empty state ngắn, trực tiếp, có action rõ; không viết marketing copy dài trong app.

## Motion and interaction

- Micro-interaction 150-250ms, `ease-out`, chỉ dùng opacity/transform/background.
- Respect `prefers-reduced-motion`.
- Loading state phải giữ chỗ để tránh layout jump.
- Async button disabled khi pending; error hiện gần nơi người dùng vừa thao tác.
- Chat/voice state phải nhìn thấy rõ: `listening`, `thinking`, `speaking`, `using_tool`,
  `approval_required`.
- Voice interrupt/barge-in phải có phản hồi tức thì ở UI: waveform/state đổi ngay, playback dừng
  ngay khi client nhận interrupted event.

## Chat and Live Voice UX

- Chat là màn chính của sản phẩm: route `/conversations` không được trông như list CRUD đơn thuần.
- Composer hỗ trợ text + mic + attach/KB/tool affordance trong cùng vùng thao tác.
- Live voice có trạng thái rõ bằng vòng sáng/waveform nhẹ, transcript realtime và nút stop dễ thấy.
- Tool/RAG/sub-agent trace hiển thị dạng collapsible row/chip trong thread hoặc inspector bên phải.
- Approval gate phải nổi bật nhưng bình tĩnh: tên tool, arguments tóm tắt, nút approve/reject rõ.
- Không để trace kỹ thuật lấn át câu trả lời chính của agent.

## Data surfaces

- Table/list phải giống workspace database: header nhỏ, row cao vừa phải, border grid nhạt, selected
  row rõ nhưng nhẹ.
- Với dữ liệu nhiều cột, desktop dùng table/grid; mobile dùng card row hoặc horizontal scroll có chủ
  đích, không để page overflow ngẫu nhiên.
- Form field grouping theo task của user, không đơn giản render toàn bộ schema theo thứ tự DB.
- Các màn `Agent`, `Tool`, `KnowledgeBase`, `Model` phải thể hiện quan hệ với agent/chat, không chỉ
  là CRUD object rời rạc.

## Anti-pattern

- ❌ Generic shadcn admin panel: header + form/card lặp lại không có hierarchy sản phẩm.
- ❌ Dark/neon/cyber aesthetic cho app mặc định.
- ❌ Gradient background, orb, bokeh blob, glass quá đậm hoặc shadow nổi như landing page.
- ❌ Marketing hero trong app shell.
- ❌ Card bọc section, rồi trong section lại nhiều card con.
- ❌ Text mô tả dài giải thích UI hoạt động thế nào ngay trong app.
- ❌ Button/icon quá nhỏ trên mobile hoặc clickable area không rõ.
- ❌ Copy màu mới trực tiếp trong từng component khi token/theme đã có thể dùng.

## Self-check trước khi xong

- [ ] UI mới có đọc file này + [`02-frontend-nextjs.md`](02-frontend-nextjs.md) trước khi code?
- [ ] Layout vẫn là chat-first/workspace, không biến thành admin dashboard generic?
- [ ] Màu mới dùng đúng token/direction ở "Color system", không tự tạo palette riêng?
- [ ] Sidebar/surface/table/dialog dùng low-contrast, border nhạt, shadow mềm?
- [ ] Chat/voice/tool trace có state rõ mà không lấn át nội dung chính?
- [ ] Component touch target, focus state, contrast, loading/error state đạt checklist accessibility?
- [ ] Responsive đã nghĩ cho 375px, 768px, 1024px, 1440px?
- [ ] Không có anti-pattern ở mục trên?
