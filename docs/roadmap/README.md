# Roadmap

> Đọc đầu mỗi session — biết đang ở đâu, làm tiếp gì.

## Tầm nhìn sản phẩm

Ultron là 1 nền tảng agent cá nhân: nhiều **Agent** (mỗi agent gắn 1 **Model**, nhiều **Tool**,
nhiều **KnowledgeBase**) → chat trực tiếp với 1 agent, hoặc cấp cao hơn — lắp nhiều agent vào 1
**orchestrator app** dạng canvas (kiểu ReactFlow: 1 supervisor + nhiều agent liên kết tự do, không
giới hạn 1 tầng như hiện tại) → thực thi bằng LangGraph, 1 số model chạy qua **SGLang** (tự host),
có **streaming** khi chat/chạy graph.

Đích sản phẩm không dừng ở web/mobile. Web là console cấu hình và debug; mobile là companion
runtime; trải nghiệm chính dài hạn là **ambient AI interface**: người dùng nói/nghe với agent qua
tai nghe, đồng hồ thông minh, kính đeo hoặc thiết bị luôn ở cạnh người dùng, không phải mở laptop
hay gõ chữ. Mọi surface này phải dùng chung agent runtime/tool/KB/MCP/orchestrator — chỉ khác
input/output adapter.

| Feature | Trạng thái | Spec |
|---|---|---|
| Agent/Model/Tool/KnowledgeBase (CRUD + gắn nhau qua FK/join-table) | ✅ Đã có | ADR-0006, ADR-0007 |
| Chat trực tiếp với 1 agent (đơn hoặc orchestrator gọi sub-agent, đa tầng) | ⚠️ Partial — chạy được path cơ bản, chưa phải orchestrator runtime đúng nghĩa | ADR-0005, ADR-0006; cần Orchestrator v2 spec |
| Multi-tier orchestrator (sub-agent gọi tiếp sub-agent khác) | ⚠️ Partial backend — có delegation đệ quy, nhưng chưa có edge contract/routing policy/debug trace/approval nested đầy đủ | mở rộng ADR-0006, làm thẳng không qua ADR/spec riêng (quyết định cũ của user) — cần spec/ADR mới để chuẩn hoá |
| Orchestrator graph editor (canvas kiểu ReactFlow) | ⚠️ Partial UI — xem/thêm/gỡ edge được, nhưng setup agent graph chưa đủ tốt để chạy thật ổn định | `OrchestratorCanvas.tsx` (`@xyflow/react`); thiếu edge config, run simulator, readiness check, saved layout |
| SGLang provider (model tự host cạnh ollama/gemini/openai) | ✅ Đã có (backend) | mở rộng ADR-0007, `core/providers.py` (dùng `ChatOpenAI`/`OpenAIEmbeddings` trỏ `base_url`) |
| Streaming (SSE) cho chat text | ✅ Đã có | [`docs/features/chat-streaming.md`](../features/chat-streaming.md) |
| Live Voice Agent (realtime voice, full-duplex, barge-in, VAD) | 🔜 Backend + `apps/web` client đã code — chưa live-test với mic thật (sandbox preview chặn `getUserMedia`) | [`docs/features/live-voice-agent.md`](../features/live-voice-agent.md), [ADR-0009](../adr/0009-live-voice-gemini-live-websocket-relay.md), [research](../research/live-voice-agent.md) |
| Knowledge base v2 (folder nested kiểu Google Drive, per-file chunking status, embedding dimension linh hoạt thay vì fix 768) | ✅ Đã có (backend) | làm thẳng không qua ADR/spec riêng (quyết định của user) — `KnowledgeFolder`/`KnowledgeFile`, migration `a1c2e3f4b5d6` |
| Redesign UI Knowledge Base ở `apps/web` (nhiều trang: danh sách list/grid + filter/search/sort, trang chi tiết có metric + list kiểu Google Drive folder toggle in-place, trang xem chunk của 1 file) | ✅ Đã có | [`docs/features/knowledge-base-ui-redesign.md`](../features/knowledge-base-ui-redesign.md), [research (so sánh Dify)](../research/knowledge-base-ui-redesign.md) |
| Quản lý provider credential (API key) qua DB + UI (dialog 3 cột: provider → model+capabilities → credential), thay vì chỉ `.env` | ✅ Đã có | [`docs/features/model-credential-management.md`](../features/model-credential-management.md), [research](../research/model-credential-management.md), [mockup](../mockups/model-credential-management.html), [ADR-0010](../adr/0010-provider-credential-in-db.md) |
| Pull model Ollama qua UI (catalog browse + progress bar, SSE) | ✅ Đã có | [ADR-0011](../adr/0011-ollama-pull-sse-streaming.md) |
| Provider adapter abstraction (đổi/thêm provider không sửa if/elif rải rác) + seed model catalog hosted vào DB | ✅ Đã có | [ADR-0012](../adr/0012-provider-adapter-abstraction.md) |
| Orchestrator v2 — setup/run/debug đúng nghĩa (graph editor ReactFlow, custom được) | ✅ Đã có — Phase A/B/C/D đều xong (edge contract, readiness, saved layout, trace inspector, run simulator) | [`docs/features/orchestrator-v2.md`](../features/orchestrator-v2.md), [research](../research/orchestrator-v2.md), [mockup](../mockups/orchestrator-v2.html), [addendum ADR-0014](../adr/0014-tool-approval-gate.md) |
| Agent creation wizard + Knowledge Base binding UI + nâng cấp trang chi tiết Agent | ✅ Đã có (2026-08-30) — chưa live-verify qua browser (thiếu Postgres/Ollama trong sandbox) | [`docs/features/agent-creation-wizard.md`](../features/agent-creation-wizard.md), [research](../research/agent-creation-wizard.md), [mockup](../mockups/agent-creation-wizard.html) |
| Agent Execution Trace (xem lại think→tool-call→...→trả lời trong 1 turn) — Phase 1 xem, Phase 2 chỉnh sửa reasoning loop để sau (cần ADR riêng) | ✅ Phase 1 xong (2026-08-31) — chưa live-verify qua browser (thiếu Postgres/model trong sandbox) | [`docs/features/agent-execution-trace.md`](../features/agent-execution-trace.md) |
| Unified agent runtime + chuẩn hoá stream/chat UI (wire contract FE↔BE) | ✅ Đã có (phần wire contract) | [`docs/features/unified-agent-stream-runtime.md`](../features/unified-agent-stream-runtime.md), [ADR-0019](../adr/0019-ag-ui-assistant-ui-runtime.md) — chuẩn hoá text stream bằng AG-UI + assistant-ui; phần backend-internal interface (LangGraph leak vào `ChatService`) tách sang dòng "Agent runtime abstraction" dưới |
| Agent runtime abstraction (`AgentRuntime`/`TurnRunner` — backend-internal interface, tách LangGraph khỏi `ChatService`) | ✅ Đã có (2026-08-30) | [`docs/features/agent-runtime-abstraction.md`](../features/agent-runtime-abstraction.md), [ADR-0020](../adr/0020-agent-runtime-interface.md) — KHÔNG tự động cover việc unify voice top-level turn (xem Non-goals trong spec) |
| Agent Execution Strategy (ReAct mặc định / Plan-Execute tuỳ chọn, chọn qua tab lúc tạo/sửa agent top-level) | 🔜 Spec draft, cần ADR-0021 trước khi code | [`docs/features/agent-execution-strategy.md`](../features/agent-execution-strategy.md) |
| Voice là input modality của agent thường | 🔜 Cần spec/ADR trước khi code | Voice session phải dùng chung agent runtime: tool, KB/RAG, MCP, sub-agent, approval; không tách thành flow voice riêng chỉ gọi provider realtime. Phụ thuộc kết quả của "Agent runtime abstraction" ở trên (interface phải có trước khi quyết voice có đi qua nó hay không) |
| Ambient / wearable AI interface (tai nghe, smartwatch, smart glasses) | 🚧 Mobile companion MVP bắt đầu | [`docs/features/mobile-ambient-companion.md`](../features/mobile-ambient-companion.md) — web/mobile không phải đích cuối; cần device adapter layer: audio I/O, wake/activation, interruption, short response mode, context capture từ camera/sensor khi có quyền, handoff sang web/mobile để xem trace dài. Phụ thuộc "Voice là input modality của agent thường" + runtime thống nhất. |

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
- [x] Wire `Tool` vào chat execution — kind=http chạy thật (ADR-0013,
      [`docs/features/agent-tool-execution.md`](../features/agent-tool-execution.md)). Research
      (n8n `$fromAI`, OpenAI function calling, Composio) → spec → ADR → plan → code, đúng thứ tự.
      `tool/builder.py`: `ToolBuilder` Protocol + registry theo `kind` (giống `ProviderAdapter`,
      ADR-0012) — `HttpToolBuilder` build `StructuredTool` thật (args_schema runtime từ
      `ai_params`, thực thi HTTP request, timeout 30s, truncate 8000 ký tự, placeholder chỉ ở
      header/query/body — không phải URL); `BuiltinToolBuilder`/`McpToolBuilder` chỉ đứng chỗ
      kiến trúc (trả `None`, agent vẫn chat được, không crash). `apps/web`: `ToolForm` bỏ hẳn ô
      JSON tự do (user bác đề xuất này) — thay form có cấu trúc (`HttpRequestFields` +
      `AiParamFields`); `AgentToolManager` (mới) gán/bỏ gán tool cho agent qua UI (trước đó chỉ có
      API, không UI). **Live-verify thật (không mock)**: tạo tool gọi Open-Meteo API qua UI, gán
      agent, chat hỏi thời tiết Hà Nội — model tự điền lat/lon, HTTP request thật chạy, trả đúng
      dữ liệu thật (mã WMO, gió, nhiệt độ). Tiện thể code hoá `UltronError`/`ValidationFailedError`
      lần đầu (`core/errors.py`, theo 04-error-handling.md) — nhưng **chỉ dùng cho tool mới**, giữ
      nguyên wire shape cũ (top-level `message`) để không phá `apps/web`; migrate toàn bộ
      service khác + đổi wire shape sang `{error:{code,message}}` + `parseApiError` phía
      `apps/web` **vẫn là nợ riêng chưa làm** (xem "Đang làm/tiếp theo").
      **Ngoài phạm vi bản này** (quyết định chủ đích, để làm sau theo thứ tự đã chốt với user
      2026-08-24): approval-gate mechanism cho tool chạy lệnh trên máy (cần thiết kế riêng, an
      toàn hơn hết), builtin tool thật (GitHub search/read; tạo file/thực thi lệnh máy — phụ
      thuộc approval-gate), MCP client generic (user tự khai server tuỳ ý).
