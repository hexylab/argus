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

__all__ = [
    "create_label",
    "create_project",
    "delete_label",
    "delete_project",
    "get_label",
    "get_labels",
    "get_project",
    "get_projects",
    "update_label",
    "update_project",
]
