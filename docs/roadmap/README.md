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
| Streaming (SSE) cho chat text | ✅ Đã có | [`docs/features/chat-streaming.md`](../features/chat-streaming.md) |
| Live Voice Agent (realtime voice, full-duplex, barge-in, VAD) | 🔜 Backend + `apps/web` client đã code — chưa live-test với mic thật (sandbox preview chặn `getUserMedia`) | [`docs/features/live-voice-agent.md`](../features/live-voice-agent.md), [ADR-0009](../adr/0009-live-voice-gemini-live-websocket-relay.md), [research](../research/live-voice-agent.md) |
| Knowledge base v2 (folder nested kiểu Google Drive, per-file chunking status, embedding dimension linh hoạt thay vì fix 768) | ✅ Đã có (backend) | làm thẳng không qua ADR/spec riêng (quyết định của user) — `KnowledgeFolder`/`KnowledgeFile`, migration `a1c2e3f4b5d6` |
| Quản lý provider credential (API key) qua DB + UI (dialog 3 cột: provider → model+capabilities → credential), thay vì chỉ `.env` | ✅ Đã có | [`docs/features/model-credential-management.md`](../features/model-credential-management.md), [research](../research/model-credential-management.md), [mockup](../mockups/model-credential-management.html), [ADR-0010](../adr/0010-provider-credential-in-db.md) |
| Pull model Ollama qua UI (catalog browse + progress bar, SSE) | ✅ Đã có | [ADR-0011](../adr/0011-ollama-pull-sse-streaming.md) |
| Provider adapter abstraction (đổi/thêm provider không sửa if/elif rải rác) + seed model catalog hosted vào DB | ✅ Đã có | [ADR-0012](../adr/0012-provider-adapter-abstraction.md) |

Feature mới nào không nhỏ → viết `docs/features/<slug>.md` (skill `feature-spec` / `/spec`) trước,
cập nhật link ở bảng trên, rồi mới code — xem `.claude/hooks/session-start.mjs`.

Mockup trực quan (HTML, chưa phải implementation) ở [`docs/mockups/`](../mockups/README.md).

## Đã xong

- [x] Monorepo skeleton (pnpm + turbo cho apps/web/mobile/desktop; apps/api là project Python riêng, `uv`)
- [x] ADR-0001..0007 (single Python runtime tự viết toàn bộ, SQLAlchemy, Postgres+pgvector, Pydantic, LangGraph, multi-agent org chart many-to-many, resource Model/Tool/KB/Settings)
- [x] ADR-0008 (testing qua testcontainers Postgres thật, logging qua `structlog`) +
      `docs/conventions/03-08` (testing/error-handling/naming/security/logging/code-review) —
      convention giờ cover đủ case thiết kế như 1 monorepo trưởng thành (đối chiếu với `cap`).
      **Logging đã áp dụng thật** (`app/core/logging.py`, `structlog`, gọi lúc bootstrap
      `main.py`). Test: đã có `apps/api/tests/unit/voice/` (8 case, pass thật) nhưng
      `testcontainers[postgres]`/`tests/conftest.py`/integration test **chưa làm** — vẫn còn nợ.
      `errors.py` **chưa migrate** sang `UltronError` (04-error-handling.md).
- [x] ADR-0009 + module `voice` (`apps/api`) — relay WebSocket ↔ Gemini Live, tự viết protocol
      client (không SDK), forward tool-call vào `run_sub_agent` (tái dùng `chat/graph.py`), lưu
      transcript vào `Message` qua session DB riêng ngắn (không giữ transaction mở suốt session).
      Đã qua 1 vòng review độc lập (`code-reviewer`, REQUEST_CHANGES → đã fix hết 6 blocker: lộ
      transcript khi lỗi/transaction giữ mở, exception nuốt lặng lẽ, frame text làm crash session,
      conversation_id sai làm vỡ giao thức ASGI, thiếu `generationConfig.responseModalities`/
      transcription trong `setup` khiến transcript không thể sinh ra, API key lộ qua query
      string). **Đã live-test với `GEMINI_API_KEY` thật (2026-08-24)** qua text fallback
      (`send_text`, không phải audio thật): connect → setup → setupComplete, transcript + audio
      delta model trả đúng, `turnComplete` bắn đúng lúc, transcript flush vào `messages` sạch.
      Nhánh audio input thật (`realtimeInput.audio` blob, `goAway.timeLeft`) **chưa exercise** —
      cần client capture audio thật ở `apps/web` (Web Audio API/AudioWorklet, **chưa code**) mới
      test được hết, xem `docs/research/live-voice-agent.md`.
