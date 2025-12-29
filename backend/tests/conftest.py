"""Pytest fixtures for testing."""

import os

# Force test environment variables BEFORE importing app modules
# Using direct assignment instead of setdefault to override Docker env vars
os.environ["SUPABASE_URL"] = "http://localhost:9999"
os.environ["SUPABASE_ANON_KEY"] = "test-anon-key"
os.environ["SUPABASE_JWT_SECRET"] = "test-jwt-secret-for-testing-only"
os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test"
os.environ["DEBUG"] = "false"  # Ensure debug is off for tests

from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import app

# Clear cached settings to ensure test env vars are used
get_settings.cache_clear()

# Test JWT secret - only for testing
TEST_JWT_SECRET = "test-jwt-secret-for-testing-only"

# Test user ID (valid UUID format for Supabase auth)
TEST_USER_ID = "12345678-1234-1234-1234-123456789012"

# Another test user ID for authorization tests
OTHER_USER_ID = "87654321-4321-4321-4321-210987654321"


def get_test_settings() -> Settings:
    """Override settings for testing."""
    return Settings(
        supabase_url="http://localhost:9999",
        supabase_anon_key="test-anon-key",
        supabase_jwt_secret=TEST_JWT_SECRET,
        database_url="postgresql://test:test@localhost:5432/test",
        debug=True,
    )


@pytest.fixture
def test_settings() -> Settings:
    """Get test settings."""
    return get_test_settings()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI test client with mocked settings."""
    app.dependency_overrides[get_settings] = get_test_settings
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def create_test_token(
    user_id: str = TEST_USER_ID,
    email: str = "test@example.com",
    expires_delta: timedelta | None = None,
) -> str:
    """Create a test JWT token."""
    now = datetime.now(tz=UTC)
    expires = now + (expires_delta or timedelta(hours=1))

    payload: dict[str, Any] = {
        "sub": user_id,
        "aud": "authenticated",
        "exp": expires,
        "iat": now,
        "email": email,
        "role": "authenticated",
    }

    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def auth_headers() -> dict[str, str]:
    """Authorization headers with valid test token."""
    token = create_test_token()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_user_auth_headers() -> dict[str, str]:
    """Authorization headers for a different user."""
    token = create_test_token(user_id=OTHER_USER_ID, email="other@example.com")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def expired_auth_headers() -> dict[str, str]:
    """Authorization headers with expired token."""
    token = create_test_token(expires_delta=timedelta(hours=-1))
    return {"Authorization": f"Bearer {token}"}
