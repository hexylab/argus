"""Project models."""

from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import ConfigDict, Field

from app.models.base import BaseSchema, SupabaseModel


class ProjectStatus(StrEnum):
    """Project status enumeration."""

    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class ProjectSettings(BaseSchema):
    """Project settings stored as JSONB."""

    model_config = ConfigDict(extra="allow")

    default_fps: float = 30.0
    auto_annotation: bool = False


class ProjectBase(BaseSchema):
    """Shared project fields."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    settings: ProjectSettings = Field(default_factory=ProjectSettings)


class ProjectCreate(BaseSchema):
    """Schema for creating a project."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    settings: dict[str, Any] | None = None


class ProjectUpdate(BaseSchema):
    """Schema for updating a project."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: ProjectStatus | None = None
    settings: dict[str, Any] | None = None


class Project(ProjectBase, SupabaseModel):
    """Project entity from database."""

    owner_id: UUID