- [x] ADR-0010 — quyết định đảo ngược 1 phần ADR-0007: lưu API key provider (Gemini/OpenAI) trong
      DB (entity `Credential`, mã hoá AES-256-GCM với 1 key duy nhất từ `APP_ENCRYPTION_KEY`), thay
      vì chỉ `.env`. Động lực: đổi key phải sửa `.env` + restart tay, bug thật
      `os.environ.get()` không đọc được giá trị `pydantic-settings` nạp từ `.env` (gây confusion
      lúc debug voice module), và không biết key sai cho tới khi chat/voice fail giữa chừng. Chốt
      luôn: 1 credential/provider (không rotate), capability catalog là static code (không DB
      table, học bài học `cap` đã park hướng này), không FK `Model → Credential` (tra theo
      `provider`), không auto-migrate key cũ trong `.env`. **Module `credential` (`apps/api`) đã
      code xong** (model/schema/repo/service/router/deps + migration + `app/core/crypto.py`
      AES-256-GCM + `app/core/model_catalog.py` static catalog + wire `core/providers.py`/`chat`/
      `voice`/`knowledge_base` sang tra DB thay `.env`) — đã qua `code-reviewer` (0 blocker), live-
      verify thật qua `curl` (encrypt/decrypt roundtrip, test-connection thật, reject
      `ollama`/`sglang`). Unit test `crypto.py`/`credential/service.py` đã viết (14 case). **Dialog
      UI 3 cột (`apps/web`, `src/features/credential/`) đã code xong** — verify thật qua browser
      (filter provider, lưu/test/xoá credential roundtrip qua API thật).
- [x] ADR-0011 + module `ollama` (`apps/api`) — catalog Ollama tĩnh để browse + pull model về máy
      qua SSE (`GET /ollama/pull`, proxy Ollama `/api/pull` thật, forward NDJSON→SSE event), nhúng
      vào dialog Model & Credential khi chọn provider `ollama` (`apps/web/src/features/ollama/`).
      Live-verify thật: pull `qwen2.5:0.5b` thành công qua UI, progress bar cập nhật đúng,
      `installed` tự refresh sau khi pull xong. Qua `code-reviewer` (0 blocker, 4 warning đã fix:
      `EventSource` cleanup khi unmount, `list_installed` báo lỗi network rõ ràng thay vì 500 mù,
      validate query param `model`, thêm test `tests/unit/ollama/`).
