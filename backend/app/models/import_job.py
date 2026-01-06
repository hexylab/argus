"""Import job models for dataset import functionality."""

from enum import StrEnum
from uuid import UUID

from pydantic import Field

from app.models.base import BaseSchema, SupabaseModel


class ImportFormat(StrEnum):
    """Supported import formats."""

    IMAGES_ONLY = "images_only"  # Images without annotations
    COCO = "coco"  # COCO format (annotations.json + images)
    YOLO = "yolo"  # YOLO format (data.yaml + labels/*.txt + images/*)


class ImportStatus(StrEnum):
    """Import job status."""

    PENDING = "pending"  # Waiting for upload completion
    PROCESSING = "processing"  # Processing the import
    COMPLETED = "completed"  # Successfully completed
    FAILED = "failed"  # Failed with error


class ImportJobBase(BaseSchema):
    """Shared import job fields."""

    format: ImportFormat
    status: ImportStatus = ImportStatus.PENDING
    progress: float = Field(default=0.0, ge=0.0, le=100.0)
    s3_key: str | None = None
    total_images: int | None = None
    processed_images: int | None = None
    total_annotations: int | None = None
    imported_annotations: int | None = None
    label_mapping: dict[str, str] | None = (
        None  # External label name -> internal label_id
    )
    error_message: str | None = None


class ImportJobCreate(BaseSchema):
    """Schema for creating an import job."""

    project_id: UUID
    format: ImportFormat
    s3_key: str
    created_by: UUID


class ImportJobUpdate(BaseSchema):
    """Schema for updating an import job."""

    video_id: UUID | None = None
    status: ImportStatus | None = None
    progress: float | None = Field(None, ge=0.0, le=100.0)
    total_images: int | None = None
    processed_images: int | None = None
    total_annotations: int | None = None
    imported_annotations: int | None = None
    label_mapping: dict[str, str] | None = None
    error_message: str | None = None


class ImportJob(ImportJobBase, SupabaseModel):
    """Import job entity from database."""

    project_id: UUID
    video_id: UUID | None = None  # Created video/image_set ID after successful import
    created_by: UUID


class ImportPreviewLabel(BaseSchema):
    """Label info from import preview."""

    name: str
    count: int


class ImportPreviewResponse(BaseSchema):
    """Response for import preview."""

    format: ImportFormat
    total_images: int
    labels: list[ImportPreviewLabel]
    sample_images: list[str] | None = None  # Preview URLs for first few images


class ImportUploadUrlRequest(BaseSchema):
    """Request for getting import upload URL."""

    format: ImportFormat
    filename: str = Field(..., min_length=1, max_length=255)


class ImportUploadUrlResponse(BaseSchema):
    """Response with presigned upload URL for import."""

    import_job_id: UUID
    upload_url: str
    s3_key: str


class StartImportRequest(BaseSchema):
    """Request to start import processing."""

    label_mapping: dict[str, str] | None = (
        None  # External label name -> internal label_id
    )
    name: str | None = None  # Optional name for the created image set
