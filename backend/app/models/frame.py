"""Frame models for video frames."""

import json
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field, field_validator

from app.models.base import BaseSchema


class FrameBase(BaseSchema):
    """Shared frame fields."""

    frame_number: int = Field(..., ge=0)
    timestamp_ms: int = Field(..., ge=0)
    s3_key: str = Field(..., min_length=1)
    thumbnail_s3_key: str | None = None
    width: int | None = Field(None, ge=1)
    height: int | None = Field(None, ge=1)


class FrameCreate(FrameBase):
    """Schema for creating a frame."""

    video_id: UUID


class FrameUpdate(BaseSchema):
    """Schema for updating a frame."""

    s3_key: str | None = Field(None, min_length=1)
    thumbnail_s3_key: str | None = None
    width: int | None = Field(None, ge=1)
    height: int | None = Field(None, ge=1)


class Frame(FrameBase):
    """Frame entity from database."""

    id: UUID
    video_id: UUID
    embedding: list[float] | None = None  # vector(768) as Python list
    created_at: datetime

    @field_validator("embedding", mode="before")
    @classmethod
    def parse_embedding(cls, v: Any) -> list[float] | None:
        """Parse embedding from string (pgvector returns as string via REST API)."""
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            parsed: list[float] = json.loads(v)
            return parsed
        return None  # Unsupported type, let Pydantic handle validation


class FrameSimilarityResult(BaseSchema):
    """Result from similarity search function."""

    frame_id: UUID
    video_id: UUID
    frame_number: int
    s3_key: str
    similarity: float
