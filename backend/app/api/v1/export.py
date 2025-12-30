"""Export API endpoints."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import Auth
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.services.export.coco import COCOExporter

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
