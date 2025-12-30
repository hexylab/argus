"""Export API endpoints."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import Auth
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.services.export.coco import COCOExporter
from app.services.export.yolo import YOLOExporter

router = APIRouter(
    prefix="/projects/{project_id}/export",
    tags=["export"],
)


@router.get("/coco", response_model=dict[str, Any])
async def export_coco(
    project_id: UUID,
    auth: Auth,
) -> dict[str, Any]:
    """
    Export project annotations in COCO format.

    Returns a JSON object containing the COCO format dataset.
    The user must own the project.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    try:
        crud_get_project(auth.client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e

    # Export to COCO format
    exporter = COCOExporter(auth.client)
    return exporter.export_project(project_id)


@router.get("/yolo", response_model=dict[str, Any])
async def export_yolo(
    project_id: UUID,
    auth: Auth,
) -> dict[str, Any]:
    """
    Export project annotations in YOLO format.

    Returns a JSON object containing:
    - data_yaml: YAML string with class names and count
    - annotations: Dict mapping filename.txt to annotation content

    Each annotation line has format: class_id center_x center_y width height
    All coordinates are normalized (0-1).

    The user must own the project.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    try:
        crud_get_project(auth.client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e

    # Export to YOLO format
    exporter = YOLOExporter(auth.client)
    return exporter.export_project(project_id)