- [x] **Approval-gate mechanism** (ADR-0014,
      [`docs/features/tool-approval-gate.md`](../features/tool-approval-gate.md)) — quyết định
      chủ đích ở mục Wire Tool phía trên coi đây là "ngoài phạm vi", làm ngay sau đó cùng ngày.
      Dùng `HumanInTheLoopMiddleware` (`langchain.agents.middleware`, tương thích trực tiếp
      `create_agent`) + `AsyncPostgresSaver` (`langgraph-checkpoint-postgres`, đã là dependency có
      sẵn từ trước, giờ đã wire — `.setup()` lúc app khởi động, tự tạo bảng riêng ngoài Alembic).
      `chat/service.py::ChatService._run_turn` — sau `astream_events` phải tự `aget_state()` để
      biết graph pause chưa (không có event tường minh — xác nhận qua research + live-test thật).
      Pause → SSE event `approval_required`; `POST /conversations/{id}/chat/approve` resume qua
      `Command(resume=...)`. `apps/web`: card duyệt (tool name + argument JSON) + nút Duyệt/Từ
      chối trong `MessageThread`. Verify bằng `approval-test-echo` (builtin tool test, echo
      argument, không làm gì thật) — **live-test thật cả approve và reject** qua API + browser:
      approve → tool chạy, model dùng kết quả; reject → tool không chạy, model biết bị từ chối.
      Bug thật phát hiện + fix: message user hiện trùng lặp (optimistic + đã persist) nếu
      react-query refetch trong lúc đang chờ duyệt (turn có thể kéo dài).
- [x] **Builtin tool GitHub search/read + connector adapter abstraction** (ADR-0015,
      2026-08-24) — module mới `app/modules/connector/` (`adapter.py`: `ConnectorAdapter`
      Protocol + registry `CONNECTORS`, độc lập hoàn toàn với `ProviderAdapter`/model provider —
      user chốt "github là connector provider khác model provider, phải chia folder rõ ràng";
      `github.py`: `GitHubConnectorAdapter.test_connection` + `search_code`/`read_file` gọi
      GitHub REST API thật). `credential/service.py::_verify`/`_ensure_supported` thử registry
      model provider (ADR-0012) trước, rồi registry connector — 2 registry độc lập, tái dùng
      nguyên `Credential` DB table/mã hoá (ADR-0010), không đổi schema. `tool/builder.py`:
      `ToolBuilder.build` đổi thành **async + nhận `session`** (cần tra credential GitHub) —
      đổi cả `HttpToolBuilder`/`McpToolBuilder`/`build_tools`/2 call site ở `chat/graph.py`;
      `BuiltinToolBuilder` dispatch theo slug (`github-search-code`/`github-read-file`), gọi
      thẳng `connector/github.py`, KHÔNG cần approval-gate (chỉ đọc, không side-effect). Tiện thể
      fix UX đã bị user phát hiện: form tạo `Tool kind=builtin` trước đây không hiện gì để chọn —
      thêm `GET /tools/builtin-catalog` + dropdown chọn slug trong `ToolForm` (tự điền
      slug+description), `kind=mcp` giờ có placeholder rõ thay vì im lặng.
      `CredentialManageDialog` thêm section "Connector" riêng (không lẫn vào model provider list,
      vì connector không có model để list). **Live-verify thật (không mock)**: `PUT
      /credentials/github` với token rác → gọi thật `GET api.github.com/user`, trả `is_valid:
      false` đúng; tạo tool `github-search-code` qua UI (chọn từ dropdown catalog, submit) →
      persist đúng; `CredentialManageDialog` mở đúng section GitHub connector qua browser thật.
      **Chưa live-test với token GitHub thật hợp lệ** (chưa có token — chỉ verify token sai bị
      từ chối đúng) và **chưa live-test agent thật sự gọi tool này trong 1 turn chat** (cần gán
      tool cho 1 agent + có credential hợp lệ).
