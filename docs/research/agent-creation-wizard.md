# Research: Flow tạo Agent nâng cao (wizard) — tham khảo OpenAI Custom GPT & Dify Agent

Liên quan spec: `docs/features/agent-creation-wizard.md`

## Câu hỏi nghiên cứu

Ultron hiện tạo Agent bằng 1 form phẳng (`NewAgentView.tsx` → `AgentForm.tsx`: slug/name/description/
system_prompt/model_id/is_orchestrator) rồi phải vào trang chi tiết mới gán Tool/Sub-agent, và
**Knowledge Base hoàn toàn chưa có UI gán** dù backend đã chạy được. User đã chốt hướng: đổi flow tạo
mới sang wizard nhiều bước, gán Tool/KB/Sub-agent NGAY lúc tạo. Cần trả lời trước khi chốt Goals/Non-goals
chi tiết:

1. Sản phẩm tương tự (agent/GPT builder) tổ chức field theo thứ tự nào — có gợi ý nhóm bước hợp lý cho
   wizard Ultron không (đâu là "core" bắt buộc trước, đâu là "capability" gán sau)?
2. Sản phẩm tương tự có bắt buộc đi hết flow cấu hình trước khi dùng được không, hay cho tạo tối thiểu
   rồi bổ sung sau?
3. Cái gì trong các sản phẩm này KHÔNG áp dụng được cho Ultron (do rule 1-agent-instance, không phải
   multi-tenant, hoặc do model dữ liệu khác)?

## Sản phẩm/tài liệu tham khảo

