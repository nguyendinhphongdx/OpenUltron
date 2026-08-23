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

    # CORS — apps/web gọi thẳng apps/api từ browser (không qua gateway). Danh sách origin
    # cách nhau bởi dấu phẩy trong .env, vd "http://localhost:3010,http://192.168.1.5:3010".
    cors_origins: str = "http://localhost:3010,http://127.0.0.1:3010"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
