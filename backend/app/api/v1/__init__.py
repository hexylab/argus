"""API v1 module."""

from app.api.v1.labels import router as labels_router
from app.api.v1.projects import router as projects_router
from app.api.v1.videos import router as videos_router

__all__ = ["labels_router", "projects_router", "videos_router"]
