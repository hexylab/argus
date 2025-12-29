"""Video models for uploaded video files."""

from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import ConfigDict, Field

from app.models.base import BaseSchema, SupabaseModel


class VideoStatus(StrEnum):
    """Video processing status."""

    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class VideoMetadata(BaseSchema):
    """Video metadata stored as JSONB."""

    model_config = ConfigDict(extra="allow")

    codec: str | None = None
    bitrate: int | None = None


class VideoBase(BaseSchema):
    """Shared video fields."""

    filename: str = Field(..., min_length=1, max_length=255)
    original_filename: str = Field(..., min_length=1, max_length=255)
    s3_key: str = Field(..., min_length=1)
    mime_type: str | None = Field(None, max_length=100)
    file_size: int | None = Field(None, ge=0)
    duration_seconds: float | None = Field(None, ge=0)
    width: int | None = Field(None, ge=1)
    height: int | None = Field(None, ge=1)
    fps: float | None = Field(None, ge=0)
    frame_count: int | None = Field(None, ge=0)
    status: VideoStatus = VideoStatus.UPLOADING
    error_message: str | None = None
    metadata: VideoMetadata = Field(default_factory=VideoMetadata)


class VideoCreate(BaseSchema):
    """Schema for creating a video."""

    project_id: UUID
    filename: str = Field(..., min_length=1, max_length=255)
    original_filename: str = Field(..., min_length=1, max_length=255)
    s3_key: str = Field(..., min_length=1)
    mime_type: str | None = None
    file_size: int | None = Field(None, ge=0)
    metadata: dict[str, Any] | None = None


class VideoUpdate(BaseSchema):
    """Schema for updating a video."""

    filename: str | None = Field(None, min_length=1, max_length=255)
    file_size: int | None = Field(None, ge=0)
    duration_seconds: float | None = Field(None, ge=0)
    width: int | None = Field(None, ge=1)
    height: int | None = Field(None, ge=1)
    fps: float | None = Field(None, ge=0)
    frame_count: int | None = Field(None, ge=0)
    status: VideoStatus | None = None
    error_message: str | None = None
    metadata: dict[str, Any] | None = None


class Video(VideoBase, SupabaseModel):
    """Video entity from database."""

    project_id: UUID
