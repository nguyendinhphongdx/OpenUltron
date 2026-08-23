# Roadmap

> Đọc đầu mỗi session — biết đang ở đâu, làm tiếp gì.

## Tầm nhìn sản phẩm

Ultron là 1 nền tảng agent cá nhân: nhiều **Agent** (mỗi agent gắn 1 **Model**, nhiều **Tool**,
nhiều **KnowledgeBase**) → chat trực tiếp với 1 agent, hoặc cấp cao hơn — lắp nhiều agent vào 1
**orchestrator app** dạng canvas (kiểu ReactFlow: 1 supervisor + nhiều agent liên kết tự do, không
giới hạn 1 tầng như hiện tại) → thực thi bằng LangGraph, 1 số model chạy qua **SGLang** (tự host),
có **streaming** khi chat/chạy graph.

| Feature | Trạng thái | Spec |
|---|---|---|
| Agent/Model/Tool/KnowledgeBase (CRUD + gắn nhau qua FK/join-table) | ✅ Đã có | ADR-0006, ADR-0007 |
| Chat trực tiếp với 1 agent (đơn hoặc orchestrator gọi sub-agent, đa tầng) | ✅ Đã có | ADR-0005, ADR-0006 |
| Multi-tier orchestrator (sub-agent gọi tiếp sub-agent khác) | ✅ Đã có (backend) | mở rộng ADR-0006, làm thẳng không qua ADR/spec riêng (quyết định của user) — xem `AgentService._creates_cycle` |
| Orchestrator graph editor (canvas kiểu ReactFlow) | 🔜 Dự kiến — có mockup | chưa có `docs/features/` (mockup: `docs/mockups/`) |
| SGLang provider (model tự host cạnh ollama/gemini/openai) | ✅ Đã có (backend) | mở rộng ADR-0007, `core/providers.py` (dùng `ChatOpenAI`/`OpenAIEmbeddings` trỏ `base_url`) |
| Streaming (SSE) cho chat + graph run | 🔜 Dự kiến | chưa có `docs/features/` |
| Live Voice Agent (realtime voice, full-duplex, barge-in, VAD) | 🔜 Dự kiến — spec draft, kiến trúc đã chốt (tự code protocol, không dùng SDK) | [`docs/features/live-voice-agent.md`](../features/live-voice-agent.md), [ADR-0009](../adr/0009-live-voice-gemini-live-websocket-relay.md), [research](../research/live-voice-agent.md) |
| Knowledge base v2 (folder nested kiểu Google Drive, per-file chunking status, embedding dimension linh hoạt thay vì fix 768) | ✅ Đã có (backend) | làm thẳng không qua ADR/spec riêng (quyết định của user) — `KnowledgeFolder`/`KnowledgeFile`, migration `a1c2e3f4b5d6` |

Feature mới nào không nhỏ → viết `docs/features/<slug>.md` (skill `feature-spec` / `/spec`) trước,
cập nhật link ở bảng trên, rồi mới code — xem `.claude/hooks/session-start.mjs`.

Mockup trực quan (HTML, chưa phải implementation) ở [`docs/mockups/`](../mockups/README.md).

## Đã xong

- [x] Monorepo skeleton (pnpm + turbo cho apps/web/mobile/desktop; apps/api là project Python riêng, `uv`)
- [x] ADR-0001..0007 (single Python runtime tự viết toàn bộ, SQLAlchemy, Postgres+pgvector, Pydantic, LangGraph, multi-agent org chart many-to-many, resource Model/Tool/KB/Settings)
- [x] ADR-0008 (testing qua testcontainers Postgres thật, logging qua `structlog`) +
      `docs/conventions/03-08` (testing/error-handling/naming/security/logging/code-review) —
      convention giờ cover đủ case thiết kế như 1 monorepo trưởng thành (đối chiếu với `cap`), chưa
      áp dụng vào code thật (chưa cài `structlog`/`testcontainers`, chưa viết test đầu tiên)
