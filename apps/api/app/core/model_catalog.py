"""Static model catalog theo provider (ADR-0010, mở rộng theo yêu cầu 2026-08-23).

KHÔNG phải bảng DB catalog (học bài học `cap`'s ADR-0019 park DB-catalog vì thừa cho
single-tenant) — 1 list module-level, sửa trực tiếp trong code khi cần thêm/sửa model. Riêng với
provider hosted (gemini/openai), nội dung list này được seed 1 lần thành `Model` row thật qua
Alembic data migration (2026-08-23, xem `alembic/versions/`) — để AgentForm/Settings chọn được
ngay, không cần user tự tạo Model cho từng model hosted (chỉ tự tạo cho self-host: ollama/sglang,
vì cần khai `base_url`). Thêm model mới vào provider hosted → thêm entry ở đây + thêm 1 migration
mới insert đúng entry đó (không seed lại runtime).

**Quyết định rõ theo provider** (khác Ollama):
- `gemini`/`openai` (hosted): catalog liệt kê tay các model đã biết từ trước tới giờ — KHÔNG tra
  live API (khác Ollama), vì catalog này phải browse được ngay cả khi chưa có credential hợp lệ
  (chọn model trước, cấu hình key sau). Danh sách này **có thể lag so với model provider thật sự
  đang có** (provider ra model mới nhanh hơn code repo cập nhật) — không sao, `Model.model_id` vẫn
  là free-text (docs/conventions/01-backend-fastapi.md), model không có trong catalog vẫn tạo/dùng
  được, chỉ không có badge capability.
- `ollama`/`sglang` (self-host): KHÔNG hardcode ở đây — `ollama` có catalog pull riêng
  (`app/modules/ollama/catalog.py`, ADR-0011) + `list_installed()` load thật từ máy; `sglang` serve
  model người dùng tự chọn khi khởi động, không có danh sách cố định nào đúng.

Chỉ điền field capability có nguồn thật (live-test, hoặc model card công khai ổn định của
provider) — field không chắc để `None` + `# TODO`, KHÔNG bịa số liệu context window/pricing.
"""

from pydantic import BaseModel


class ModelCapabilities(BaseModel):
    tools: bool | None = None
    vision: bool | None = None
    json_mode: bool | None = None
    thinking: bool | None = None
    context_window: int | None = None


# Capability set chung cho toàn bộ Gemini 3.x series (model card công khai từng model xác nhận
# giống nhau: function calling, vision, structured output, thinking, 1,048,576 token input) —
# xác nhận qua ai.google.dev/gemini-api/docs/models/<model-id> (2026-08-23).
_GEMINI_3X_CAPS = ModelCapabilities(
    tools=True, vision=True, json_mode=True, thinking=True, context_window=1_048_576
)


class ModelCatalogEntry(BaseModel):
    provider: str
    model_id: str
    label: str
    capabilities: ModelCapabilities
    is_embedding: bool = False


