"""Label API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from supabase import Client

from app.api.deps import Auth
from app.crud.label import LabelNotFoundError
from app.crud.label import create_label as crud_create_label
from app.crud.label import delete_label as crud_delete_label
from app.crud.label import get_label as crud_get_label
from app.crud.label import get_labels as crud_get_labels
from app.crud.label import update_label as crud_update_label
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.models.label import Label, LabelCreate, LabelCreateRequest, LabelUpdate

router = APIRouter(prefix="/projects/{project_id}/labels", tags=["labels"])


def _verify_project_ownership(client: Client, project_id: UUID, owner_id: UUID) -> None:
    """Verify that the user owns the project."""
    try:
        crud_get_project(client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e


@router.post("", response_model=Label, status_code=status.HTTP_201_CREATED)
async def create_label(
    project_id: UUID,
    data: LabelCreateRequest,
    auth: Auth,
) -> Label:
    """
    Create a new label in a project.

    The user must own the project.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Build LabelCreate with project_id from path parameter
    create_data = LabelCreate(
        project_id=project_id,
        name=data.name,
        color=data.color,
        description=data.description,
        sort_order=data.sort_order,
    )

    return crud_create_label(auth.client, create_data)


@router.get("", response_model=list[Label])
async def list_labels(
    project_id: UUID,
    auth: Auth,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records"),
) -> list[Label]:
    """
    List all labels in a project.

    The user must own the project.
    Results are ordered by sort_order and creation date.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    return crud_get_labels(auth.client, project_id, skip=skip, limit=limit)


@router.get("/{label_id}", response_model=Label)
async def get_label(
    project_id: UUID,
    label_id: UUID,
    auth: Auth,
) -> Label:
    """
    Get a specific label by ID.

    Returns 404 if the label or project does not exist.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    try:
        return crud_get_label(auth.client, label_id, project_id)
    except LabelNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label {label_id} not found",
        ) from e


@router.patch("/{label_id}", response_model=Label)
async def update_label(
    project_id: UUID,
    label_id: UUID,
    data: LabelUpdate,
    auth: Auth,
) -> Label:
    """
    Update a label.

    Only the fields provided will be updated.
    Returns 404 if the label or project does not exist.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    try:
        return crud_update_label(auth.client, label_id, project_id, data)
    except LabelNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label {label_id} not found",
        ) from e


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_label(
    project_id: UUID,
    label_id: UUID,
    auth: Auth,
) -> None:
    """
    Delete a label.

    Returns 404 if the label or project does not exist.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    try:
        crud_delete_label(auth.client, label_id, project_id)
    except LabelNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label {label_id} not found",
        ) from e