- [x] ADR-0009 (Live Voice Agent: provider Gemini Live, transport WebSocket relay qua `apps/api` —
      chưa code, chốt kiến trúc trước khi làm module `voice_session`)
- [x] `apps/api`: FastAPI + SQLAlchemy (Postgres/pgvector) + Pydantic
  - Module `conversation` (+ sub-resource `message`, `tool_call`), health check
  - Module `agent` — CRUD Agent (slug/system_prompt/model_id/is_orchestrator) + `AgentDelegation` (many-to-many)
  - Module `chat` — chạy 1 turn qua LangGraph (`langchain.agents.create_agent`); orchestrator có tool gọi sub-agent, **đa tầng** (sub-agent tự nó gọi tiếp sub-agent khác, `MAX_DELEGATION_DEPTH=5` phòng thủ) + chống cycle khi tạo `AgentDelegation` (`AgentService._creates_cycle`, BFS)
  - Module `model` — resource Model (provider ollama/gemini/openai/**sglang** + model_id + base_url), factory `core/providers.py` build đúng LangChain class theo provider (sglang dùng `ChatOpenAI`/`OpenAIEmbeddings` trỏ `base_url`, tương thích OpenAI API)
  - Module `settings` — `AppSettings` singleton (`default_model_id`, `default_agent_id`), sửa qua `PATCH /settings`, dùng làm fallback khi conversation không gán agent
  - Module `tool` — CRUD Tool + `AgentTool` (gán tool theo từng agent, `POST/GET/DELETE /agents/{id}/tools`)
  - Module `knowledge_base` — CRUD KnowledgeBase + `KnowledgeChunk` (pgvector, **dimension linh hoạt** — không fix 768 nữa) + `AgentKnowledgeBase`; **`KnowledgeFolder`** (nested kiểu Google Drive) + **`KnowledgeFile`** (`status`: pending/chunking/done/error) mới; `POST /knowledge-bases/{id}/chunks` (auto-embed, không gắn file — tương thích ngược) và `POST .../files/{id}/chunks` (gắn file, cập nhật status); `POST /knowledge-bases/{id}/search` (cosine distance). Migration `a1c2e3f4b5d6` **chưa chạy thật** (chưa có Postgres/uv sync verify được trong môi trường hiện tại — cần `uv run alembic upgrade head` khi có DB)
  - **Verify thật (không mock)**: tạo Model (ollama qwen3.5:4b + nomic-embed-text) → tạo Agent tham chiếu model_id → set `AppSettings.default_model_id` → chat qua conversation không gán agent (fallback settings) trả đúng response → tạo KB + 2 chunk thật (embedding qua Ollama) → search phân biệt đúng theo semantic (chunk liên quan score 0.22, chunk không liên quan score 0.60) → gán Tool + KB vào 1 agent cụ thể qua API
  - **Đã verify trước đó**: orchestrator (`boss-agent`) + sub-agent (`echo-agent`) qua `AgentDelegation`, orchestrator gọi đúng sub-agent qua LangGraph tool (không ổn định 100% — model nhỏ đôi khi không gọi tool dù system prompt yêu cầu, ghi nhận là giới hạn thật)
- [x] `apps/web` — Next.js 15 + React 19 + Tailwind v4, theo convention [`docs/conventions/02-frontend-nextjs.md`](../conventions/02-frontend-nextjs.md). Feature `conversation`/`agent`/`model`/`tool`/`knowledge-base`/`settings` (UI CRUD phẳng: list/form), layering `types→services→hooks→components`, gọi thẳng `apps/api`. `pnpm build`/`typecheck`/`dev` đã verify chạy được (chưa nối `apps/api` thật lúc dev — cần `uv run fastapi dev` song song)

## Đang làm / tiếp theo

- [ ] **Áp dụng convention 03-08 vào code thật** — thêm `structlog`/`testcontainers[postgres]` vào
      `apps/api/pyproject.toml`, viết `app/core/logging.py`, migrate `app/core/errors.py` sang
      `UltronError` (xem [ADR-0008](../adr/0008-testing-logging-foundations.md) +
      [04-error-handling.md](../conventions/04-error-handling.md)), viết test đầu tiên ở
      `apps/api/tests/` (chưa có file nào) và cài Vitest cho `apps/web` (chưa cài).
- [ ] **Gemini/OpenAI/SGLang provider chưa live-test** — code đã viết (`core/providers.py`), nhưng môi trường hiện tại không có `GEMINI_API_KEY`/`OPENAI_API_KEY` hay SGLang server chạy để test thật. Cần test khi có.
- [ ] **Migrate `create_react_agent` → `langchain.agents.create_agent` chưa live-test** — đổi do upstream deprecate (LangGraph ≥ 1.2), build graph + import đã verify OK, nhưng môi trường hiện tại không có Ollama chạy để verify thật 1 turn chat + orchestrator gọi sub-agent như lần verify trước (`boss-agent`/`echo-agent`). Cần chạy lại kịch bản đó.
- [ ] Wire `Tool` (đã CRUD) vào chat execution thật — hiện agent có thể được gán tool qua `AgentTool` nhưng `chat/graph.py` chưa đọc danh sách đó để build LangGraph tool tương ứng (chỉ mới tool ẩn "gọi sub-agent" hoạt động)
- [ ] Wire `KnowledgeBase` (đã CRUD + search) vào chat execution — agent có `AgentKnowledgeBase` nhưng chưa có tool RAG tự động tra KB trong lúc chat
- [ ] Ghi lại tool-call của orchestrator (gọi sub-agent) vào bảng `tool_calls` — hiện `create_react_agent` tự quản lý tool call nội bộ, chưa persist ra bảng đã thiết kế
- [ ] Streaming: `apps/api` → client (SSE) cho cả chat thường và quá trình orchestrator gọi sub-agent
- [ ] Tool thật tự viết (tham khảo pattern OpenJarvis, không import): GitHub search/read, MCP client (Jira/Confluence), tool chạy lệnh trên máy (có approval gate — ADR-0005)
- [ ] Live Voice Agent — code module `voice_session` (`apps/api`, relay WebSocket ↔ Gemini Live) +
      client audio capture (`apps/web`), theo [ADR-0009](../adr/0009-live-voice-gemini-live-websocket-relay.md)
      và [`docs/features/live-voice-agent.md`](../features/live-voice-agent.md) — còn 2 câu hỏi mở
      chưa quyết (text fallback trả lời audio/text, có lưu file audio hay chỉ transcript) cần chốt
      trước hoặc trong lúc code.
- [ ] `apps/web` — canvas orchestrator (graph editor kiểu ReactFlow) — hiện chỉ có mockup, xem bảng "Tầm nhìn sản phẩm"
- [ ] `apps/web` — KB folder tree UI (backend đã có `KnowledgeFolder`/`KnowledgeFile`, frontend chưa build — vẫn chỉ CRUD phẳng)
- [ ] Migration `a1c2e3f4b5d6` chưa verify chạy thật trên Postgres — cần `uv run alembic upgrade head` khi có DB + môi trường `uv sync` hoạt động
- [ ] `apps/mobile` — Expo (React Native)
- [ ] `apps/desktop` — Tauri
- [ ] Channel điện thoại: chọn 1 trong Telegram/WhatsApp làm kênh chính

## Chưa quyết (cần ADR trước khi code)

- Có port tiếp connector nào của OpenJarvis sang viết mới không, thứ tự ưu tiên connector.
- Cơ chế đồng hồ thông minh (không có tích hợp native — có thể phải qua app điện thoại trung gian).
- A2A protocol thật (HTTP/JSON-RPC, AgentCard) khi cần gọi agent chạy ngoài process/máy khác (ADR-0006 mới chỉ giải bài toán nội bộ).
- Multi-dimension embedding (hiện fix cứng 768, khớp nomic-embed-text) — nếu dùng embedding model khác dimension (vd Gemini embedding) cần ADR đổi cách lưu vector.
