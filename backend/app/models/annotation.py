"""Annotation models for object annotations on frames."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field, field_validator

from app.models.base import BaseSchema, SupabaseModel


class AnnotationSource(StrEnum):
    """Annotation source type."""

    MANUAL = "manual"
    AUTO = "auto"
    IMPORTED = "imported"


class BoundingBox(BaseSchema):
    """Normalized bounding box (0-1 range)."""

    x: float = Field(..., ge=0, le=1)
    y: float = Field(..., ge=0, le=1)
    width: float = Field(..., ge=0, le=1)
    height: float = Field(..., ge=0, le=1)

    @field_validator("width", "height")
    @classmethod
    def validate_positive(cls, v: float) -> float:
        """Ensure width and height are positive."""
        if v <= 0:
            raise ValueError("must be positive")
        return v


class AnnotationBase(BaseSchema):
    """Shared annotation fields."""

    bbox_x: float = Field(..., ge=0, le=1)
    bbox_y: float = Field(..., ge=0, le=1)
    bbox_width: float = Field(..., ge=0, le=1)
    bbox_height: float = Field(..., ge=0, le=1)
    segmentation: list[list[float]] | None = None  # [[x1,y1,x2,y2,...], ...]
    confidence: float | None = Field(None, ge=0, le=1)
    source: AnnotationSource = AnnotationSource.MANUAL
    reviewed: bool = False


class AnnotationCreateRequest(BaseSchema):
    """Schema for annotation creation request (from API)."""

    label_id: UUID
    bbox_x: float = Field(..., ge=0, le=1)
    bbox_y: float = Field(..., ge=0, le=1)
    bbox_width: float = Field(..., ge=0, le=1)
    bbox_height: float = Field(..., ge=0, le=1)
    segmentation: list[list[float]] | None = None
    confidence: float | None = Field(None, ge=0, le=1)
    source: AnnotationSource = AnnotationSource.MANUAL
    reviewed: bool = False


class AnnotationCreate(AnnotationBase):
    """Schema for creating an annotation (internal use)."""

    frame_id: UUID
    label_id: UUID
    created_by: UUID


class AnnotationUpdate(BaseSchema):
    """Schema for updating an annotation."""

    bbox_x: float | None = Field(None, ge=0, le=1)
    bbox_y: float | None = Field(None, ge=0, le=1)
    bbox_width: float | None = Field(None, ge=0, le=1)
    bbox_height: float | None = Field(None, ge=0, le=1)
    label_id: UUID | None = None
    segmentation: list[list[float]] | None = None
    confidence: float | None = Field(None, ge=0, le=1)
    source: AnnotationSource | None = None
    reviewed: bool | None = None
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None


class AnnotationBulkSaveRequest(BaseSchema):
    """Schema for bulk saving annotations (replaces all for a frame)."""

    annotations: list[AnnotationCreateRequest]


class Annotation(AnnotationBase, SupabaseModel):
    """Annotation entity from database."""

    frame_id: UUID
    label_id: UUID
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    created_by: UUID

    @property
    def bbox(self) -> BoundingBox:
        """Get bounding box as BoundingBox object."""
        return BoundingBox(
            x=self.bbox_x,
            y=self.bbox_y,
            width=self.bbox_width,
            height=self.bbox_height,
        )


class AnnotationWithFrame(Annotation):
    """Annotation with frame information for review."""

    frame_number: int
    frame_s3_key: str
    frame_thumbnail_s3_key: str | None = None
    video_id: UUID
    label_name: str
    label_color: str


class AnnotationReviewStats(BaseSchema):
    """Statistics for annotation review."""

    total_count: int
    reviewed_count: int
    pending_count: int
    auto_count: int
    manual_count: int


class BulkApproveRequest(BaseSchema):
    """Request for bulk approving annotations."""

    annotation_ids: list[UUID] = Field(..., min_length=1, max_length=1000)


class BulkApproveResponse(BaseSchema):
    """Response for bulk approve operation."""

    approved_count: int
    errors: list[str] = Field(default_factory=list)


class BulkDeleteRequest(BaseSchema):
    """Request for bulk deleting annotations."""

    annotation_ids: list[UUID] = Field(..., min_length=1, max_length=1000)


class BulkDeleteResponse(BaseSchema):
    """Response for bulk delete operation."""

    deleted_count: int
    errors: list[str] = Field(default_factory=list)
