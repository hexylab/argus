"""Tests for security module."""

from datetime import timedelta

import pytest

from app.core.config import get_settings
from app.core.security import JWTError, verify_jwt
from tests.conftest import TEST_JWT_SECRET, create_test_token, get_test_settings


@pytest.fixture(autouse=True)
def override_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Override settings for all tests in this module."""
    get_settings.cache_clear()
    monkeypatch.setattr("app.core.security.get_settings", get_test_settings)


def test_verify_jwt_valid_token() -> None:
    """Test verification of valid JWT token."""
    token = create_test_token(user_id="user-123", email="user@example.com")
    payload = verify_jwt(token)

    assert payload.sub == "user-123"
    assert payload.email == "user@example.com"
    assert payload.aud == "authenticated"


def test_verify_jwt_expired_token() -> None:
    """Test verification fails for expired token."""
    token = create_test_token(expires_delta=timedelta(hours=-1))

    with pytest.raises(JWTError) as exc_info:
        verify_jwt(token)

    assert "expired" in str(exc_info.value).lower()


def test_verify_jwt_invalid_token() -> None:
    """Test verification fails for invalid token."""
    with pytest.raises(JWTError) as exc_info:
        verify_jwt("invalid-token")

    assert "invalid" in str(exc_info.value).lower()


def test_verify_jwt_wrong_secret() -> None:
    """Test verification fails for token with wrong secret."""
    import jwt

    token = jwt.encode(
        {"sub": "user", "aud": "authenticated", "exp": 9999999999, "iat": 0},
        "wrong-secret",
        algorithm="HS256",
    )

    with pytest.raises(JWTError):
        verify_jwt(token)


def test_verify_jwt_wrong_audience() -> None:
    """Test verification fails for token with wrong audience."""
    import jwt

    token = jwt.encode(
        {"sub": "user", "aud": "wrong-audience", "exp": 9999999999, "iat": 0},
        TEST_JWT_SECRET,
        algorithm="HS256",
    )

    with pytest.raises(JWTError) as exc_info:
        verify_jwt(token)

    assert "audience" in str(exc_info.value).lower()
