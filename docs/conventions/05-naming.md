# Convention — Naming (cross-language)

> Canonical duy nhất cho naming — `backend-engineer`/`frontend-engineer`/`code-reviewer` trỏ vào
> đây, không lặp lại bảng này ở convention layering ([01](01-backend-fastapi.md)/
> [02](02-frontend-nextjs.md)).

## Per-ngôn ngữ

| Ngôn ngữ | Variable/function | Class/type | Constant | File |
|---|---|---|---|---|
| **Python** (`apps/api`) | `snake_case` | `PascalCase` | `UPPER_SNAKE_CASE` | `snake_case.py` |
| **TypeScript** (`apps/web`) | `camelCase` | `PascalCase` | `UPPER_SNAKE_CASE` | `kebab-case.ts` (component `PascalCase.tsx` — exception) |
| **SQL** (SQLAlchemy model/migration) | `snake_case` (column) | `PascalCase` (class) | — | `snake_case` (migration file do alembic tự đặt) |
| **Env var** | `UPPER_SNAKE_CASE` | — | — | — |

**Quy tắc cứng**: 1 casing/ngôn ngữ, không mix trong cùng file (vd hàm `snake_case` cạnh biến
`camelCase` trong `.py` là sai).

## Wire format (API request/response) — quyết định khác `cap`

Ultron giữ **`snake_case`** xuyên field JSON, KHÔNG chuyển sang `camelCase` như `cap` (cap toàn TS
nên field JSON camelCase tự nhiên; Ultron backend là Python nên field JSON đi thẳng từ Pydantic
field name — `snake_case`). Đây là thực tế đã có sẵn trong code (`apps/api/app/modules/model/
schemas.py` field `model_id`, `base_url`... và FE `apps/web/src/features/model/types/*.ts` giữ
nguyên `model_id`, `base_url` — không alias) — không phải quyết định mới, ghi lại ở đây để không ai
"sửa cho đúng chuẩn REST" rồi vô tình đổi field và gãy FE.

```json
{ "model_id": "gpt-4o", "base_url": null, "is_embedding": false, "created_at": "..." }
```

`apps/web` type field cũng **giữ `snake_case`** khớp thẳng response — không viết property camelCase
rồi map tay (tăng chỗ dễ lệch/quên update).

## Python chi tiết

```python
# Variable / function — snake_case
conversation_id = "..."
def find_by_channel(channel_id: int) -> Conversation: ...

# Class — PascalCase
class ConversationService: ...
class ToolCallRead(BaseModel): ...

# Constant module-level — UPPER_SNAKE_CASE
MAX_DELEGATION_DEPTH = 5
DEFAULT_EMBEDDING_DIMENSION = 768

# File — snake_case
tool_call.py
knowledge_base.py
```

## TypeScript chi tiết

```ts
// Variable / function — camelCase
const conversationId = 'xxx';
function useAgentList(workspaceId: string) { ... }

// Class/type/interface — PascalCase
interface Model { model_id: string }   // field giữ snake_case khớp BE — xem "Wire format" trên
type Provider = 'ollama' | 'gemini' | 'openai' | 'sglang';

// Component — PascalCase, file PascalCase.tsx (exception duy nhất)
function AgentCard({ agent }: Props) { ... }   // file: AgentCard.tsx

// Hook/service/util — camelCase code, kebab-case file
function useAgentList() { ... }        // file: use-agent-list.ts
```

## Domain glossary

Term chuẩn (đổi tên 1 entity đã đặt → phải sửa cả 3 chỗ: model/schema BE, type FE, doc domain —
không đổi 1 chỗ rồi để lệch):

| Domain | Python (BE) | TS (FE, giữ snake_case field) | DB table/column |
|---|---|---|---|
| Conversation | `Conversation`, `conversation_id` | `Conversation`, `conversation_id` | `conversations`, `conversation_id` |
| Message | `Message`, `message_id` | `Message`, `message_id` | `messages`, `message_id` |
| ToolCall | `ToolCall`, `tool_call_id` | `ToolCall`, `tool_call_id` | `tool_calls`, `tool_call_id` |
| Agent | `Agent`, `agent_id` | `Agent`, `agent_id` | `agents`, `agent_id` |
| AgentDelegation | `AgentDelegation` | `AgentDelegation` | `agent_delegations` |
| Model | `Model`, `model_id` (entity id, khác field `model_id` = tên model provider — xem note) | như BE | `models` |
| Tool | `Tool`, `tool_id` | `Tool`, `tool_id` | `tools` |
| KnowledgeBase | `KnowledgeBase`, `kb_id` | `KnowledgeBase`, `kb_id` | `knowledge_bases` |
| KnowledgeFolder/File/Chunk | `KnowledgeFolder`, `KnowledgeFile`, `KnowledgeChunk` | như BE | `knowledge_folders`/`_files`/`_chunks` |

> **Lưu ý trùng tên đã biết**: entity `Model` (resource CRUD) có field `model_id: str` (tên model
> phía provider, ví dụ `"gpt-4o"`) — khác với khái niệm chung "`<entity>_id`" (khoá chính của bảng
> `models` là `id`, không phải `model_id`). Không tự sửa field `model_id` thành `provider_model_id`
> hay tương tự mà chưa hỏi — tên này đã cố định trong code + FE type hiện tại.

## Abbreviation

- **OK viết tắt**: `id`, `url`, `api`, `kb` (Knowledge Base), `llm`. Giữ lowercase trong
  `snake_case`/`camelCase`: `model_id`, `base_url`, `kb_id`.
- **Không viết tắt** business term: `agent` không viết `agt`, `conversation` không viết `conv`.

## Anti-pattern

- ❌ Mix `snake_case` biến + `camelCase` hàm trong cùng file Python.
- ❌ Tự đổi field JSON sang `camelCase` "cho đúng chuẩn REST" — vi phạm quyết định "Wire format" ở
  trên, gãy FE type đang khớp `snake_case`.
- ❌ Viết tắt tự chế (`agt`, `conv`, `kb_file` thay `knowledge_file`).
- ❌ Đặt tên theo loại thay vì mục đích: `data`, `info`, `value`, `temp`, `obj`.
- ❌ Đổi tên entity đã có trong "Domain glossary" mà không sửa đồng bộ BE + FE + doc domain.

## Self-check trước khi xong

- [ ] Không mix casing trong 1 file.
- [ ] Field JSON mới vẫn `snake_case`, FE type khớp nguyên field đó (không tự alias camelCase).
- [ ] Term entity mới → đã thêm vào "Domain glossary" ở trên và `docs/domain/`.
