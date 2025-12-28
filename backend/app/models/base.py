"""Base Pydantic models with common fields and configuration."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class TimestampMixin(BaseModel):
    """Mixin for created_at/updated_at timestamps."""

    created_at: datetime
    updated_at: datetime


class SupabaseModel(BaseSchema, TimestampMixin):
    """Base model for Supabase entities with id and timestamps."""

    id: UUID


class JsonSettings(BaseSchema):
    """Base for JSONB settings fields."""

    model_config = ConfigDict(extra="allow")

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for Supabase insertion."""
        return self.model_dump(mode="json")