- **OpenAI Custom GPT Builder** ([Creating and editing GPTs](https://help.openai.com/en/articles/8554397-creating-editing-gpts), [openai.com/academy/custom-gpts](https://openai.com/academy/custom-gpts)): GPT builder có 2 tab — **Create** (chat với AI để soạn thảo instructions) và **Configure** (form tay). Configure tab liệt kê field theo nhóm: Name → Description → Instructions → Conversation starters (optional) → **Knowledge** (upload file) → **Capabilities** (web browse/image/code interpreter — bật/tắt) → **Actions** (custom API/tool). Field bắt buộc tối thiểu chỉ là Name; phần còn lại optional, sửa được bất kỳ lúc nào sau khi tạo.
- **Dify — Agent app** ([docs.dify.ai/en/use-dify/build/agent](https://docs.dify.ai/en/use-dify/build/agent)): **Không phải wizard nhiều bước** — 1 panel cấu hình duy nhất (trái: prompt/tools/KB, phải: preview chat để debug ngay). Thứ tự khuyến nghị trong tài liệu: cấu hình Prompt → chọn Model → gán Tools (model tự quyết khi nào gọi) → gán Knowledge Base (kèm bật/tắt metadata filtering) → multimodal input → Debug & Publish. Mọi phần đều optional và sửa lại được bất kỳ lúc nào — không có khái niệm "hoàn tất từng bước rồi mới qua bước sau".

## So sánh

| Vấn đề | OpenAI GPT Builder | Dify Agent | Ultron nên rút ra gì |
|---|---|---|---|
| Cấu trúc UI tạo mới | 2 tab (Create hội thoại / Configure form) | 1 panel form + preview chat cạnh nhau | Cả 2 **không dùng multi-step wizard chặn tuần tự** — nhưng đây là sản phẩm multi-tenant/growth, tối ưu cho "thử nhanh rồi publish". Ultron đã chốt hướng wizard (quyết định của user, giữ nguyên) — điểm học được là **field ordering**, không phải bỏ wizard |
| Thứ tự field | Name → Description → Instructions → (optional) Conversation starters → Knowledge → Capabilities → Actions | Prompt → Model → Tools → Knowledge Base → multimodal | Cả 2 đặt **danh tính + hành vi cốt lõi (name/description/instructions/prompt/model) trước, "năng lực gắn thêm" (tool/knowledge/action) sau** — khớp trực giác: phải biết agent "là ai" trước khi gắn nó biết làm gì. Gợi ý nhóm bước cho wizard Ultron: Bước 1 = định danh + model (name/slug/description/system_prompt/model_id, tương đương AgentForm hiện tại), Bước 2+ = Tool, Bước 3+ = Knowledge Base, Bước cuối = Sub-agent (delegation, đặc thù riêng Ultron — 2 sản phẩm này không có khái niệm sub-agent ở bước tạo) |
| Bắt buộc đi hết cấu hình? | Không — chỉ Name bắt buộc, phần còn lại sửa sau bất kỳ lúc nào | Không — mọi phần optional, publish được với cấu hình tối thiểu | Cả 2 đều **không ép hoàn thành 100% trước khi dùng được** — chỉ có 1 tập field lõi bắt buộc (ở Ultron hiện là slug/name/system_prompt/model_id, đã required ở `AgentForm`). Đây là câu hỏi mở cần user chốt cho wizard Ultron: mỗi bước Tool/KB/Sub-agent có nút "Bỏ qua bước này" hay bắt buộc phải xem qua (không nhất thiết phải chọn gì) rồi mới next |
| Gán Knowledge/Tool là gì | Knowledge = upload file trực tiếp vào GPT (không phải chọn từ 1 kho KB có sẵn dùng chung nhiều GPT) | Chọn Knowledge Base **có sẵn** (đã tạo/index từ trước) để gán — đúng mô hình many-to-many như Ultron | Dify khớp mô hình Ultron hơn (KnowledgeBase là entity độc lập, nhiều Agent có thể dùng chung 1 KB qua `AgentKnowledgeBase`) — wizard bước Knowledge Base nên là **chọn từ danh sách KB đã có** (không phải upload file mới ngay trong wizard tạo agent) |
| Preview/debug lúc cấu hình | Preview chat luôn nằm cạnh Configure tab, test ngay không cần rời màn hình | Preview chat luôn nằm cạnh panel cấu hình | Cả 2 đều gắn preview chat real-time cạnh form cấu hình — Ultron **không cần copy phần này cho v1**: agent mới tạo chưa có gì để "test" ý nghĩa (chưa chắc gán xong Tool/KB), và preview chat thật cần chạy full turn LangGraph (phức tạp hơn nhiều so với form validate) — ghi vào "Không áp dụng" |

## Insight áp dụng cho Ultron

1. **Nhóm bước theo "định danh trước, năng lực sau"**: bước 1 = field cốt lõi bắt buộc hiện có
   (slug/name/description/system_prompt/model_id/is_orchestrator), các bước sau lần lượt là Tool,
   Knowledge Base, Sub-agent (Ultron có thêm Sub-agent — đặc thù multi-tier orchestrator không sản
   phẩm nào ở trên có).
2. **Không ép hoàn thành 100% wizard mới tạo được agent** — cả 2 sản phẩm tham khảo đều chỉ bắt buộc
   field lõi, phần gán resource là optional/sửa sau. Điều này ủng hộ việc thêm nút "Bỏ qua, tạo agent"
   ở các bước Tool/KB/Sub-agent — nhưng đây vẫn là quyết định UX cần user chốt (xem Câu hỏi mở trong
   spec), không tự quyết ở research.
3. **Knowledge Base trong wizard Ultron là bước "chọn từ danh sách có sẵn"**, giống Dify, KHÔNG phải
   "upload file mới" giống OpenAI GPT Knowledge — đúng với model dữ liệu Ultron hiện tại
   (`AgentKnowledgeBase` many-to-many, KB được tạo/quản lý riêng ở `/knowledge-bases`).
4. **UI component gán từng resource nên tái dùng đúng pattern đã có** (`AgentToolManager` — chọn từ
   dropdown "candidate chưa gán" + list "đã gán" + nút gỡ) thay vì phát minh lại — chỉ khác chỗ trong
   wizard chưa có `agentId` (agent chưa tồn tại) nên cần 1 biến thể "chọn nháp trước, gửi API sau khi
   agent đã tạo" — đây là insight kỹ thuật để `solution-architect` cân nhắc (tạo agent trước rồi gán
   tuần tự qua các API sẵn có, hay cần API mới nhận toàn bộ payload 1 lần) — không tự quyết ở đây.

## Không áp dụng / ngoài phạm vi

- **Preview chat cạnh form lúc đang tạo** — cả OpenAI/Dify đều có, nhưng đây là tính năng runtime nặng
  (chạy 1 turn LangGraph thật) không cần cho v1 chốt flow tạo. Có thể là 1 cải tiến sau, không đưa vào
  spec này.
- **Tab "Create" hội thoại với AI để tự sinh instructions** (GPT Builder) — không liên quan, khác hẳn
  scope "wizard nhiều bước nhập tay" mà user đã chốt.
- **Knowledge = upload file trực tiếp trong lúc tạo agent** (OpenAI) — không khớp model dữ liệu Ultron
  (KnowledgeBase là entity riêng, quản lý ở nơi khác).
- **Multi-tenant/publish/share GPT ra store, workspace permission khi gán tool** — không áp dụng, Ultron
  là công cụ 1 người dùng ([AGENTS.md rule 6](../../AGENTS.md)).
- **Maximum Iterations / metadata filtering khi gán Tool/KB** (Dify) — feature nâng cao không có tương
  đương trong backend Ultron hiện tại (`AgentTool`/`AgentKnowledgeBase` không có field cấu hình thêm) —
  ngoài phạm vi, không tự thêm field DB mới ở đây.
