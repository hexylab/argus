"""JWT verification for Supabase authentication."""

import logging
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class TokenPayload(BaseModel):
    """Decoded JWT token payload."""

    sub: str  # user_id
    aud: str  # "authenticated"
    exp: datetime
    iat: datetime
    email: str | None = None
    role: str | None = None


class JWTError(Exception):
    """JWT validation error."""


@lru_cache(maxsize=1)
def _get_jwks_client() -> PyJWKClient:
    """Get cached JWKS client for Supabase."""
    settings = get_settings()
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)


def _verify_with_jwks(token: str) -> dict[str, Any]:
    """Verify JWT using JWKS (ES256/RS256)."""
    jwks_client = _get_jwks_client()
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    payload: dict[str, Any] = jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
    )
    return payload


def _verify_with_secret(token: str, secret: str) -> dict[str, Any]:
    """Verify JWT using shared secret (HS256)."""
    payload: dict[str, Any] = jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience="authenticated",
    )
    return payload


def verify_jwt(token: str) -> TokenPayload:
    """
    Verify and decode Supabase JWT token.

    Supports both ES256/RS256 (via JWKS) and HS256 (via shared secret).
    First tries JWKS verification, falls back to HS256 if JWKS fails.

    Args:
        token: The JWT token string to verify.

    Returns:
        TokenPayload with decoded claims.

    Raises:
        JWTError: If token is invalid, expired, or has wrong audience.
    """
    settings = get_settings()

    # Check algorithm from token header
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
    except jwt.PyJWTError as e:
        raise JWTError(f"Invalid token header: {e}") from e

    try:
        if alg in ("ES256", "RS256"):
            payload = _verify_with_jwks(token)
        else:
            payload = _verify_with_secret(token, settings.supabase_jwt_secret)

        return TokenPayload(
            sub=payload["sub"],
            aud=payload["aud"],
            exp=datetime.fromtimestamp(payload["exp"], tz=UTC),
            iat=datetime.fromtimestamp(payload["iat"], tz=UTC),
            email=payload.get("email"),
            role=payload.get("role"),
        )
    except jwt.ExpiredSignatureError as e:
        raise JWTError("Token has expired") from e
    except jwt.InvalidAudienceError as e:
        raise JWTError("Invalid audience") from e
    except jwt.PyJWKClientError as e:
        logger.error(f"JWKS client error: {e}")
        raise JWTError(f"Failed to fetch signing key: {e}") from e
    except jwt.PyJWTError as e:
        raise JWTError(f"Invalid token: {e}") from e
