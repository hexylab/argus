"""Supabase client initialization."""

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    """
    Get cached Supabase client instance.

    The client uses the anon key and is suitable for
    authenticated user operations with RLS.

    Returns:
        Supabase client instance.
    """
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )


def get_supabase_client_with_auth(access_token: str) -> Client:
    """
    Get Supabase client with user's JWT token for RLS.

    This creates a new client instance with the user's access token
    set in the Authorization header, enabling RLS policies to work correctly.

    Args:
        access_token: The user's JWT access token from Supabase Auth.

    Returns:
        Supabase client instance with auth configured.
    """
    settings = get_settings()
    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )
    # Set the auth token for RLS
    client.postgrest.auth(access_token)
    return client
