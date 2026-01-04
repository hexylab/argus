"""API v1 module."""

from app.api.v1.annotations import router as annotations_router
from app.api.v1.export import router as export_router
from app.api.v1.frames import router as frames_router
from app.api.v1.labels import router as labels_router
from app.api.v1.projects import router as projects_router
from app.api.v1.search import router as search_router
from app.api.v1.videos import router as videos_router

__all__ = [
    "annotations_router",
    "export_router",
    "frames_router",
    "labels_router",
    "projects_router",
    "search_router",
    "videos_router",
]
