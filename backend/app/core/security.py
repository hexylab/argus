"""JWT verification for Supabase authentication."""

from datetime import UTC, datetime
from typing import Any

import jwt
from pydantic import BaseModel

from app.core.config import get_settings


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


def verify_jwt(token: str) -> TokenPayload:
    """
    Verify and decode Supabase JWT token.

    Args:
        token: The JWT token string to verify.

    Returns:
        TokenPayload with decoded claims.

    Raises:
        JWTError: If token is invalid, expired, or has wrong audience.
    """
    settings = get_settings()

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )

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
    except jwt.PyJWTError as e:
        raise JWTError(f"Invalid token: {e}") from e
