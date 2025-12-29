"""CRUD operations module."""

from app.crud.label import (
    create_label,
    delete_label,
    get_label,
    get_labels,
    update_label,
)
from app.crud.project import (
    create_project,
    delete_project,
    get_project,
    get_projects,
    update_project,
)
from app.crud.video import (
    create_video,
    delete_video,
    get_video,
    get_videos,
    update_video,
)

__all__ = [
    "create_label",
    "create_project",
    "create_video",
    "delete_label",
    "delete_project",
    "delete_video",
    "get_label",
    "get_labels",
    "get_project",
    "get_projects",
    "get_video",
    "get_videos",
    "update_label",
    "update_project",
    "update_video",
]