- [x] ADR-0012 + `provider_adapter.py` — 1 `Protocol` (`build_chat_model`/`build_embeddings`/
      `test_connection`) + registry dict thay if/elif lặp ở `core/providers.py` và
      `credential/service.py` (đúng threshold "adapter khi ≥2 call site lặp", không abstract
      speculative). Mở rộng `model_catalog.py`: thêm Gemini 3.x series (`gemini-3.7-flash` đến
      `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview`, `gemini-3-flash-preview`) +
      `gemini-embedding-001` (capability xác nhận qua model card chính thức Google, 2026-08-23).
      Model catalog hosted (gemini/openai) được **seed sẵn vào DB** qua Alembic migration
      (`f1a2b3c4d5e6`) — AgentForm/Settings chọn thẳng, không cần user tự tạo `Model` cho từng
      model hosted (chỉ tự tạo cho self-host: ollama/sglang, vì cần khai `base_url`).
      `apps/web`: `ModelCatalogPanel` browse catalog + capability badge (kể cả badge
      "embedding"), `ModelForm` gợi ý Model ID qua `<datalist>` (lọc theo `is_embedding` đang
      chọn). Tiện thể fix bug hệ thống `@base-ui/react` Select's `SelectValue` hiện raw ID thay
      vì label (5 file). Qua `code-reviewer` (0 blocker, 2 warning đã fix: mismatch `is_embedding`
      FE/BE, thiếu test cho registry/endpoint — đã thêm `tests/unit/core/test_provider_adapter.py`
      + `test_model_catalog.py` + `tests/unit/model/test_router.py`, 13 case). Live-test chat thật
      sau khi thêm credential Gemini qua UI phát hiện thêm 2 bug: (1) lỗi cấu hình (thiếu
      credential) bị nhét chung vào nhánh 502 "Model không phản hồi được" — user không biết sửa
      gì; giờ bắt riêng `ProviderConfigError` → 400 kèm message rõ ràng. (2) Gemini 2.5+ trả
      `AIMessage.content` dạng list content-block (thinking/signature) — code cũ `str(content)`
      in cả repr Python ra tin nhắn lưu DB; đã thêm `_extract_text()` chỉ lấy block `type=="text"`.
- [x] Chat-streaming (SSE, [`docs/features/chat-streaming.md`](../features/chat-streaming.md)) —
      `POST /conversations/{id}/chat` đổi từ JSON 1 lần sang `StreamingResponse` (`text/event-stream`),
      dùng `graph.astream_events(version="v2")` (LangGraph hỗ trợ sẵn) để lấy token delta +
      tool-call start/end khi orchestrator gọi sub-agent. Event: `delta`/`tool_call_start`/
      `tool_call_end`/`error`/`done` — JSON đồng nhất cho mọi loại. Lỗi giữa lúc stream (thiếu
      credential...) là 1 event `error`, không phải HTTP status khác (status 200 đã gửi trước khi
      biết lỗi). `apps/web`: `useChatStream` đọc `response.body` bằng tay (không dùng
      `EventSource` — chỉ hỗ trợ GET), thay hẳn `useSendMessage` (mutation JSON cũ, không giữ
      song song). Test: `tests/unit/chat/test_chat_service.py` (2 case, mock executor). Bug thật
      phát hiện qua live-test: `_extract_text()` fallback `str(content)` khi chunk rỗng làm rác
      `"[]"` lẫn vào giữa stream — đã fix (trả rỗng thay vì stringify). Live-verify qua browser
      thật: text hiện tăng dần, auto-scroll theo, persist đúng sau khi `done` (không lặp/thiếu).
      **Chưa live-test nhánh tool_call_start/end với orchestrator thật** (chỉ có unit test mock —
      chưa có agent nào có sub-agent delegation thật trong DB lúc test).
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

- [ ] **Áp dụng phần còn lại của convention 03-08 vào code thật** — `testcontainers[postgres]` +
      `tests/conftest.py` cho integration test, migrate `app/core/errors.py` sang `UltronError`
      (xem [ADR-0008](../adr/0008-testing-logging-foundations.md) +
      [04-error-handling.md](../conventions/04-error-handling.md)); logging + unit test đầu tiên
      đã xong (xem mục "Đã xong"). Cài Vitest cho `apps/web` (chưa cài).
