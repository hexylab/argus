"""CRUD operations module."""

from app.crud.frame import (
    create_frame,
    create_frames_bulk,
    delete_frame,
    delete_frames_by_video,
    get_frame,
    get_frames,
)
from app.crud.import_job import (
    create_import_job,
    delete_import_job,
    get_import_job,
    get_import_jobs,
    update_import_job,
)
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
    "create_frame",
    "create_frames_bulk",
    "create_import_job",
    "create_label",
    "create_project",
    "create_video",
    "delete_frame",
    "delete_frames_by_video",
    "delete_import_job",
    "delete_label",
    "delete_project",
    "delete_video",
    "get_frame",
    "get_frames",
    "get_import_job",
    "get_import_jobs",
    "get_label",
    "get_labels",
    "get_project",
    "get_projects",
    "get_video",
    "get_videos",
    "update_import_job",
    "update_label",
    "update_project",
    "update_video",
]
