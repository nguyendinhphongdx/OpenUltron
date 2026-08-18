from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Env config (ADR-0004 Pydantic). Thiếu biến bắt buộc → fail fast lúc bootstrap."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    port: int = 8000

    # Database (ADR-0003)
    database_url: str

    # Agent execution (ADR-0005) — Ollama local, không cần API key
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3.5:4b"


settings = Settings()