- [x] **Builtin tool write-file/run-command — sandbox 1 working directory** (ADR-0016,
      2026-08-24) — module mới `app/core/workspace.py` (`resolve_safe_path`: validate path không
      thoát ra ngoài `WORKSPACE_ROOT`, đọc từ `settings.workspace_dir`, default
      `./data/workspace`, tự tạo nếu chưa có) — user chốt qua `AskUserQuestion` trước khi code:
      sandbox 1 thư mục cố định, không cho path/lệnh tuỳ ý. 2 builtin tool mới trong
      `tool/builder.py` (`write-file`, `run-command` — chạy qua
      `asyncio.create_subprocess_shell`, timeout 30s tự kill, truncate 8000 ký tự) — **cả 2 bắt
      buộc nằm trong `TOOLS_REQUIRING_APPROVAL`** (ADR-0014), không có cách tắt approval. Không
      whitelist/blacklist nội dung lệnh (chủ đích, xem ADR-0016 Alternatives) — approval gate là
      lớp chặn chính, sandbox path là lớp bổ sung. **Live-verify thật (không mock) qua API +
      browser**: agent thật (Gemini) gọi `write-file` → pause chờ duyệt → approve → file ghi đúng
      nội dung trên đĩa thật; `run-command` (`ls -la`) → reject → không chạy gì (model tự báo bị
      từ chối) → turn khác approve → lệnh chạy thật, output đúng trả về; **path traversal
      (`../../../../etc/...`) bị chặn dù đã approve** — xác nhận sandbox là lớp bảo vệ thật, không
      chỉ decorative.
- [x] **MCP client generic — `kind=mcp` implement thật** (ADR-0017, 2026-08-24) — research +
      **ground-truth verify thật** protocol MCP (spec vừa rewrite lớn 2026-07-28, không tin hẳn
      doc/blog) bằng cách cài `mcp==2.0.0` (SDK Python chính thức) + tự viết 1 demo server/client
      chạy thật, xác nhận đúng API (`Client(stdio_client(StdioServerParameters(...)))` cho stdio,
      `Client(url)` cho streamable HTTP, `list_tools()`/`call_tool()`). `Tool.config` khi
      `kind=mcp`: `McpStdioServerConfig`/`McpHttpServerConfig` (discriminated union theo
      `transport`) + `remote_tool_name` — 1 `Tool` row = 1 tool cụ thể trên 1 MCP server cụ thể,
      đúng model `ToolSpec` sẵn có (ADR-0013). `McpToolBuilder` **tự discover args schema qua
      `list_tools()`** (không bắt user tự khai lại `ai_params` như `kind=http` — MCP server đã tự
      chuẩn hoá schema), connect mới mỗi lần gọi (không giữ session xuyên turn). **Mọi tool
      `kind=mcp` bắt buộc qua approval gate theo `kind`, không theo slug cố định**
      (`chat/graph.py::_human_in_the_loop_middleware` — khác builtin tool vì slug MCP do user tự
      đặt tuỳ ý, không thể liệt kê trước; MCP server là process/dịch vụ ngoài, Ultron không biết
      trước nó làm gì). **Live-verify thật (không mock) qua API + browser**: tạo `Tool kind=mcp`
      trỏ vào demo server thật (tool `add(a,b)`), gán agent, chat "cộng 15 và 27" → pause chờ
      duyệt với đúng argument `{a:15,b:27}` (tên arg lấy đúng từ schema thật) → approve → kết quả
      **42** đúng qua stdio subprocess thật; config trỏ tool không tồn tại trên server → agent vẫn
      chat bình thường (thiếu đúng 1 tool, không crash turn).
- [x] **Fix kéo node trong orchestrator canvas không lưu vị trí** (2026-08-25,
      `OrchestratorCanvas.tsx`) — phát hiện qua feedback user: canvas orchestrator KHÔNG chỉ là
      mockup như roadmap ghi trước đó (đã sửa dòng đó ở trên) — code thật đã có, chỉ có bug: truyền
      `nodes` cho `<ReactFlow>` như giá trị `useMemo` derived (tính lại từ auto-layout mỗi render)
      mà không có `onNodesChange` — ReactFlow coi đây là controlled component, mọi lần kéo bị snap
      ngược lại auto-layout ngay khi có re-render tiếp theo (vd click chọn node khác). Sửa: thêm
      state `manualPositions` + `onNodesChange` (`applyNodeChanges`, API chuẩn của
      `@xyflow/react`) để giữ vị trí user tự kéo — chỉ trong session hiện tại (chưa có field toạ
      độ ở `Agent` để lưu persistent, ngoài phạm vi fix này, cần quyết định riêng nếu muốn lưu
      lâu dài).

      **Bug thứ 2 phát hiện qua chính user (gửi ảnh chụp canvas trắng, không có node nào)**: node
      bị stuck `visibility:hidden` vĩnh viễn — ban đầu nghi là artifact của công cụ test, nhưng
      ảnh user gửi xác nhận đây là bug thật, không phải do môi trường test. Điều tra sâu (đọc
      source `@xyflow/react` 12.11.3, tự gắn `ResizeObserver` riêng lên đúng DOM node để xác nhận
      ResizeObserver bản thân hoạt động bình thường, loại trừ giả thuyết container 0 kích thước và
      giả thuyết React StrictMode double-invoke bằng test trực tiếp — cả 2 đều KHÔNG phải nguyên
      nhân): root cause thật là `node.measured` (driver cho `nodeHasDimensions()`) không bao giờ
      được cập nhật, nghi lỗi nằm trong tầng cập nhật Zustand store nội bộ của thư viện — chưa xác
      định chính xác dòng code lỗi (không đáng bỏ thêm thời gian debug sâu vào code bên thứ 3).
      **Fix bằng cách né hoàn toàn runtime measurement**: khai `initialWidth`/`initialHeight` tường
      minh trên mỗi node (API chính thức của `@xyflow/react` cho node có kích thước cố định biết
      trước — khớp `AgentNodeCard` luôn render `w-44` cố định) — `nodeHasDimensions()` trả `true`
      ngay từ đầu, không cần chờ `ResizeObserver`. **Live-verify thật qua browser** (sau khi loại
      trừ nghi vấn ban đầu, tự mở tab mới sạch, khởi động lại dev server để đảm bảo không phải cache
      cũ): node hiện đúng, kéo giữ nguyên vị trí sau khi click chọn node khác (đúng kịch bản bug gốc
      user báo) — xác nhận cả 2 bug đã sửa dứt điểm.

      **Bug thứ 3 (cùng root cause, phát hiện ngay sau đó qua feedback user)**: edge nối 2 node
      không hiện — `internals.handleBounds` (vị trí handle để vẽ đường nối) phụ thuộc đúng tầng
      measurement đã xác định lỗi ở trên, độc lập với `initialWidth`/`initialHeight`. Sửa bằng
      cách khai `handles` tường minh trên mỗi node (API chính thức của `@xyflow/react`,
      `getEdgePosition` có fallback đọc thẳng `node.handles` khi `internals.handleBounds` rỗng) —
      khớp 2 `<Handle>` thật trong `AgentNodeCard` (target `Position.Top`, source
      `Position.Bottom`). Live-verify qua browser: edge "delegate" hiện đúng, nối 2 node, mũi tên
      đúng hướng.