- [ ] **OpenAI/SGLang provider chưa live-test** — code đã viết (`core/providers.py`), nhưng môi trường hiện tại không có `OPENAI_API_KEY` hay SGLang server chạy để test thật. **Gemini đã live-test** (2026-08-24, credential thêm qua UI): chat text (`gemini-3.7-flash`) và Voice (xem "Đã xong" ADR-0009) đều chạy đúng qua provider adapter.
- [ ] **Migrate `create_react_agent` → `langchain.agents.create_agent` chưa live-test** — đổi do upstream deprecate (LangGraph ≥ 1.2), build graph + import đã verify OK, nhưng môi trường hiện tại không có Ollama chạy để verify thật 1 turn chat + orchestrator gọi sub-agent như lần verify trước (`boss-agent`/`echo-agent`). Cần chạy lại kịch bản đó.
- [ ] Wire `Tool` (đã CRUD) vào chat execution thật — hiện agent có thể được gán tool qua `AgentTool` nhưng `chat/graph.py` chưa đọc danh sách đó để build LangGraph tool tương ứng (chỉ mới tool ẩn "gọi sub-agent" hoạt động)
- [ ] Wire `KnowledgeBase` (đã CRUD + search) vào chat execution — agent có `AgentKnowledgeBase` nhưng chưa có tool RAG tự động tra KB trong lúc chat
- [ ] Ghi lại tool-call của orchestrator (gọi sub-agent) vào bảng `tool_calls` — hiện `create_react_agent` tự quản lý tool call nội bộ, chưa persist ra bảng đã thiết kế
- [ ] Tool thật tự viết (tham khảo pattern OpenJarvis, không import): GitHub search/read, MCP client (Jira/Confluence), tool chạy lệnh trên máy (có approval gate — ADR-0005)
- [ ] Live Voice Agent — spec chuyển "accepted" (2026-08-24, xem
      [`docs/features/live-voice-agent.md`](../features/live-voice-agent.md)). `apps/api` module
      `voice` đã có event `state` (listening/thinking/speaking/using_tool, suy từ event Gemini có
      sẵn — xem "Đã xong"). `apps/web`: `features/voice/` mới — `useVoiceSession` (mic capture qua
      AudioWorklet 16kHz PCM → WebSocket, playback audio model 24kHz PCM qua Web Audio API,
      barge-in dừng playback khi nhận `interrupted`) + `VoicePanel` (nút start/stop, state,
      transcript live) nhúng vào `ConversationView`. **Chưa live-test với mic thật** — sandbox
      preview trong Claude Code chặn `getUserMedia`, chỉ verify được: connect/graceful error khi
      permission denied, không verify được audio capture/playback thật. Cần test tay trên browser
      thật (Chrome/Safari, HTTPS hoặc localhost) trước khi coi module `voice` full-duplex là done —
      đặc biệt: worklet có convert đúng PCM không, playback có khớp 24kHz không lệch tốc độ/pitch,
      barge-in có phản hồi đúng lúc không. Theo
      [ADR-0009](../adr/0009-live-voice-gemini-live-websocket-relay.md).
- [ ] `apps/web` — canvas orchestrator (graph editor kiểu ReactFlow) — hiện chỉ có mockup, xem bảng "Tầm nhìn sản phẩm"
- [ ] `apps/web` — KB folder tree UI (backend đã có `KnowledgeFolder`/`KnowledgeFile`, frontend chưa build — vẫn chỉ CRUD phẳng)
- [ ] Migration `a1c2e3f4b5d6` chưa verify chạy thật trên Postgres — cần `uv run alembic upgrade head` khi có DB + môi trường `uv sync` hoạt động
- [ ] `apps/mobile` — Expo (React Native)
- [ ] `apps/desktop` — Tauri
- [ ] Channel điện thoại: chọn 1 trong Telegram/WhatsApp làm kênh chính
- [ ] User cần nhập lại API key Gemini/OpenAI qua UI mới (dialog Model & Credential) sau khi deploy
      — không auto-migrate từ `.env` cũ, quyết định có chủ đích
      ([ADR-0010](../adr/0010-provider-credential-in-db.md)).

## Chưa quyết (cần ADR trước khi code)

- Có port tiếp connector nào của OpenJarvis sang viết mới không, thứ tự ưu tiên connector.
- Cơ chế đồng hồ thông minh (không có tích hợp native — có thể phải qua app điện thoại trung gian).
- A2A protocol thật (HTTP/JSON-RPC, AgentCard) khi cần gọi agent chạy ngoài process/máy khác (ADR-0006 mới chỉ giải bài toán nội bộ).
- Multi-dimension embedding (hiện fix cứng 768, khớp nomic-embed-text) — nếu dùng embedding model khác dimension (vd Gemini embedding) cần ADR đổi cách lưu vector.