CATALOG: list[ModelCatalogEntry] = [
    # ── Gemini ──────────────────────────────────────────────────────────────────────────────
    # 3.x series — mới nhất (2026), xem _GEMINI_3X_CAPS.
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-3.7-flash",
        label="Gemini 3.7 Flash",
        capabilities=_GEMINI_3X_CAPS,
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-3.6-flash",
        label="Gemini 3.6 Flash",
        capabilities=_GEMINI_3X_CAPS,
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-3.5-flash",
        label="Gemini 3.5 Flash",
        capabilities=_GEMINI_3X_CAPS,
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-3.5-flash-lite",
        label="Gemini 3.5 Flash-Lite",
        capabilities=_GEMINI_3X_CAPS,
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-3.1-flash-lite",
        label="Gemini 3.1 Flash-Lite",
        capabilities=_GEMINI_3X_CAPS,
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-3.1-pro-preview",
        label="Gemini 3.1 Pro (Preview)",
        capabilities=_GEMINI_3X_CAPS,
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-3-flash-preview",
        label="Gemini 3 Flash (Preview)",
        capabilities=_GEMINI_3X_CAPS,
    ),
    # Embedding — thay text-embedding-004 (cũ), xem
    # ai.google.dev/gemini-api/docs/models/gemini-embedding-001.
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-embedding-001",
        label="Gemini Embedding 001",
        capabilities=ModelCapabilities(tools=False, vision=False, json_mode=False, thinking=False),
        is_embedding=True,
    ),
    # 1.5 series — ổn định, đã GA lâu, model card công khai xác nhận tools/vision/json_mode.
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-1.5-flash",
        label="Gemini 1.5 Flash",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=False),
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-1.5-flash-8b",
        label="Gemini 1.5 Flash-8B",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=False),
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-1.5-pro",
        label="Gemini 1.5 Pro",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=False),
    ),
    # 2.0 series
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-2.0-flash",
        label="Gemini 2.0 Flash",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=False),
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-2.0-flash-lite",
        label="Gemini 2.0 Flash-Lite",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=False),
    ),
    # 2.5 series — thêm "thinking" (reasoning trace) — xác nhận thật qua live-test module `voice`
    # (ADR-0009, phần model native-audio dưới đây trả part.thought=True).
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-2.5-flash",
        label="Gemini 2.5 Flash",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=True),
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-2.5-pro",
        label="Gemini 2.5 Pro",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=True),
    ),
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-2.5-flash-lite",
        label="Gemini 2.5 Flash-Lite",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=False),
    ),
    # Native audio / Live — xác nhận thật qua live-test (2026-08-23, ADR-0009): model trả
    # part.thought=True (thinking) và nhận tools.functionDeclarations trong setup message.
    ModelCatalogEntry(
        provider="gemini",
        model_id="gemini-2.5-flash-native-audio-latest",
        label="Gemini 2.5 Flash Native Audio",
        capabilities=ModelCapabilities(tools=True, vision=None, json_mode=None, thinking=True),
    ),
    # Embedding
    ModelCatalogEntry(
        provider="gemini",
        model_id="text-embedding-004",
        label="Gemini text-embedding-004",
        capabilities=ModelCapabilities(tools=False, vision=False, json_mode=False, thinking=False),
        is_embedding=True,
    ),
    # ── OpenAI ──────────────────────────────────────────────────────────────────────────────
    ModelCatalogEntry(
        provider="openai",
        model_id="gpt-3.5-turbo",
        label="GPT-3.5 Turbo",
        capabilities=ModelCapabilities(tools=True, vision=False, json_mode=True, thinking=False),
    ),
    ModelCatalogEntry(
        provider="openai",
        model_id="gpt-4-turbo",
        label="GPT-4 Turbo",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=False),
    ),
    ModelCatalogEntry(
        provider="openai",
        model_id="gpt-4o",
        label="GPT-4o",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=False),
    ),
    ModelCatalogEntry(
        provider="openai",
        model_id="gpt-4o-mini",
        label="GPT-4o mini",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=True, thinking=False),
    ),
    ModelCatalogEntry(
        provider="openai",
        model_id="o1",
        label="OpenAI o1 (reasoning)",
        capabilities=ModelCapabilities(tools=True, vision=True, json_mode=None, thinking=True),
    ),
    ModelCatalogEntry(
        provider="openai",
        model_id="o1-mini",
        label="OpenAI o1-mini (reasoning)",
        capabilities=ModelCapabilities(tools=False, vision=False, json_mode=None, thinking=True),
    ),
    ModelCatalogEntry(
        provider="openai",
        model_id="o3-mini",
        label="OpenAI o3-mini (reasoning)",
        capabilities=ModelCapabilities(tools=True, vision=False, json_mode=None, thinking=True),
    ),
    ModelCatalogEntry(
        provider="openai",
        model_id="text-embedding-3-small",
        label="OpenAI text-embedding-3-small",
        capabilities=ModelCapabilities(tools=False, vision=False, json_mode=False, thinking=False),
        is_embedding=True,
    ),
    ModelCatalogEntry(
        provider="openai",
        model_id="text-embedding-3-large",
        label="OpenAI text-embedding-3-large",
        capabilities=ModelCapabilities(tools=False, vision=False, json_mode=False, thinking=False),
        is_embedding=True,
    ),
    # ollama/sglang: cố ý không có entry ở đây — xem docstring đầu file.
]


def get_capabilities(provider: str, model_id: str) -> ModelCapabilities | None:
    for entry in CATALOG:
        if entry.provider == provider and entry.model_id == model_id:
            return entry.capabilities
    return None


def list_by_provider(provider: str) -> list[ModelCatalogEntry]:
    return [entry for entry in CATALOG if entry.provider == provider]
