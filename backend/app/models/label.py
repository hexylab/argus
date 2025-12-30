"""Label models for annotation labels."""

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.base import BaseSchema


class LabelBase(BaseSchema):
    """Shared label fields."""

    name: str = Field(..., min_length=1, max_length=255)
    color: str = Field(default="#FF0000", pattern=r"^#[0-9A-Fa-f]{6}$")
    description: str | None = None
    sort_order: int = 0


class LabelCreateRequest(LabelBase):
    """Schema for API request to create a label (project_id comes from path)."""

    pass


class LabelCreate(LabelBase):
    """Schema for creating a label (used internally with CRUD)."""

    project_id: UUID


class LabelUpdate(BaseSchema):
    """Schema for updating a label."""

    name: str | None = Field(None, min_length=1, max_length=255)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    description: str | None = None
    sort_order: int | None = None


class Label(LabelBase):
    """Label entity from database."""

    id: UUID
    project_id: UUID
    created_at: datetime
