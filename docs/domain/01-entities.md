# Domain — Conversation / Message / ToolCall

> Canonical model cho `apps/api`. Khớp `app/modules/conversation/**/models.py`. DB = PostgreSQL ([ADR-0003](../adr/0003-db-postgres-pgvector.md)).

## Conversation

1 phiên chat, có thể tới từ nhiều nguồn (`channel`): `cli`, `web`, `mobile`, `telegram`, `whatsapp`...

| Field              | Kiểu       | Ghi chú                              |
| ------------------ | ---------- | ------------------------------------- |
| `id`               | Int PK     | autoincrement (serial)                |
| `channel`          | String     | nguồn vào: cli/web/telegram/...       |
| `external_user_id` | String?    | id người dùng phía channel (nếu có)   |
| `agent`            | String?    | agent/graph dùng cho conversation     |
| `title`            | String?    | tiêu đề hiển thị                      |
| `metadata`         | JSONB?     | tự do                                 |
| `created_at`       | DateTime   |                                        |
| `updated_at`       | DateTime   |                                        |

## Message

1 lượt trong conversation — user/assistant/system/tool.

| Field                | Kiểu     | Ghi chú                          |
| -------------------- | -------- | --------------------------------- |
| `id`                 | Int PK   | autoincrement                     |
| `conversation_id`    | Int FK   |                                    |
| `seq`                | Int      | thứ tự trong conversation, unique theo `(conversation_id, seq)` |
| `role`               | String   | `system` \| `user` \| `assistant` \| `tool` |
| `content`            | Text     |                                    |
| `tokens_prompt`      | Int?     |                                    |
| `tokens_completion`  | Int?     |                                    |
| `cost_usd`           | Float?   |                                    |
| `embedding`          | Vector?  | pgvector — cho RAG/semantic search, thêm sau khi cần |
| `metadata`           | JSONB?   |                                    |
| `created_at`         | DateTime |                                    |

## ToolCall

1 lần agent gọi tool, gắn với message (assistant) đã yêu cầu gọi.

| Field             | Kiểu     | Ghi chú                                |
| ----------------- | -------- | ----------------------------------------- |
| `id`              | Int PK   | autoincrement                            |
| `message_id`      | Int FK   |                                           |
| `tool_name`       | String   |                                           |
| `arguments`       | JSONB    |                                           |
| `result`          | JSONB?   | null nếu chưa xong                       |
| `status`          | String   | `pending` \| `success` \| `error`        |
| `started_at`      | DateTime |                                           |
| `ended_at`        | DateTime?|                                           |
| `latency_seconds` | Float?   |                                           |
| `error`           | Text?    |                                           |

## Quan hệ

```
Conversation 1───N Message 1───N ToolCall
```

`ToolCall` không đứng độc lập — luôn thuộc 1 `Message` (assistant message đã request tool đó). Xoá `Conversation` → cascade xoá `Message` → cascade xoá `ToolCall`.
