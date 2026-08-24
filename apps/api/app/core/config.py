from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Env config (ADR-0004 Pydantic). Thiếu biến bắt buộc → fail fast lúc bootstrap."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    port: int = 8000
    log_level: str = "INFO"

    # Database (ADR-0003)
    database_url: str

    # Agent execution (ADR-0005) — Ollama local, không cần API key
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3.5:4b"

    # Provider API key (gemini/openai) KHÔNG còn đọc qua đây — đã chuyển sang lưu DB có mã hoá
    # (ADR-0010, module `credential`). Field `gemini_api_key`/`openai_api_key` cũ bị xoá có chủ
    # đích, không phải thiếu sót.

    # AES-256-GCM symmetric key (ADR-0010, base64, decode ra đúng 32 byte) — dùng để mã hoá
    # ciphertext của Credential tại rest. Đọc + validate ở `app/core/crypto.py`.
    app_encryption_key: str

    # CORS — apps/web gọi thẳng apps/api từ browser (không qua gateway). Danh sách origin
    # cách nhau bởi dấu phẩy trong .env, vd "http://localhost:3010,http://192.168.1.5:3010".
    cors_origins: str = "http://localhost:3010,http://127.0.0.1:3010"

    # Sandbox cho builtin tool write-file/run-command (ADR-0016) — mọi path agent đưa vào bị giới
    # hạn trong thư mục này (app/core/workspace.py::resolve_safe_path), không cho ghi/chạy lệnh
    # ngoài phạm vi này.
    workspace_dir: str = "./data/workspace"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
