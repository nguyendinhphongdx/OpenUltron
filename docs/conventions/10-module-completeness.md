# Convention — Module completeness ("Definition of done")

> Canonical duy nhất cho câu hỏi "1 feature/module coi như xong chưa, có sạch không" — dùng làm
> rubric cho skill `module-review` và mục "Module completeness & modularity" ở
> [`08-code-review.md`](08-code-review.md). Không lặp lại nội dung này ở nơi khác — trỏ vào đây.

## Vì sao cần

Nhiều AI agent (Claude, Codex...) cùng code Ultron theo thời gian — mỗi agent chỉ thấy phạm vi task
đang làm, dễ để lại code cũ chưa dọn khi đổi cách làm (route/endpoint/hook thay thế nhưng bản cũ
không xoá), quên viết doc, hoặc tự bịa pattern khác module tương tự đã có. Convention layering
([01](01-backend-fastapi.md)/[02](02-frontend-nextjs.md)) trả lời "code đặt ở đâu, viết sao" — file
này trả lời câu hỏi khác: "**đã xong thật chưa**", dùng khi audit lại 1 module đã tồn tại (không chỉ
lúc mới code xong).

## Checklist — 1 feature/module không nhỏ coi là "xong" khi

- [ ] **Có spec** ở `docs/features/<slug>.md` nếu là UI surface mới/thay đổi kiến trúc/lưu trữ (theo
      AGENTS.md rule 2) — spec ở trạng thái "accepted", không phải draft treo mãi.
- [ ] **Có ADR** nếu có quyết định kiến trúc thật (đổi lib lớn/storage/cách agent gọi nhau — AGENTS.md
      rule 3) — ADR phản ánh đúng trạng thái hiện tại, không phải dự định chưa làm.
- [ ] **`docs/domain/`** khớp entity thật nếu có entity mới/đổi field.
- [ ] **Không còn code cũ song song** sau khi đổi cách làm — route/endpoint/hook/component/schema
      của cách làm cũ không còn ai gọi phải xoá, không giữ "cho chắc". Ngoại lệ: đang chủ đích giữ
      compatibility layer trong giai đoạn migrate → phải có comment/docstring nói rõ **điều kiện
      xoá** (vd "xoá khi FE hết gọi route X"), không giữ vô thời hạn không lý do.
- [ ] **Flow end-to-end chạy được thật** — không chỉ đọc code thấy "có vẻ đúng"; ít nhất verify tay
      qua browser/API 1 lần (golden path), ghi lại trong `docs/roadmap/README.md` nếu là feature
      lớn (đúng thói quen hiện có của repo).
- [ ] **Pattern nhất quán với module cùng loại** — module CRUD mới giống `model/` (mẫu đơn giản
      nhất); registry mới giống `provider_adapter.py`/`tool/builder.py` (xem "Modular/swappable
      component" ở [01-backend-fastapi.md](01-backend-fastapi.md)); không tự nghĩ cấu trúc khác cho
      cùng 1 loại vấn đề đã có tiền lệ.
- [ ] **Naming/layering đúng** [05-naming.md](05-naming.md) + convention layering tương ứng.
- [ ] **Mở rộng sau có dễ không** — thêm 1 biến thể cùng loại (provider/tool kind/feature tương tự)
      có cần sửa nhiều chỗ không liên quan không, hay chỉ 1 class/1 file mới + đăng ký (đúng tinh
      thần "linh kiện thay được" — xem mục Modular/swappable component).

## Anti-pattern

- ❌ Giữ route/hook/component cũ "phòng khi cần" sau khi đã có cách làm mới thay thế hoàn toàn,
  không ai gọi — dead code làm rối bức tranh cho agent sau đọc nhầm là vẫn đang dùng.
- ❌ Spec/ADR ghi 1 đằng, code chạy 1 nẻo (tài liệu lệch thực tế) — cập nhật doc khi code đổi hướng,
  không để tài liệu "đông cứng" lúc mới viết.
- ❌ Copy cấu trúc/pattern module cũ máy móc khi bản chất vấn đề khác (vd bắt buộc registry cho case
  chỉ có 1 implementation thật) — đọc "Nguyên tắc thiết kế" tương ứng trước khi quyết định.

## Dùng ở đâu

- Skill `module-review` (xem `.claude/skills/module-review/SKILL.md`) — audit toàn diện 1
  feature/module hiện có, dùng checklist này làm rubric chính.
- `code-reviewer` — khi diff động tới phần lớn 1 module (không chỉ sửa nhỏ), thêm nhóm 10 ở
  [08-code-review.md](08-code-review.md) trỏ về đây.
