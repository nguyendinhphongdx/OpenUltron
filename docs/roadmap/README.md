# Roadmap

> Đọc đầu mỗi session — biết đang ở đâu, làm tiếp gì.

## Đã xong

- [x] Monorepo skeleton (pnpm + turbo cho apps/web/mobile/desktop; apps/api là project Python riêng, `uv`)
- [x] ADR-0001..0007 (single Python runtime tự viết toàn bộ, SQLAlchemy, Postgres+pgvector, Pydantic, LangGraph, multi-agent org chart many-to-many, resource Model/Tool/KB/Settings)
- [x] `apps/api`: FastAPI + SQLAlchemy (Postgres/pgvector) + Pydantic
  - Module `conversation` (+ sub-resource `message`, `tool_call`), health check
  - Module `agent` — CRUD Agent (slug/system_prompt/model_id/is_orchestrator) + `AgentDelegation` (many-to-many)
  - Module `chat` — chạy 1 turn qua LangGraph `create_react_agent`; orchestrator có tool gọi sub-agent (1 tầng)
  - Module `model` — resource Model (provider ollama/gemini/openai + model_id + base_url), factory `core/providers.py` build đúng LangChain class theo provider
  - Module `settings` — `AppSettings` singleton (`default_model_id`, `default_agent_id`), sửa qua `PATCH /settings`, dùng làm fallback khi conversation không gán agent
  - Module `tool` — CRUD Tool + `AgentTool` (gán tool theo từng agent, `POST/GET/DELETE /agents/{id}/tools`)
  - Module `knowledge_base` — CRUD KnowledgeBase + `KnowledgeChunk` (pgvector, dim=768) + `AgentKnowledgeBase`; `POST /knowledge-bases/{id}/chunks` (auto-embed), `POST /knowledge-bases/{id}/search` (cosine distance)
  - **Verify thật (không mock)**: tạo Model (ollama qwen3.5:4b + nomic-embed-text) → tạo Agent tham chiếu model_id → set `AppSettings.default_model_id` → chat qua conversation không gán agent (fallback settings) trả đúng response → tạo KB + 2 chunk thật (embedding qua Ollama) → search phân biệt đúng theo semantic (chunk liên quan score 0.22, chunk không liên quan score 0.60) → gán Tool + KB vào 1 agent cụ thể qua API
  - **Đã verify trước đó**: orchestrator (`boss-agent`) + sub-agent (`echo-agent`) qua `AgentDelegation`, orchestrator gọi đúng sub-agent qua LangGraph tool (không ổn định 100% — model nhỏ đôi khi không gọi tool dù system prompt yêu cầu, ghi nhận là giới hạn thật)
- [x] `apps/web` scaffold — Next.js 15 + React 19 + Tailwind v4, theo convention [`docs/conventions/02-frontend-nextjs.md`](../conventions/02-frontend-nextjs.md). Feature `conversation` (list + thread) làm mẫu layering `types→services→hooks→components`, gọi thẳng `apps/api`. `pnpm build`/`typecheck`/`dev` đã verify chạy được (chưa nối `apps/api` thật lúc dev — cần `uv run fastapi dev` song song)

## Đang làm / tiếp theo

- [ ] **Gemini/OpenAI provider chưa live-test** — code đã viết (`core/providers.py`), nhưng môi trường hiện tại không có `GEMINI_API_KEY`/`OPENAI_API_KEY` để chạy thật. Cần test khi có key.
- [ ] Wire `Tool` (đã CRUD) vào chat execution thật — hiện agent có thể được gán tool qua `AgentTool` nhưng `chat/graph.py` chưa đọc danh sách đó để build LangGraph tool tương ứng (chỉ mới tool ẩn "gọi sub-agent" hoạt động)
- [ ] Wire `KnowledgeBase` (đã CRUD + search) vào chat execution — agent có `AgentKnowledgeBase` nhưng chưa có tool RAG tự động tra KB trong lúc chat
- [ ] Ghi lại tool-call của orchestrator (gọi sub-agent) vào bảng `tool_calls` — hiện `create_react_agent` tự quản lý tool call nội bộ, chưa persist ra bảng đã thiết kế
- [ ] Streaming: `apps/api` → client (SSE) cho cả chat thường và quá trình orchestrator gọi sub-agent
- [ ] Tool thật tự viết (tham khảo pattern OpenJarvis, không import): GitHub search/read, MCP client (Jira/Confluence), tool chạy lệnh trên máy (có approval gate — ADR-0005)
- [ ] Multi-tầng orchestrator (sub-agent cũng được gọi tiếp sub-agent khác) — cần cơ chế chống cycle trước (ADR-0006 giới hạn 1 tầng ở bản đầu)
- [ ] `apps/web` — feature `agent`/`model`/`tool`/`knowledge-base` (UI quản lý org chart, provider, tool, KB) — chưa làm, mới có `conversation`
- [ ] `apps/mobile` — Expo (React Native)
- [ ] `apps/desktop` — Tauri
- [ ] Channel điện thoại: chọn 1 trong Telegram/WhatsApp làm kênh chính

## Chưa quyết (cần ADR trước khi code)

- Có port tiếp connector nào của OpenJarvis sang viết mới không, thứ tự ưu tiên connector.
- Cơ chế đồng hồ thông minh (không có tích hợp native — có thể phải qua app điện thoại trung gian).
- A2A protocol thật (HTTP/JSON-RPC, AgentCard) khi cần gọi agent chạy ngoài process/máy khác (ADR-0006 mới chỉ giải bài toán nội bộ).
- Multi-dimension embedding (hiện fix cứng 768, khớp nomic-embed-text) — nếu dùng embedding model khác dimension (vd Gemini embedding) cần ADR đổi cách lưu vector.
