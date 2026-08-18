# ADR-0007 — Tài nguyên độc lập: Model, Tool, KnowledgeBase, Settings

- **Status**: accepted
- **Date**: 2026-08-18

## Context

`Agent.model` (string, ADR-0006) hardcode provider = Ollama trong code (`chat/graph.py::_model_for`). Không config được provider khác (Gemini, OpenAI). Đồng thời cần: tool gán theo từng agent (không phải chỉ orchestrator), knowledge base cho RAG, và 1 nơi lưu preference (default model/agent) sửa được qua API.

## Decision

Tách 4 resource độc lập, agent chỉ **tham chiếu** tới chúng qua FK/join-table:

```
Model            — provider config: slug, provider (ollama|gemini|openai), model_id, base_url?, is_embedding, extra_config
Tool             — slug, name, description, kind, config (CRUD only ở bản đầu — CHƯA wire vào chat execution)
KnowledgeBase    — slug, name, embedding_model_id (FK Model, phải is_embedding=true)
KnowledgeChunk   — kb_id, content, embedding (pgvector), metadata
AppSettings      — singleton row: default_model_id, default_agent_id (sửa qua API, không cần restart)

AgentTool            — many-to-many agent ↔ tool (gán tool theo TỪNG agent, không phải chỉ orchestrator)
AgentKnowledgeBase   — many-to-many agent ↔ knowledge_base
```

`Agent.model` (string) đổi thành `Agent.model_id` (FK → `models.id`).

**API key provider** (Gemini/OpenAI) vẫn đọc từ **env var** (`.env`), KHÔNG lưu trong `Model`/DB — tránh bài toán mã hoá secret at-rest (đã cảnh báo ở review OpenJarvis về OAuth token plaintext).

**Provider factory** (`app/core/providers.py`) build đúng LangChain chat/embedding class theo `Model.provider`:

```python
build_chat_model(provider, model_id, base_url) -> BaseChatModel
build_embeddings(provider, model_id, base_url) -> Embeddings
```

`chat/graph.py` nhận `ModelConfig`/`SubAgentSpec` (dataclass thuần, không phải ORM object) — tách khỏi DB, `ChatService` chịu trách nhiệm resolve Agent → Model trước khi gọi graph.

## Consequences

- ✅ Đổi provider/model cho 1 agent chỉ cần sửa `Model` row hoặc đổi `Agent.model_id` — không sửa code.
- ✅ Gemini dùng được ngay khi có `GEMINI_API_KEY` trong `.env` — không cần đổi ADR sau.
- ✅ Tool/KB gán theo từng agent độc lập, sub-agent cũng có thể có tool/KB riêng (không chỉ orchestrator).
- ⚠️ **Tool CRUD nhưng CHƯA wire vào chat execution** — đăng ký metadata Tool được, nhưng gọi thật (execute) khi chat chưa nối — cần thêm registry Python thật (roadmap riêng, ADR-0005 approval-gate áp dụng khi làm).
- ⚠️ **pgvector cột `embedding` fix dimension = 768** (khớp `nomic-embed-text` đã có sẵn qua Ollama) — KB dùng embedding model khác dimension sẽ lỗi ở bản đầu. Multi-dimension (`vector` không fix size) để sau khi cần.
- ⚠️ `AppSettings` là **1 row duy nhất** (không multi-profile) — đúng tinh thần "Ultron 1 người dùng" (ADR-0001).

## Alternatives considered

- **Provider/API-key lưu trong `Model` row (DB)**: loại — cần mã hoá at-rest, thêm phức tạp không cần thiết cho 1 người dùng, env var đơn giản hơn và an toàn tương đương (file `.env` cục bộ, gitignored).
- **Tool gán ở cấp Orchestrator (áp dụng cho mọi sub-agent)**: loại theo yêu cầu — user muốn tool độc lập theo từng agent.
