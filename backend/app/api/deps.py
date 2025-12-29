"""FastAPI dependency injection for authentication."""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

from app.core.security import JWTError, TokenPayload, verify_jwt
from app.core.supabase import get_supabase_client_with_auth

# HTTPBearer scheme - automatically extracts Bearer token
bearer_scheme = HTTPBearer(auto_error=True)
bearer_scheme_optional = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    """Authentication context containing user info and Supabase client."""

    user: TokenPayload
    access_token: str
    client: Client


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> TokenPayload:
    """
    Validate JWT token and return current user payload.

    Usage:
        @app.get("/protected")
        async def protected_route(
            current_user: Annotated[TokenPayload, Depends(get_current_user)]
        ):
            return {"user_id": current_user.sub}

    Raises:
        HTTPException: 401 if token is invalid or expired.
    """
    try:
        return verify_jwt(credentials.credentials)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_auth_context(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> AuthContext:
    """
    Get authentication context with user info and authenticated Supabase client.

    This dependency validates the JWT and creates a Supabase client with
    the user's access token set for RLS to work correctly.

    Usage:
        @app.get("/protected")
        async def protected_route(auth: AuthContext = Depends(get_auth_context)):
            # auth.user - user info
            # auth.client - Supabase client with RLS auth
            return {"user_id": auth.user.sub}

    Raises:
        HTTPException: 401 if token is invalid or expired.
    """
    try:
        user = verify_jwt(credentials.credentials)
        client = get_supabase_client_with_auth(credentials.credentials)
        return AuthContext(
            user=user,
            access_token=credentials.credentials,
            client=client,
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user_optional(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme_optional),
    ],
) -> TokenPayload | None:
    """
    Optionally validate JWT token.

    Returns None if no token is provided.
    """
    if credentials is None:
        return None

    try:
        return verify_jwt(credentials.credentials)
    except JWTError:
        return None


# Type aliases for cleaner dependency injection
CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]
OptionalUser = Annotated[TokenPayload | None, Depends(get_current_user_optional)]
Auth = Annotated[AuthContext, Depends(get_auth_context)]
