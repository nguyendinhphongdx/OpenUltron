# ADR-0012 — Provider adapter: 1 interface, 1 registry thay `if provider == ...` lặp lại 3 chỗ

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-23

## Context

`docs/conventions/01-backend-fastapi.md` (mục "Nguyên tắc thiết kế") lấy `core/providers.py` làm
ví dụ **nên giữ if/else, không trừu tượng hoá** — đúng lúc viết, vì chỉ có 1 việc (build chat
model) lặp theo provider. Từ đó tới nay, số việc cần làm theo provider đã tăng lên (ADR-0010
Credential, ADR-0011 Ollama), và `if provider == "gemini"`/`"openai"`/`"ollama"`/`"sglang"` giờ
lặp lại ở **3 chỗ khác nhau, 2 file khác nhau**:

- `core/providers.py::build_chat_model` — if/elif theo provider.
- `core/providers.py::build_embeddings` — if/elif theo provider (gần như giống nhánh trên).
- `credential/service.py::_verify` — if/elif riêng chỉ cho gemini/openai để gọi đúng endpoint
  test-connection.

Thêm provider thứ 5 (hoặc thêm việc thứ 4 theo provider, ví dụ "list model có sẵn") sẽ phải sửa
đúng 3 chỗ, dễ quên 1 trong 3 — đây là "đau thật" đúng ngưỡng convention đã đặt ra ("trừu tượng hoá
chỉ khi có ≥2 cài đặt thật VÀ đau thật", `01-backend-fastapi.md`) — không phải trừu tượng hoá vì
"có thể cần sau".

User yêu cầu trực tiếp: muốn đổi/thêm provider không phải sửa code rải rác, đủ linh hoạt.

## Decision

**1 `Protocol` `ProviderAdapter`** (`app/core/provider_adapter.py`), tối thiểu các method đang thật
sự lặp lại (không thêm method chưa ai cần):

```python
class ProviderAdapter(Protocol):
    requires_credential: bool  # True: gemini/openai (cần key) — False: ollama/sglang (self-host)

    def build_chat_model(self, *, model_id: str, base_url: str | None, api_key: str | None) -> BaseChatModel: ...
    def build_embeddings(self, *, model_id: str, base_url: str | None, api_key: str | None) -> Embeddings: ...
    async def test_connection(self, api_key: str | None) -> bool: ...
```

**1 registry tĩnh** `PROVIDERS: dict[str, ProviderAdapter]` — dict thường, KHÔNG plugin
discovery/entry-point/dynamic import (thừa cho 4 provider cố định, không phải hệ thống cho bên thứ
ba tự đăng ký provider). Thêm provider mới = viết 1 class implement `ProviderAdapter` + thêm 1 dòng
vào dict — không sửa `core/providers.py`/`credential/service.py` nữa.

Mỗi class provider (`GeminiAdapter`, `OpenAIAdapter`, `OllamaAdapter`, `SglangAdapter`) gói đúng
logic if/elif cũ của provider đó — **không đổi hành vi**, chỉ đổi chỗ đặt code (từ 1 nhánh if rải
rác sang 1 class riêng).

`core/providers.py::build_chat_model`/`build_embeddings` và `credential/service.py::_verify` sau
khi đổi chỉ còn: `get_provider(name).build_chat_model(...)` / `.test_connection(...)` — không còn
if/elif theo provider ở 2 file gọi, chỉ còn đúng 1 chỗ (`provider_adapter.py`) biết chi tiết từng
provider.

`credential/service.py::_SUPPORTED_PROVIDERS` (hiện hardcode `{"gemini", "openai"}`) đổi thành
derive từ registry: `{name for name, a in PROVIDERS.items() if a.requires_credential}` — 1 nguồn
sự thật, không lặp danh sách provider cần credential ở 2 nơi.

## Consequences

- ✅ Thêm provider mới = 1 class + 1 dòng registry, không sửa `core/providers.py`/
  `credential/service.py` — đúng yêu cầu "đổi provider không đổi code rải rác".
- ✅ Không đổi hành vi runtime — refactor thuần (di chuyển code, không viết lại logic).
- ✅ Vẫn đơn giản — `Protocol` + dict, không DI container/plugin loader/factory pattern phức tạp,
  đúng tinh thần "đơn giản nhất cho use-case hiện tại" đã áp dụng nhất quán từ ADR-0010/0011.
- ⚠️ `Protocol` chỉ có 3 method hiện dùng thật (`build_chat_model`/`build_embeddings`/
  `test_connection`) — KHÔNG thêm `list_available_models` vào interface dù Ollama module đã có
  logic tương tự (`catalog()`/`list_installed()`), vì Gemini/OpenAI chưa có nhu cầu thật "list model
  có sẵn" qua UI (khác Ollama — self-host, cần biết đã pull gì). Thêm khi có nhu cầu thật, không
  đoán trước.
- ⚠️ Cập nhật `01-backend-fastapi.md` — ví dụ "nên giữ if/else" trước đây trỏ tới `core/providers.py`
  không còn đúng nguyên bản; sửa lại ví dụ để phản ánh: **if/else vẫn đúng khi chỉ 1 chỗ gọi, chuyển
  sang adapter khi ≥2 chỗ gọi cùng if/elif đó** — nguyên tắc không đổi, chỉ cập nhật ví dụ minh hoạ.

## Alternatives considered

- **Giữ if/else, chấp nhận lặp ở 3 chỗ**: loại — đây chính là "đau thật" ADR này giải quyết, không
  phải giả định.
- **Plugin registry động (entry points, tự động discover class trong 1 folder)**: loại — thừa cho
  4 provider cố định biết trước, thêm phức tạp không cần thiết (setup.py entry_points hoặc tự viết
  importlib scan) so với 1 dict tĩnh.
- **Abstract Base Class (ABC) thay `Protocol`**: cân nhắc tương đương, chọn `Protocol` vì không cần
  kế thừa (mỗi provider class độc lập, không chia sẻ implementation chung nào đáng kể qua base
  class) — structural typing phù hợp hơn.
