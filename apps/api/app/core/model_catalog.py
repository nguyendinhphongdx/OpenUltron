"""Static capability catalog — `provider + model_id -> ModelCapabilities` (ADR-0010).

KHÔNG phải bảng DB (ADR-0010 học bài học `cap`'s ADR-0019 park DB-catalog vì thừa cho
single-tenant) — 1 dict module-level, sửa trực tiếp trong code khi cần thêm/sửa model.

Chỉ điền field mà có nguồn thật xác nhận (live-test trong phiên build voice module — ADR-0009 —
hoặc capability công khai rộng rãi, ổn định của model text phổ biến). Field không chắc → `None` +
comment `# TODO: xác nhận giá trị thật, chưa có nguồn` — KHÔNG bịa số liệu context window.
"""

from pydantic import BaseModel


class ModelCapabilities(BaseModel):
    tools: bool | None = None
    vision: bool | None = None
    json_mode: bool | None = None
    thinking: bool | None = None
    context_window: int | None = None


_CATALOG: dict[tuple[str, str], ModelCapabilities] = {
    # Xác nhận thật qua live-test Gemini Live (ADR-0009, phiên build module `voice`, 2026-08-23):
    # model chấp nhận `tools.functionDeclarations` trong `setup` và trả `part.thought=True` cho
    # reasoning trace — tools/thinking là fact quan sát được, không phải suy diễn từ docs.
    ("gemini", "gemini-2.5-flash-native-audio-latest"): ModelCapabilities(
        tools=True,
        vision=None,  # TODO: xác nhận giá trị thật, chưa có nguồn (Live API multimodal input?)
        json_mode=None,  # TODO: xác nhận giá trị thật, chưa có nguồn
        thinking=True,
        context_window=None,  # TODO: xác nhận giá trị thật, chưa có nguồn
    ),
    # Capability tools/vision/json_mode của các model text phổ biến dưới đây là public docs rộng
    # rãi (Google AI/OpenAI model card) — không phải số liệu tự bịa, nhưng context_window để None
    # vì số cụ thể (token) có thể đổi theo version/preview, chưa xác nhận trực tiếp trong repo.
    ("gemini", "gemini-2.0-flash"): ModelCapabilities(
        tools=True,
        vision=True,
        json_mode=True,
        thinking=False,
        context_window=None,  # TODO: xác nhận giá trị thật, chưa có nguồn
    ),
    ("gemini", "gemini-2.5-flash"): ModelCapabilities(
        tools=True,
        vision=True,
        json_mode=True,
        thinking=True,
        context_window=None,  # TODO: xác nhận giá trị thật, chưa có nguồn
    ),
    ("openai", "gpt-4o"): ModelCapabilities(
        tools=True,
        vision=True,
        json_mode=True,
        thinking=False,
        context_window=None,  # TODO: xác nhận giá trị thật, chưa có nguồn
    ),
    ("openai", "gpt-4o-mini"): ModelCapabilities(
        tools=True,
        vision=True,
        json_mode=True,
        thinking=False,
        context_window=None,  # TODO: xác nhận giá trị thật, chưa có nguồn
    ),
    # ollama/sglang: self-host, capability phụ thuộc model người dùng tự pull/serve — không có
    # entry cố định nào đúng cho mọi trường hợp, để trống thay vì bịa (ADR-0010).
}


def get_capabilities(provider: str, model_id: str) -> ModelCapabilities | None:
    return _CATALOG.get((provider, model_id))
