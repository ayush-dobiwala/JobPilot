from app.config import Settings, load_settings
from pytest import MonkeyPatch


def test_load_settings_uses_defaults(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("WORKER_INTERNAL_URL", raising=False)

    settings = Settings()

    assert settings.redis_url == "redis://localhost:6379"
    assert settings.database_url == ""
    assert settings.worker_internal_url == "http://localhost:8000"


def test_load_settings_reads_env(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://cache:6379")
    monkeypatch.setenv("DATABASE_URL", "postgres://example")

    settings = load_settings()

    assert settings.redis_url == "redis://cache:6379"
    assert settings.database_url == "postgres://example"