- [x] **Wire KnowledgeBase vào chat execution — RAG tool tự động** (2026-08-24,
      [`docs/features/knowledge-base-chat-wiring.md`](../features/knowledge-base-chat-wiring.md))
      — agent (top-level hoặc sub-agent, đa tầng) có N `KnowledgeBase` đã gán qua
      `AgentKnowledgeBase` → tự động có N tool `search-knowledge-base-{slug}` trong graph, KHÔNG
      cần tạo `Tool` row hay config gì thêm — điều kiện duy nhất là đã gán KB (UI/API cũ).
      `chat/graph.py::_build_kb_search_tool` gọi `KnowledgeBaseService.search` có sẵn (không viết
      lại logic), không đi qua `Tool`/`ToolBuilder` registry (ADR-0013 — KB gán qua quan hệ riêng,
      cùng cách tool "delegate sub-agent" cũng không đi qua registry đó). **Refactor đi kèm**:
      `ChatService.resolve_context()` đổi từ tuple trần sang dataclass `ChatContext` — tuple trần
      chính là nguyên nhân bug thật vừa fix ở voice module (unpack sai số lượng, lỗi âm thầm);
      thêm field thứ 5 (`knowledge_bases`) là đúng lúc sửa luôn cho an toàn hơn (dataclass buộc gọi
      qua tên field). **Live-verify thật (không mock)**: tạo KB thật + 1 chunk ("mật khẩu wifi..."),
      gán cho agent, chat hỏi đúng câu liên quan → agent tự gọi
      `search-knowledge-base-test-kb`, trả lời đúng chunk; agent không có KB nào vẫn chat bình
      thường (không lỗi, không tool rỗng); voice module (đã đổi call site sang `ChatContext`) vẫn
      chạy đúng sau refactor.
