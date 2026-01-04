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
    VideoStatus,
    VideoUpdate,
)

__all__ = [
    # Annotation
    "Annotation",
    "AnnotationCreate",
    "AnnotationSource",
    "AnnotationUpdate",
    "BaseSchema",
    "BoundingBox",
    # Frame
    "Frame",
    "FrameCreate",
    "FrameSimilarityResult",
    "FrameUpdate",
    # Label
    "Label",
    "LabelCreate",
    "LabelUpdate",
    # Profile
    "Profile",
    "ProfileCreate",
    "ProfilePreferences",
    "ProfileUpdate",
    # Project
    "Project",
    "ProjectCreate",
    "ProjectSettings",
    "ProjectStatus",
    "ProjectUpdate",
    "SupabaseModel",
    "TimestampMixin",
    # Video
    "Video",
    "VideoCreate",
    "VideoMetadata",
    "VideoStatus",
    "VideoUpdate",
]
