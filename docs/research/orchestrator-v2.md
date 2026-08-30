# Research: Orchestrator v2 — visual graph editor cho multi-agent

Liên quan spec: `docs/features/orchestrator-v2.md`

## Câu hỏi nghiên cứu

Sản phẩm nào cũng có "canvas kiểu ReactFlow" để lắp workflow/agent graph — họ giải quyết 4 vấn đề
Ultron đang thiếu như thế nào:

1. **Contract giữa 2 node** — khi user nối 1 edge, sản phẩm có bắt user mô tả "nhiệm vụ"/"khi nào
   đi qua cạnh này"/"input-output mong đợi" không, hay chỉ là dây nối dữ liệu thuần?
2. **Readiness/validation trước khi chạy** — có check "node này thiếu cấu hình gì" trước khi Run
   không, hiển thị ở đâu?
3. **Run thử (simulator)** — chạy graph với input mẫu ngay trong canvas, xem token stream/path đi
   qua node nào, có tách biệt khỏi "chạy thật" (persist) không?
4. **Trace inspector** — xem lại 1 lần chạy quá khứ theo từng node/edge (input/output, thời gian,
   lỗi) như thế nào?

## Sản phẩm/tài liệu tham khảo

- **LangGraph Studio** ([Graph Visualization — DeepWiki](https://deepwiki.com/langchain-ai/langgraph-studio/5.2-graph-visualization), [Troubleshooting & Debugging](https://mintlify.wiki/langchain-ai/langgraph/guides/debugging)): IDE desktop render graph LangGraph thật (code-first, không phải drag-drop tạo graph) thành diagram sống — node đang chạy được highlight, có thể step qua từng node, inspect state tại mỗi checkpoint, và **replay lại 1 run từ bất kỳ checkpoint nào**. Tích hợp LangSmith tracing — mỗi lần thực thi 1 node link sang trace chi tiết (token, latency, lỗi).
- **n8n** ([Connections](https://docs.n8n.io/build/understand-workflows/workflow-components/connect-nodes-together), [Data mapping](https://docs.n8n.io/data/data-mapping/)): drag-drop nối node bằng dây — 1 connection = ống dẫn dữ liệu (output node trước → input node sau), không có ô mô tả "nhiệm vụ"/"khi nào" bằng ngôn ngữ tự nhiên. Double-click 1 node xem input/output (Schema/Table/JSON view) của lần chạy gần nhất — nhưng đây là workflow **deterministic dataflow** (mỗi node luôn chạy nếu đường đi tới nó được kích hoạt), không phải agent LLM tự quyết định gọi node nào.
- **Dify Workflow** ([Node description](https://legacy-docs.dify.ai/guides/workflow/node), [Dify 1.5.0 — real-time debugging](https://dify.ai/blog/dify-1-5-0-real-time-workflow-debugging-that-actually-works)): có **Graph Validator** chạy trước khi execute (pre-run integrity check — theo kiến trúc GraphEngine/EdgeProcessor/Graph Validator họ mô tả). Bản 1.5.0 thêm **"Last Run"** — mỗi node tự lưu input/output/metadata của lần chạy gần nhất (thành công hoặc lỗi), cộng **Variable Inspect Panel** — 1 bảng dưới canvas xem toàn bộ biến hiện có theo thời gian thực, sửa tay giá trị biến để test nhánh sau **không cần chạy lại toàn bộ workflow** (đặc biệt hữu ích khi node trước gọi API tốn tiền/chậm). Chạy **1 node riêng lẻ** (tự lấy input phụ thuộc từ Variable Pool) — ví dụ họ đưa ra: sửa template node → chạy lại đúng node đó → chạy tiếp node LLM ngay sau, không rerun từ đầu.
- **CrewAI Flows** ([Flow creation — DeepWiki](https://deepwiki.com/crewAIInc/crewAI/3.1-flow-creation-and-structure)): **code-first**, không có canvas kéo-thả — flow định nghĩa bằng Python class + decorator (`@start`/`@listen`/`@router`), state quản lý qua dict/Pydantic model có proxy thread-safe khi nhiều listener sửa song song. `flow.plot()` sinh 1 HTML diagram tĩnh (chỉ để xem, không sửa được) — mục đích nêu rõ: "catches routing logic errors before hitting API budget", tức là dùng graph visualization như 1 dạng validate-trước-khi-chạy, không phải runtime debugger.

## So sánh

| Sản phẩm | Cách làm | Ưu | Nhược / không hợp với Ultron |
|---|---|---|---|
| LangGraph Studio | Render graph LangGraph thật, step/replay từng checkpoint, link LangSmith trace | Ultron đã dùng LangGraph + đã có `AsyncPostgresSaver` checkpointer (ADR-0014) — replay-từ-checkpoint là ý tưởng tận dụng được ngay hạ tầng có sẵn | Không phải visual **editor** (không tạo/sửa graph bằng kéo-thả) — Ultron cần cả 2 (editor lẫn debugger), phải tự làm phần editor |
| n8n | Connection = ống dữ liệu thuần, xem input/output lần chạy gần nhất per-node | UX "double-click xem input/output lần chạy gần nhất" áp dụng tốt cho trace inspector | Mô hình dataflow tất định (mọi node có input sẵn sàng đều chạy) khác hẳn mô hình Ultron: agent orchestrator **tự quyết định (LLM tool-calling)** có gọi sub-agent nào hay không — "contract" ở Ultron cần mô tả bằng ngôn ngữ tự nhiên "khi nào gọi" (giống tool description hiện tại), không phải type-mapping input/output cứng như n8n |
| Dify Workflow | Graph Validator trước run, Last Run + Variable Inspect Panel, chạy 1 node riêng lẻ không rerun toàn bộ | Readiness check (Graph Validator) + Last Run per node là 2 pattern khớp thẳng với nhu cầu "readiness check" + "trace inspector" đã ghi trong roadmap Orchestrator v2 | Đa-tenant/workspace, phiên bản node ecosystem lớn (nhiều loại node có sẵn) — không liên quan Ultron |
| CrewAI Flows | Code-first, `flow.plot()` chỉ để xem tĩnh | Insight: dùng graph static-check để bắt lỗi routing TRƯỚC KHI chạy thật (tốn API budget) — đúng tinh thần "readiness check" | Không có canvas editor thật — không có gì để tham khảo cho phần UI kéo-thả |

## Insight áp dụng cho Ultron

- **Readiness check trước khi chạy** (từ Dify Graph Validator + CrewAI `flow.plot()`): kiểm tra
  toàn bộ agent + sub-agent **transitive** trong graph (đệ quy theo `AgentDelegation`, tái dùng BFS
  đã có ở `AgentService._creates_cycle`) — agent thiếu credential provider (ADR-0010), thiếu model
  hợp lệ, tool `kind=mcp`/`http` cấu hình sai, KB rỗng... nên báo NGAY trên canvas (badge ở node),
  không phải chờ chat thật fail giữa chừng.
- **"Last Run" per node/edge** (Dify): thay vì thiết kế trace inspector phức tạp ngay từ đầu, có
  thể bắt đầu bằng lưu **lần chạy gần nhất** của mỗi node/edge (input/output/timestamp/lỗi) — rẻ
  hơn nhiều so với lưu full history mọi lần chạy, đủ cho nhu cầu debug 1 người dùng.
- **Replay từ checkpoint** (LangGraph Studio): Ultron đã có `AsyncPostgresSaver` (ADR-0014, dùng
  cho approval-gate) — `thread_id` hiện là `conversation_id`. Cân nhắc tận dụng lại đúng
  checkpointer này cho "run simulator"/trace thay vì xây cơ chế lưu trạng thái riêng — quyết định
  cụ thể nên để `solution-architect` (đọc ADR-0014) chứ BA không tự chốt kiến trúc.
- **Contract edge nên là mô tả nhiệm vụ bằng ngôn ngữ tự nhiên** (khác n8n type-mapping) — vì cơ
  chế gọi sub-agent hiện tại (`chat/graph.py::_build_sub_agent_tool`) đã là 1 LangChain tool với
  `description` (hiện lấy từ `agent.description` chung, không phải riêng theo từng edge/orchestrator
  gọi nó) — "edge contract" tự nhiên nhất là mở rộng thành `description` **riêng theo từng
  `AgentDelegation`** (khi nào gọi, input/output mong đợi), không phải schema JSON cứng kiểu n8n.
- **Chạy thử 1 phần graph không cần rerun toàn bộ** (Dify Variable Inspect Panel): áp dụng được cho
  "run simulator" — test riêng 1 sub-agent với task giả lập (giống hệt cách `run_sub_agent()` hiện
  tại đã tách sẵn ra 1 hàm độc lập, dễ gọi trực tiếp cho mục đích test).

## Không áp dụng / ngoài phạm vi

- **Multi-user/collab editing realtime** (n8n/Dify bản cloud có sharing, version control theo team,
  comment giữa nhiều người) — Ultron là công cụ 1 người dùng (AGENTS.md rule 6), không cần.
- **Node marketplace / cộng đồng node có sẵn** (n8n có hàng trăm integration node) — Ultron chỉ có
  1 loại "node" là `Agent` (đã có Model/Tool/KB riêng qua CRUD khác), không cần khái niệm node
  ecosystem như workflow tool tổng quát.
- **Billing/execution quota hiển thị trên canvas** (phổ biến ở SaaS workflow tool) — không liên
  quan, Ultron không tính phí theo execution.
- **CrewAI code-first flow (decorator Python)** — hướng ngược lại nhu cầu user (cần canvas kéo-thả
  ReactFlow thật, không phải code); không tham khảo được gì cho phần UI, chỉ tham khảo được ý
  tưởng "static validate trước khi chạy".
- **n8n type-strict data mapping giữa mọi node (JSON item list chuẩn hoá)** — không áp dụng nguyên
  bản; Ultron cần contract dạng mô tả nhiệm vụ (tool description) hơn là schema I/O cứng, vì
  orchestrator quyết định gọi sub-agent nào là do LLM suy luận, không phải pipe dữ liệu tất định.
