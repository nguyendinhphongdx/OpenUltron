# ADR-0003 — Database: PostgreSQL + pgvector

- **Status**: accepted
- **Date**: 2026-08-18 (revised — bản đầu chọn SQLite, đã đảo lại)

## Context

Ultron cần RAG (search code GitHub, docs, Jira/Confluence) — cần vector search bên cạnh dữ liệu quan hệ (`conversations`/`messages`/`tool_calls`). Bản đầu ADR này chọn SQLite (đơn giản, local-first) nhưng SQLite không có vector search ổn định qua mọi driver.

## Decision

Dùng **PostgreSQL + extension `pgvector`**:

- 1 DB duy nhất cho cả dữ liệu quan hệ (conversation/message/tool_call) và vector embedding (RAG) — ít moving part hơn phải chạy riêng vector store.
- Chạy local qua Docker Compose (`infra/docker-compose.yml`) khi dev — vẫn "local-first" (chạy trên máy cá nhân), chỉ khác SQLite ở việc cần 1 container.
- Cột embedding dùng type `Vector` (`pgvector-sqlalchemy` hoặc raw `vector(n)` qua Alembic).

## Consequences

- ✅ RAG (GitHub/docs/Jira/Confluence) và conversation data trong cùng 1 DB, join được trực tiếp (vd lấy context RAG kèm message).
- ✅ pgvector đủ tốt cho scale cá nhân (không cần Pinecone/Weaviate/Qdrant riêng).
- ⚠️ Cần Docker chạy local (không còn "chỉ 1 file .db" đơn giản như SQLite).
- ⚠️ OpenJarvis (Rust) đã có sẵn backend vector riêng (FAISS/ColBERT/hybrid, local-only, không cần Postgres) cho chế độ hoàn toàn on-device — **quyết định mở**: Ultron dùng pgvector làm nguồn RAG chính, backend Rust của OpenJarvis dùng khi cần chế độ offline hoàn toàn (chưa quyết chi tiết, ghi vào roadmap).

## Alternatives considered

- **SQLite** (quyết định cũ): loại vì thiếu vector search ổn định cho RAG.
- **SQLite + vector store riêng (Chroma/FAISS file)**: loại vì thêm 1 hệ lưu trữ riêng phải đồng bộ với conversation data — pgvector gộp được cả 2.
