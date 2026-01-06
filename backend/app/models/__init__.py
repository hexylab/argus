"""Pydantic models for Argus database entities."""

from app.models.annotation import (
    Annotation,
    AnnotationCreate,
    AnnotationSource,
    AnnotationUpdate,
    BoundingBox,
)
from app.models.base import BaseSchema, SupabaseModel, TimestampMixin
from app.models.frame import Frame, FrameCreate, FrameSimilarityResult, FrameUpdate
from app.models.import_job import (
    ImportFormat,
    ImportJob,
    ImportJobCreate,
    ImportJobUpdate,
    ImportPreviewLabel,
    ImportPreviewResponse,
    ImportStatus,
    ImportUploadUrlRequest,
    ImportUploadUrlResponse,
    StartImportRequest,
)
from app.models.label import Label, LabelCreate, LabelUpdate
from app.models.project import (
    Project,
    ProjectCreate,
    ProjectSettings,
    ProjectStatus,
    ProjectUpdate,
)
from app.models.user import Profile, ProfileCreate, ProfilePreferences, ProfileUpdate
from app.models.video import (
    Video,
    VideoCreate,
    VideoMetadata,
    VideoSourceType,
    VideoStatus,
    VideoUpdate,
)

__all__ = [
    "Annotation",
    "AnnotationCreate",
    "AnnotationSource",
    "AnnotationUpdate",
    "BaseSchema",
    "BoundingBox",
    "Frame",
    "FrameCreate",
    "FrameSimilarityResult",
    "FrameUpdate",
    "ImportFormat",
    "ImportJob",
    "ImportJobCreate",
    "ImportJobUpdate",
    "ImportPreviewLabel",
    "ImportPreviewResponse",
    "ImportStatus",
    "ImportUploadUrlRequest",
    "ImportUploadUrlResponse",
    "Label",
    "LabelCreate",
    "LabelUpdate",
    "Profile",
    "ProfileCreate",
    "ProfilePreferences",
    "ProfileUpdate",
    "Project",
    "ProjectCreate",
    "ProjectSettings",
    "ProjectStatus",
    "ProjectUpdate",
    "StartImportRequest",
    "SupabaseModel",
    "TimestampMixin",
    "Video",
    "VideoCreate",
    "VideoMetadata",
    "VideoSourceType",
    "VideoStatus",
    "VideoUpdate",
]
