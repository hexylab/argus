"""Tests for configuration module."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_required_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that required fields raise error when missing."""
    # Clear environment variables to test validation
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(ValidationError):
        Settings()


def test_settings_with_required_fields() -> None:
    """Test settings with all required fields."""
    settings = Settings(
        supabase_url="http://localhost:9999",
        supabase_anon_key="test-anon-key",
        supabase_jwt_secret="test-secret",
        database_url="postgresql://test:test@localhost:5432/test",
    )

    assert settings.supabase_url == "http://localhost:9999"
    assert settings.supabase_anon_key == "test-anon-key"
    assert settings.supabase_jwt_secret == "test-secret"
    assert settings.database_url == "postgresql://test:test@localhost:5432/test"


def test_settings_default_values(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test settings default values."""
    # Clear environment variables that could override defaults
    monkeypatch.delenv("DEBUG", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.delenv("MINIO_ENDPOINT", raising=False)
    monkeypatch.delenv("MINIO_BUCKET", raising=False)
    monkeypatch.delenv("MINIO_USE_SSL", raising=False)

    settings = Settings(
        supabase_url="http://localhost:9999",
        supabase_anon_key="test-anon-key",
        supabase_jwt_secret="test-secret",
        database_url="postgresql://test:test@localhost:5432/test",
    )

    assert settings.app_name == "Argus API"
    assert settings.debug is False
    assert settings.environment == "development"
    assert settings.redis_url == "redis://localhost:6379/0"
    assert settings.minio_endpoint == "localhost:9000"
    assert settings.minio_bucket == "argus-videos"
    assert settings.minio_use_ssl is False
