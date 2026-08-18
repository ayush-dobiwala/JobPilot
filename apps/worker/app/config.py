"""Environment-driven worker settings. Secrets are never hardcoded."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime config loaded from process environment / `.env`."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379"
    database_url: str = ""
    worker_internal_url: str = "http://localhost:8000"


def load_settings() -> Settings:
    """Build settings from the current environment."""
    return Settings()