- [x] `apps/api`: FastAPI + SQLAlchemy (Postgres/pgvector) + Pydantic
  - Module `conversation` (+ sub-resource `message`, `tool_call`), health check
  - Module `agent` — CRUD Agent (slug/system_prompt/model_id/is_orchestrator) + `AgentDelegation` (many-to-many)
  - Module `chat` — chạy 1 turn qua LangGraph (`langchain.agents.create_agent`); orchestrator có tool gọi sub-agent, **đa tầng** (sub-agent tự nó gọi tiếp sub-agent khác, `MAX_DELEGATION_DEPTH=5` phòng thủ) + chống cycle khi tạo `AgentDelegation` (`AgentService._creates_cycle`, BFS)
  - Module `model` — resource Model (provider ollama/gemini/openai/**sglang** + model_id + base_url), factory `core/providers.py` build đúng LangChain class theo provider (sglang dùng `ChatOpenAI`/`OpenAIEmbeddings` trỏ `base_url`, tương thích OpenAI API)
  - Module `settings` — `AppSettings` singleton (`default_model_id`, `default_agent_id`), sửa qua `PATCH /settings`, dùng làm fallback khi conversation không gán agent
  - Module `tool` — CRUD Tool + `AgentTool` (gán tool theo từng agent, `POST/GET/DELETE /agents/{id}/tools`)
  - Module `knowledge_base` — CRUD KnowledgeBase + `KnowledgeChunk` (pgvector, **dimension linh hoạt** — không fix 768 nữa) + `AgentKnowledgeBase`; **`KnowledgeFolder`** (nested kiểu Google Drive) + **`KnowledgeFile`** (`status`: pending/chunking/done/error) mới; `POST /knowledge-bases/{id}/chunks` (auto-embed, không gắn file — tương thích ngược) và `POST .../files/{id}/chunks` (gắn file, cập nhật status); `POST /knowledge-bases/{id}/search` (cosine distance). Migration `a1c2e3f4b5d6` **đã verify chạy thật** (2026-08-24, `uv run alembic current` xác nhận head hiện tại `f1a2b3c4d5e6` nằm sau nó trong chain)
  - **Verify thật (không mock)**: tạo Model (ollama qwen3.5:4b + nomic-embed-text) → tạo Agent tham chiếu model_id → set `AppSettings.default_model_id` → chat qua conversation không gán agent (fallback settings) trả đúng response → tạo KB + 2 chunk thật (embedding qua Ollama) → search phân biệt đúng theo semantic (chunk liên quan score 0.22, chunk không liên quan score 0.60) → gán Tool + KB vào 1 agent cụ thể qua API
  - **Đã verify trước đó**: orchestrator (`boss-agent`) + sub-agent (`echo-agent`) qua `AgentDelegation`, orchestrator gọi đúng sub-agent qua LangGraph tool (không ổn định 100% — model nhỏ đôi khi không gọi tool dù system prompt yêu cầu, ghi nhận là giới hạn thật)
- [x] `apps/web` — Next.js 15 + React 19 + Tailwind v4, theo convention [`docs/conventions/02-frontend-nextjs.md`](../conventions/02-frontend-nextjs.md). Feature `conversation`/`agent`/`model`/`tool`/`knowledge-base`/`settings` (UI CRUD phẳng: list/form), layering `types→services→hooks→components`, gọi thẳng `apps/api`. `pnpm build`/`typecheck`/`dev` đã verify chạy được (chưa nối `apps/api` thật lúc dev — cần `uv run fastapi dev` song song)
- [x] **Harness-hoá convention** (2026-08-30) — user phát hiện code bắt đầu chắp vá dù convention đã
      viết đầy đủ; audit thực tế (2 agent song song `apps/web`/`apps/api` + đọc trực tiếp toàn bộ
      pipeline chat/AG-UI) xác nhận root cause: **enforcement viết ra nhưng không chạy thật**
      (`.pre-commit-config.yaml` có sẵn nhưng `.git/hooks/pre-commit` chưa từng cài — bằng chứng cụ
      thể: bug gãy `pnpm typecheck` ở `ConversationRuntime.tsx` — `toThreadMessage` gọi sai tên hàm
      thật `toThreadMessageLike` — lọt qua không ai biết, đã fix). Đã làm:
      - Viết `.git/hooks/pre-commit` (bash tay, thay thế CLI `pre-commit` — máy dev không cài được
        qua `uv tool`/`pip` do lỗi SSL cert với PyPI) chạy đúng check trong
        `.pre-commit-config.yaml`. **Còn 1 bước tay user cần làm**: `chmod +x .git/hooks/pre-commit`
        (macOS sandbox chặn `chmod` từ phiên Claude Code, không tự làm được).
      - Quyết định thiết kế harness (ghi ở `AGENTS.md` mục Harness): check tự động (script/CI) chỉ
        cho invariant cấu trúc/topology ổn định (như `check_module_boundaries.py`) — KHÔNG viết
        script riêng cho từng rule pattern cụ thể (không scale). Rule pattern/judgment (naming, doc
        completeness, modularity...) → skill mới **`module-review`** (`/module-review <module>`,
        subagent `module-reviewer`) audit toàn diện 1 feature/module FE→BE theo rubric mới
        [`docs/conventions/10-module-completeness.md`](../conventions/10-module-completeness.md) —
        khác `code-reviewer` (chỉ review diff). Smoke-test trên module `conversation` đã bắt được
        3 finding thật (doc-drift ADR-0019, barrel thiếu, bug pagination message — xem dưới).
      - Convention doc sửa lệch thực tế: `05-naming.md` (hook file `camelCase.ts` — sửa khớp code
        thật thay vì rename 52 file), `01-backend-fastapi.md` (bảng ngoại lệ module không đủ 4 file
        chuẩn — `chat`/`ollama`/`voice`/`connector`; mục mới "Modular/swappable component" formalize
        pattern Protocol+registry), `02-frontend-nextjs.md` (barrel `index.ts` riêng mỗi tầng; mục
        "services/ là tầng duy nhất biết chi tiết integration"), `04-error-handling.md` (sửa "Wire
        format JSON" khớp shape flat thật đang chạy, không phải shape lồng aspirational cũ).
      - Migrate 43 điểm `raise HTTPException` → `UltronError`/subclass ở 9 module `apps/api` (thêm
        class `ConflictError` mới, 409, dùng chung mọi case duplicate/conflict thay vì 1 class/domain).
      - Xoá route `/chat` + `/chat/approve` cũ (`apps/api/app/modules/chat/router.py`) — FE đã
        migrate hoàn toàn sang `/chat/agui` (ADR-0019), cập nhật lại ADR-0019 +
        [`docs/features/unified-agent-stream-runtime.md`](../features/unified-agent-stream-runtime.md)
        (status → done) cho khớp thực tế (trước đó doc ghi "chưa xoá" trong khi code đã xoá).
      - `apps/web`: fix 5 `page.tsx` vi phạm rule "chỉ render View" (`models/[id]`, `tools/[id]`,
        `orchestrators`, `agents/new`, `knowledge-bases/new`), thêm barrel `index.ts` thiếu ở nhiều
        feature (`agent`/`credential`/`knowledge-base`/`model`/`ollama`/`settings`/`tool`/`voice`/
        `conversation`), tách `KnowledgeUpload` (component JSX lẫn trong file "hook") thành
        `hooks/useKnowledgeUpload.ts` (state/mutation thuần) + `components/KnowledgeUpload.tsx`
        (presentational), bỏ `useMutation` viết tay trùng logic ở `OrchestratorCanvas.tsx` (dùng lại
        `useAddDelegation`/`useRemoveDelegation`), gom helper `src/lib/format.ts`.
      - **Bug pagination phát hiện qua smoke-test, đã fix cùng ngày**: `useMessages` không truyền
        `page_size` → hội thoại > 50 tin nhắn mất tin nhắn gần nhất khi tải lại trang (LLM context
        vẫn đúng vì `ChatService.send` dùng `list_all()` không giới hạn — chỉ UI hiển thị thiếu).
        Sửa: `useMessages.ts` fetch `page_size=200` (trần tối đa backend cho phép), tự phát hiện
        `total_pages > 1` rồi refetch đúng trang CUỐI (tin nhắn gần nhất) thay vì luôn trang 1. Vẫn
        còn giới hạn lý thuyết ở hội thoại > 200×200 tin nhắn (chưa cần infinite-scroll/cursor cho
        quy mô 1 user hiện tại) — ghi rõ trong comment code, không phải fix triệt để bằng thiết kế
        phân trang mới.
      - **Nợ khác, chưa fix** (không thuộc phạm vi đợt này): thiếu integration test
        `conversation`/`message`/`tool_call` (đã biết từ trước, xem mục dưới "testcontainers...
        chưa làm"). `tool_call` router hiện không caller nào gọi (đúng scope hiện tại — persist
        trace vẫn là nợ đã ghi ở ADR-0019 Consequences).
      - Verify: `apps/api` — ruff/format/`check_module_boundaries.py`/pytest (88 passed) đều xanh;
        `apps/web` — lint/typecheck/build đều xanh; `code-reviewer` review độc lập toàn diff (2
        finding 🟡 tìm thấy, đã fix: presentational component vẫn lẫn trong file hook, 1 deep-import
        xuyên feature bỏ qua barrel).
- [x] **`AgentRuntime` interface (ADR-0020) + fail-closed nested approval (addendum ADR-0014)**
      (2026-08-30) — user muốn Agent runtime tách rõ khỏi LangGraph "kiểu microservice, chỉ cần
      interface không đổi giữa 2 service" + muốn Orchestrator custom được qua ReactFlow; 3
      `business-analyst` chạy song song research + viết spec/mockup cho `agent-runtime-abstraction`/
      `orchestrator-v2`/`agent-creation-wizard` (cả 3 bị rate-limit đúng lúc cập nhật roadmap cuối
      cùng — tự hoàn tất tay). User uỷ quyền tự quyết câu hỏi mở + bắt đầu code luôn.
      - **`app/core/agent_runtime.py` mới** — `AgentRuntime` (`Protocol`, 2 method `run_streaming`/
        `run_sync`, không lộ `CompiledStateGraph`/`Command`/`astream_events` ra chữ ký public) +
        `LangGraphAgentRuntime` (implementation DUY NHẤT — không dựng registry vì chưa có
        implementation thứ 2 thật, đúng ngưỡng convention). Gom `_extract_text`/
        `_first_action_request`/logic `astream_events`+`aget_state` (trước ở `chat/service.py`)
        vào đây.
      - `chat/service.py::ChatService` đổi `send()`/`approve()` gọi qua `self.runtime` (mặc định
        `LangGraphAgentRuntime()` nếu không truyền — không cần DI phức tạp cho 1 implementation),
        thêm helper `_stream_and_persist` gom logic "chạy rồi lưu assistant message" dùng chung cho
        2 method (trước lặp lại y hệt).
      - `voice/service.py::handle_tool_call` đổi từ import `run_sub_agent` trực tiếp sang gọi
        `AgentRuntime.run_sync` (instance module-level `_agent_runtime`) — external caller giờ
        không biết `chat/graph.py` nội bộ làm gì; `chat/graph.py` tự nó vẫn gọi `run_sub_agent` nội
        bộ khi build tool "delegate" (không đổi, không phải external caller).
      - **Fail-closed nested approval** (Phase A của `orchestrator-v2.md`, addendum ADR-0014):
        `run_sub_agent` (`chat/graph.py`) loại tool trong `TOOLS_REQUIRING_APPROVAL`/`kind=mcp` khỏi
        tool list của sub-agent TRƯỚC khi build — trước đây sub-agent gọi được tool rủi ro cao (vd
        `run-command`) mà không ai duyệt (lỗ hổng an toàn thật, không chỉ thiếu tính năng). Test mới
        `tests/unit/chat/test_run_sub_agent_fail_closed.py`.
      - Test cũ (`tests/unit/chat/test_chat_service.py`) đổi chỗ monkeypatch từ
        `chat_service_module.build_agent_executor` sang `agent_runtime_module.build_agent_executor`
        (theo đúng nơi gọi mới) — không đổi assertion hành vi.
      - Verify: `ruff check`/`ruff format --check`/`check_module_boundaries.py` xanh, `pytest -q`
        89 passed (thêm 1 test mới), app boot được (`from app.main import app`, không circular
        import giữa `core/agent_runtime.py` ↔ `chat/graph.py` ↔ `chat/service.py`).
      - **Orchestrator v2 (`docs/features/orchestrator-v2.md`) mới xong Phase A/chưa code Phase
        B/C/D** — xem "Đang làm" bên dưới, không phải nợ ẩn.
- [x] **Agent creation wizard + Knowledge Base binding UI + nâng cấp `AgentDetailView`** (2026-08-30,
      [`docs/features/agent-creation-wizard.md`](../features/agent-creation-wizard.md)) —
      `solution-architect` lên plan 10 step, `backend-engineer`/`frontend-engineer` code theo đúng
      thứ tự phụ thuộc (backend trước, FE sau).
      - Backend: `DELETE /agents/{agent_id}/knowledge-bases/{kb_id}` (unassign KB) — đối xứng 1:1
        `ToolService.unassign_from_agent`/`agent_tool_router.py` đã có, raise `ResourceNotFoundError`
        (không phải `HTTPException`) khi chưa từng gán.
      - Frontend: `AgentKnowledgeBaseManager` (component mới, mirror `AgentToolManager` — hook
        `useAgentKnowledgeBases`/`useAssignKnowledgeBase`/`useUnassignKnowledgeBase` mới), dùng lại
        ở cả `AgentCreationWizard` (mới — 4 bước: Định danh+Model → Tool → Knowledge Base →
        Sub-agent, bước 4 chỉ hiện nếu `is_orchestrator`, mỗi bước có nút Bỏ qua, agent persist thật
        ngay bước 1 không cần khái niệm "nháp") lẫn `AgentDetailView` (nâng cấp layout rail+panel,
        thêm panel Knowledge Base mới). Không viết lại `AgentForm`/`AgentToolManager`/
        `DelegationManager` — wizard compose lại các component đã có.
      - `code-reviewer` tìm 2 finding 🟡, đã fix cùng ngày: (1) `AgentDetailView` ẩn hẳn Card
        Sub-agent khi `!is_orchestrator` thay vì giữ hint "bật Là orchestrator" mà `DelegationManager`
        tự có sẵn — regression so với hành vi cũ; (2) thiếu test cho `unassign_from_agent` — thêm
        `tests/unit/knowledge_base/test_agent_kb_unassign.py`.
      - Verify: `apps/api` — ruff/format/`check_module_boundaries.py`/pytest (91 passed, +2 test
        mới) xanh; `apps/web` — lint/typecheck/build xanh. **Chưa live-verify qua browser thật**
        (sandbox không có Postgres/Ollama chạy) — cần user tự verify tay khi có môi trường chạy
        được (tạo agent qua wizard, gán KB, chat xác nhận RAG dùng đúng).
      - Nợ còn lại: `apps/web` chưa có Vitest — test tự động cho `AgentKnowledgeBaseManager`/
        `AgentCreationWizard` chưa viết (cần bootstrap tooling trước, xem plan `solution-architect`
        mục Risk).
- [x] **Orchestrator v2 Phase B — xong cả backend + canvas** (2026-08-30,
      [`docs/features/orchestrator-v2.md`](../features/orchestrator-v2.md)) —
      `solution-architect` lên plan 25 step (backend trước, FE canvas sau); `backend-engineer` +
      `frontend-engineer` code đủ cả 25 step.
      - **Canvas (FE, step 16-24)**: `OrchestratorCanvas.tsx` — edge giờ mang `delegationId`/
        `taskDescription` thật (không tự synthesize id), click 1 edge → panel "Cạnh đang chọn" sửa
        `task_description` qua `useUpdateDelegation` mới. Badge readiness trên mỗi node
        (`bg-emerald-500`/`bg-orange-500` + issue đầu tiên) qua `useReadiness` mới
        (`staleTime: 0`, tự refetch khi mount); `useAddDelegation`/`useRemoveDelegation` thêm
        invalidate `readinessQueryKey`. Panel node chọn hiện đủ list issues khi `!ready`.
- [x] **`OrchestratorCanvas` nhúng vào tab Sub-agent của `AgentDetailView`** (2026-08-31) — feedback
      user (2 lần, xác nhận lại): khi `agent.is_orchestrator`, tab Sub-agent hiện canvas trực quan
      thay vì list add/remove phẳng của `DelegationManager` (agent không phải orchestrator vẫn dùng
      `DelegationManager` — tự hiện hint "bật Là orchestrator"). Cần thêm prop
      `heightClassName` cho `OrchestratorCanvas` (mặc định `h-[calc(100vh-3.5rem)]` cho trang
      `/orchestrators/[id]` full màn hình, `h-full` khi nhúng trong khối `h-[560px]` cố định ở tab)
      — không đổi hành vi trang orchestrator gốc. Verify: `apps/web` lint/typecheck/build xanh.
      - **Edge contract**: cột `task_description` mới trên `AgentDelegation` (mô tả nhiệm vụ RIÊNG
        theo cạnh, migration `b7c9e1a4f2d8`), `PATCH`/`GET /agents/{id}/delegations` (route mới,
        giữ nguyên `GET /agents/{id}/sub-agents` cũ không đổi). `ChatService._resolve_sub_agent_spec`
        đổi nguồn dữ liệu từ `list_sub_agents` sang `list_delegation_details` — ưu tiên
        `task_description` của cạnh, fallback `agent.description` chung, fallback cuối default cứng
        ở `graph.py` (không đổi `graph.py`).
      - **Readiness check**: file mới `app/modules/agent/readiness.py::AgentReadinessService` —
        KHÔNG đặt tên `service.py` có chủ đích (compose 5 service khác module, giống pattern
        `ChatService`, tự giải thích trong comment đầu file) — BFS đệ quy dedupe bằng `visited: set`
        (không mượn `MAX_DELEGATION_DEPTH` từ `chat/graph.py`, tránh phụ thuộc ngược `agent`→`chat`),
        check model/credential (`credential/service.py::find_by_provider` mới, không raise)/tool
        `kind=http` config (`tool/service.py::config_issue_for_kind` mới, tách từ validate cũ,
        không raise)/KB rỗng. `GET /agents/{id}/readiness` endpoint mới.
      - **Migration CHƯA chạy** — sandbox code không kết nối được Postgres/Docker.
        **User cần tự chạy** `cd apps/api && uv run alembic upgrade head` trước khi dùng field
        `task_description`/endpoint mới.
      - Test mới: `tests/unit/agent/test_delegation_task_description.py` (3 case, fallback chain),
        `tests/unit/agent/test_readiness_check.py` (9 case, BFS/dedupe/từng loại issue) — pure logic
        qua Fake service, KHÔNG có integration test chạm DB/HTTP thật (nợ đã biết, xem task riêng
        "Bootstrap apps/api integration tests").
      - `code-reviewer`: 0 blocker, 1 warning (thiếu integration test, đã ghi nhận là nợ có sẵn) +
        điểm cần lưu ý riêng ở phần UI polish bên dưới.
      - Verify: ruff/format/`check_module_boundaries.py`/pytest (103 passed) xanh.
- [x] **UI polish theo feedback trực tiếp của user** (2026-08-30) — `AgentDetailView` đổi từ 4 Card
      xếp dọc (scroll dài) sang `Tabs` (Thông tin/Knowledge Base/Tool/Sub-agent), giữ nguyên aside
      readiness rail. Thêm `src/components/shared/MultiSelectAssignDialog.tsx` (generic, dùng
      `Dialog`+`Checkbox` có sẵn) thay `<Select>` chọn-1 cũ trong `AgentToolManager`/
      `AgentKnowledgeBaseManager` — giờ tích chọn nhiều Tool/KB rồi gán 1 lần
      (`Promise.all` các `mutateAsync`). `code-reviewer` tìm 1 bug thật: `onConfirm` không có
      try/catch → unhandled promise rejection + dialog có thể không đóng đúng khi 1 trong nhiều
      request fail — đã fix (giữ dialog mở khi lỗi, không throw ra ngoài).
      Verify: `apps/web` lint/typecheck/build xanh.
- [x] **UI polish tiếp theo, `OrchestratorCanvas`/`AgentDetailView`** (2026-08-31, feedback trực
      tiếp của user qua nhiều bước) —
      - Panel chi tiết node/edge (`OrchestratorCanvas` aside) giờ chỉ hiện khi có node/edge được
        chọn (trước đó luôn hiện, chiếm diện tích), có nút đóng (X).
      - Thêm nút "Thêm sub-agent" cố định (`Panel` của `@xyflow/react`, góc trên-trái canvas) — bù
        lại việc panel chi tiết (chứa dropdown add-sub-agent scope theo node đang chọn) giờ ẩn mặc
        định.
      - `AgentDetailView`: bỏ cột trái "readiness" (lặp lại ở mọi tab) — gộp avatar/tên/slug/
        readiness lên 1 header đầu trang, thêm nút back + chuyển nút xoá agent lên header. Route
        `app/agents/[id]/page.tsx` bỏ `PageShell` (View tự dựng layout, giống
        `KnowledgeBaseDetailShell`).
      - Readiness row: đổi từ chấm màu + số trần (ít thông tin, feedback user) sang icon
        (`Cpu`/`Wrench`/`BookOpen`/`Users`) + text rõ nghĩa (vd "6 tool", "Chưa gán model").
      - `code-reviewer` tìm 2 finding 🟡, đã fix: (1) early-return loading/error mất padding
        (`PageShell` bỏ nhưng không bọc lại) — thêm hằng `PAGE_CONTAINER_CLASS` dùng chung; (2)
        readiness row `hidden ... xl:flex` biến mất hoàn toàn dưới 1280px (laptop/tablet) — tách
        thành hàng riêng `flex-wrap` luôn hiện thay vì ẩn theo breakpoint.
      - Verify: `apps/web` lint/typecheck/build xanh (build lại từ `.next` sạch 2 lần do cache cũ
        gây lỗi `PageNotFoundError` không liên quan code — dọn `.next` là đủ).
- [x] **Redesign flow "hội thoại mới"** (2026-08-31, feedback trực tiếp user: "không ai điền tên
      hội thoại tay cả") — bỏ hẳn dialog cũ (điền tên + chọn agent), thay bằng route mới
      `/conversations/new`:
      - `NewConversationView.tsx` — chọn agent trước (khung chat disable tới khi chọn, kiểu
        ChatGPT/Claude "new chat"), gửi tin nhắn đầu tiên = tạo `Conversation` (title tự set từ
        chính tin nhắn đó qua `deriveTitle`, KHÔNG có ô nhập tên riêng) rồi điều hướng sang
        `/conversations/{id}`.
      - `PendingFirstMessageSender.tsx` (renderless, trong `AssistantRuntimeProvider` ở
        `ConversationRuntime.tsx`) — lưu tin nhắn nháp qua `sessionStorage`
        (`services/pending-first-message.ts`) trước khi điều hướng (chưa có conversation id để
        gửi thẳng lúc gõ), đọc lại đúng 1 lần lúc mount trang conversation, tự điền vào composer
        qua `unstable_useComposerInput()` (API chính thức của assistant-ui cho composer tự chế,
        còn prefix `unstable_`, cần re-verify khi bump version) rồi `send()` khi `canSend` — user
        không gõ lại lần 2.
      - `NewConversationButton.tsx` đơn giản hoá — chỉ `router.push('/conversations/new')`, bỏ
        hẳn Dialog + state tên/agent cũ.
      - `code-reviewer` tìm 4 finding, đã fix 3: (1) 🟡 race condition thật — StrictMode double-
        invoke effect gửi trùng 2 message cho 1 tin nhắn nháp (`armed` đổi từ `useState` sang
        `useRef`, mutate đồng bộ chặn invocation thứ 2); (2) 🟡 composer tự chế dùng
        `<textarea>`/`<button>` thường thay vì `Textarea`/`Button` shadcn có sẵn — đổi lại đúng
        convention "mọi primitive UI qua shadcn"; (3) 🟡 `deriveTitle` cắt title theo UTF-16 code
        unit, có thể vỡ ký tự nếu ký tự thứ 80 là emoji — đổi sang cắt theo `Array.from` (code
        point); (4) thông tin — `@assistant-ui/react` đã pin version chính xác sẵn trong
        `package.json`, không cần sửa thêm.
      - Verify: `apps/web` lint/typecheck/build xanh; build output xác nhận `/conversations/new`
        là route tĩnh riêng, không bị Next.js App Router nuốt vào `[id]`.

## Đang làm / tiếp theo

- [ ] **P0 — Orchestrator v2: setup/run/debug đúng nghĩa** — **Cập nhật 2026-08-31**: 6 câu hỏi mở
      dưới đây đã được trả lời từ 2026-08-30 (xem "Câu hỏi mở — đã trả lời" trong
      `docs/features/orchestrator-v2.md`) — Phase A (nested approval fail-closed), Phase B (edge
      contract + readiness check) và Phase C (saved layout + trace inspector "lần chạy gần nhất")
      đều đã xong. Chỉ còn **Phase D (run simulator)** — persist thật qua `ChatService`/
      `AgentRuntime`, chưa code. Giữ nguyên phần lịch sử bên dưới để tham khảo ngữ cảnh quyết định.
      Trạng thái gốc lúc mới ghi bullet này:
      `Agent.is_orchestrator=true` + `AgentDelegation` edge đơn giản + canvas xem/thêm/gỡ cạnh.
      Cần thiết kế lại như 1 graph/app có thể chạy ổn định: edge có mô tả nhiệm vụ/contract rõ ràng
      (khi nào gọi sub-agent, input/output mong đợi), readiness check trước khi run (agent thiếu
      model/credential/tool/KB config thì báo ngay), saved layout, run simulator, trace inspector
      theo từng node/edge, persist `tool_calls`/delegation trace, và chiến lược nested approval khi
      sub-agent gọi tool rủi ro. Đây là epic riêng, không nên nhét lẫn vào chat UI.
      **2026-08-30**: user yêu cầu thêm — graph phải visualize + **user tự custom được** qua
      ReactFlow (không chỉ xem/thêm/gỡ cạnh). `business-analyst` đã viết xong spec draft
      ([`docs/features/orchestrator-v2.md`](../features/orchestrator-v2.md) +
      [research](../research/orchestrator-v2.md) so sánh n8n/Dify/LangGraph Studio +
      [mockup](../mockups/orchestrator-v2.html) mở rộng `ultron-orchestrator-canvas.html` cũ) —
      xác nhận thêm qua đọc code thật: `run_sub_agent()` (sub-agent chạy lồng) **cố ý không gắn
      checkpointer/approval-gate** (comment sẵn trong `chat/graph.py` giải thích "nested interrupt
      phức tạp"), nghĩa là sub-agent gọi tool cần duyệt (vd `run-command`) hiện **âm thầm không có
      gate nào chặn** — không chỉ thiếu tính năng, là khoảng trống an toàn thật. **Cần user trả lời
      trước khi qua `solution-architect`** (đầy đủ ở "Câu hỏi mở" trong spec):
      1. Run simulator trong canvas có persist `Conversation`/`Message` thật (tái dùng `ChatService`)
         hay tách biệt hoàn toàn không lưu gì?
      2. Trace inspector chỉ giữ "lần chạy gần nhất"/node/edge hay full history nhiều lần chạy?
      3. Nested approval chọn hướng nào: chặn hẳn sub-agent dùng tool cần duyệt / pause cả turn cha /
         hướng khác?
      4. Làm 1 lần cả 6 mục (contract/readiness/layout/simulator/trace/nested-approval) hay chia
         phase, thứ tự ưu tiên nào trước?
      5. Edge contract cần structured input/output schema (giống `ai_params` tool `kind=http`) hay
         mô tả tự do bằng văn bản?
      6. Readiness check chạy on-demand (nút bấm) hay tự động mỗi khi mở canvas/sửa graph?
- [x] ~~P0 — Chuẩn hoá agent runtime + stream contract + chat UI~~ — phần wire contract
      FE↔BE **đã xong** (AG-UI, xem [`docs/features/unified-agent-stream-runtime.md`](../features/unified-agent-stream-runtime.md)
      Status: done, ADR-0019, mục "Harness-hoá convention" ở trên). Phần CÒN LẠI của bullet này —
      backend internal interface tách LangGraph khỏi `ChatService` — tách thành mục riêng ngay dưới
      (`agent-runtime-abstraction`), không còn là 1 bullet gộp chung nữa.
- [x] ~~P0 — `AgentRuntime` interface~~ — **Đã xong (2026-08-30)**, xem mục "Đã xong" ở trên +
      [ADR-0020](../adr/0020-agent-runtime-interface.md). Đã gộp bullet "Hợp nhất Voice Agent vào
      agent runtime thường" cũ vào đây cho phần backend interface; phần unify voice TOP-LEVEL turn
      (Gemini Live) vẫn CHƯA làm, xem bullet "Voice là input modality" bên dưới.
- [ ] **P0 — Provider-neutral realtime voice** — hiện voice đã có provider adapter nhưng thực tế vẫn
      neo sâu vào Gemini Live protocol; cần mở đường cho OpenAI Realtime/GPT voice và self-host
      speech stack (STT/TTS + LLM) mà không sửa UI/agent capability. Nên tách rõ 3 lớp:
      transport/audio codec, realtime model provider, và agent runtime/tool execution.
- [x] ~~P1 — Agent creation wizard + Knowledge Base binding UI~~ — **Đã xong (2026-08-30)**, xem
      mục "Đã xong" bên dưới + [`docs/features/agent-creation-wizard.md`](../features/agent-creation-wizard.md)
      (Status: done). Chưa live-verify qua browser thật (môi trường code không có Postgres/Ollama).
- [ ] **P1 — Conversation UX v2** — ngoài visual refresh đã có, cần flow tạo hội thoại mới tốt hơn:
      chọn agent trước khi vào chat, empty state có starter prompts, pin/archive/search/filter, rename
      inline, grouping theo thời gian/agent, keyboard shortcuts, trạng thái stream/approval rõ ràng.
      Việc này nên đi sau stream contract để UI không tiếp tục mọc state tạm.
- [ ] **Áp dụng phần còn lại của convention 03-08 vào code thật** — `testcontainers[postgres]` +
      `tests/conftest.py` cho integration test, migrate `app/core/errors.py` sang `UltronError`
      (xem [ADR-0008](../adr/0008-testing-logging-foundations.md) +
      [04-error-handling.md](../conventions/04-error-handling.md)); logging + unit test đầu tiên
      đã xong (xem mục "Đã xong"). **`UltronError`/`ValidationFailedError` đã code hoá (2026-08-24,
      cùng feature Tool execution)** nhưng CHỈ áp dụng cho `tool/service.py` mới, giữ nguyên wire
      shape cũ (top-level `message`) — migrate toàn bộ service khác sang raise `UltronError` +
      đổi wire shape sang `{error:{code,message,details}}` (đúng như convention doc mô tả) +
      thêm `parseApiError` phía `apps/web` (đọc `04-error-handling.md` mục "apps/web đọc lỗi") —
      **vẫn chưa làm**, là 1 thay đổi cross-cutting ảnh hưởng mọi service + mọi component đọc lỗi,
      nên tách riêng, không làm ngầm trong 1 feature nhỏ. Cài Vitest cho `apps/web` (chưa cài).
- [ ] **OpenAI/SGLang provider chưa live-test** — code đã viết (`core/providers.py`), nhưng môi trường hiện tại không có `OPENAI_API_KEY` hay SGLang server chạy để test thật. **Gemini đã live-test** (2026-08-24, credential thêm qua UI): chat text (`gemini-3.7-flash`) và Voice (xem "Đã xong" ADR-0009) đều chạy đúng qua provider adapter.
- [ ] **Migrate `create_react_agent` → `langchain.agents.create_agent` chưa live-test** — đổi do upstream deprecate (LangGraph ≥ 1.2), build graph + import đã verify OK, nhưng môi trường hiện tại không có Ollama chạy để verify thật 1 turn chat + orchestrator gọi sub-agent như lần verify trước (`boss-agent`/`echo-agent`). Cần chạy lại kịch bản đó.
- [ ] Ghi lại tool-call của orchestrator (gọi sub-agent) vào bảng `tool_calls` — hiện `create_react_agent` tự quản lý tool call nội bộ, chưa persist ra bảng đã thiết kế
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
      [ADR-0009](../adr/0009-live-voice-gemini-live-websocket-relay.md). **Bug thật phát hiện +
      fix (2026-08-24)**: `VoiceService.run` unpack `chat_service.resolve_context()` chỉ 3 giá trị
      (`system_prompt, _model, sub_agents`) trong khi hàm này trả 4-tuple (thêm `tool_specs` từ
      lúc ADR-0013) — mọi voice session đều bị reject ngay từ đầu
      (`ValueError: too many values to unpack`), hiện ra phía user là "Mất kết nối voice session."
      không rõ lý do (exception bị nuốt, không log `exc_info`). Sửa unpack đủ 4 giá trị + thêm
      `exc_info` vào log reject để lỗi tương tự sau này không còn vô hình. Verify qua
      `starlette.testclient.TestClient` (không cần mic thật) — xác nhận `voice.session_started`
      + nhận đúng `{"type":"state","value":"listening"}`; thêm regression test
      (`tests/unit/voice/test_voice_service.py`) xác nhận fail đúng lỗi này trước fix.
      **Bug thứ 2 phát hiện + fix cùng ngày (feedback user)**: ngắt lời AI giữa câu (barge-in —
      Gemini bắn `interrupted` + `turnComplete` cùng lúc) rồi nói tiếp bị lưu thành 2 `Message`
      user tách rời, trông như model "quên" — thực ra model (cùng 1 session Gemini Live) không hề
      mất context, chỉ là code cũ chốt (flush) transcript mù theo mọi `turnComplete` kể cả khi
      chưa có phản hồi thật của model. Sửa: chỉ chốt + báo `turn_complete` cho client khi
      `transcript_buffer["model"]` thật sự có nội dung; nói tiếp mà chưa có phản hồi thì gộp vào
      cùng buffer. Thêm flush cuối lúc session kết thúc (tránh mất trắng đoạn chưa chốt). Test
      xác nhận: barge-in giữa câu rồi nói tiếp → gộp đúng thành 1 `Message` user (không phải 2).
      **Gap thứ 3 fix luôn cùng ngày**: bắt đầu voice session MỚI (sau khi bấm dừng) không nạp
      lại lịch sử hội thoại cũ — mất context thật giữa các lần bấm "Bắt đầu voice" riêng biệt
      (khác 2 bug trên, là trong CÙNG 1 session). Sửa: `GeminiLiveClient.send_history()` mới —
      gửi `clientContent.turns` với `turnComplete: False` (chỉ thêm context, không kích trả lời)
      ngay sau `connect()`, nạp từ `message_service.list_all()` (không cap, giống cách text chat
      nạp full history — `chat/service.py::send`). **Live-verify thật qua `TestClient`**: hỏi
      voice "Kết quả phép cộng vừa nãy là bao nhiêu?" trên 1 conversation đã có sẵn text-chat lịch
      sử ("...là 42") → model trả lời đúng "**42**" — xác nhận lịch sử cũ đã nạp đúng vào session
      Gemini Live mới.
- [x] `apps/web` — KB folder tree UI + redesign nhiều trang (`Files`/`Search`/`Settings`), có endpoint stats/chunk list/file search ở `apps/api`; xem [`docs/features/knowledge-base-ui-redesign.md`](../features/knowledge-base-ui-redesign.md)
- [ ] `apps/mobile` — Expo (React Native), bắt đầu tại [`docs/features/mobile-ambient-companion.md`](../features/mobile-ambient-companion.md)
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
