"""Profile models for user data stored in public.profiles."""

from typing import Any
from uuid import UUID

from pydantic import ConfigDict, Field

from app.models.base import BaseSchema, SupabaseModel


class ProfilePreferences(BaseSchema):
    """User preferences stored as JSONB."""

    model_config = ConfigDict(extra="allow")

    theme: str = "light"
    notifications_enabled: bool = True
    language: str = "ja"


class ProfileBase(BaseSchema):
    """Shared profile fields."""

    display_name: str | None = Field(None, max_length=255)
    avatar_url: str | None = None
    preferences: ProfilePreferences = Field(default_factory=ProfilePreferences)


class ProfileCreate(ProfileBase):
    """Schema for creating a profile (on first login)."""

    id: UUID  # Must match auth.users.id


class ProfileUpdate(BaseSchema):
    """Schema for updating a profile."""

    display_name: str | None = Field(None, max_length=255)
    avatar_url: str | None = None
    preferences: dict[str, Any] | None = None


class Profile(ProfileBase, SupabaseModel):
    """Profile entity from database."""

    pass
