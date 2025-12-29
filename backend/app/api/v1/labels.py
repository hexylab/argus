"""Label API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser
from app.core.supabase import get_supabase_client
from app.crud.label import LabelNotFoundError
from app.crud.label import create_label as crud_create_label
from app.crud.label import delete_label as crud_delete_label
from app.crud.label import get_label as crud_get_label
from app.crud.label import get_labels as crud_get_labels
from app.crud.label import update_label as crud_update_label
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.models.label import Label, LabelCreate, LabelUpdate

router = APIRouter(prefix="/projects/{project_id}/labels", tags=["labels"])


def _verify_project_ownership(client: object, project_id: UUID, owner_id: UUID) -> None:
    """Verify that the user owns the project."""
    try:
        crud_get_project(client, project_id, owner_id)  # type: ignore[arg-type]
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e


@router.post("", response_model=Label, status_code=status.HTTP_201_CREATED)
async def create_label(
    project_id: UUID,
    data: LabelCreate,
    current_user: CurrentUser,
) -> Label:
    """
    Create a new label in a project.

    The user must own the project.
    """
    client = get_supabase_client()
    owner_id = UUID(current_user.sub)

    # Verify project ownership
    _verify_project_ownership(client, project_id, owner_id)

    # Override project_id from path parameter
    create_data = LabelCreate(
        project_id=project_id,
        name=data.name,
        color=data.color,
        description=data.description,
        sort_order=data.sort_order,
    )

    return crud_create_label(client, create_data)


@router.get("", response_model=list[Label])
async def list_labels(
    project_id: UUID,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records"),
) -> list[Label]:
    """
    List all labels in a project.

    The user must own the project.
    Results are ordered by sort_order and creation date.
    """
    client = get_supabase_client()
    owner_id = UUID(current_user.sub)

    # Verify project ownership
    _verify_project_ownership(client, project_id, owner_id)

    return crud_get_labels(client, project_id, skip=skip, limit=limit)


@router.get("/{label_id}", response_model=Label)
async def get_label(
    project_id: UUID,
    label_id: UUID,
    current_user: CurrentUser,
) -> Label:
    """
    Get a specific label by ID.

    Returns 404 if the label or project does not exist.
    """
    client = get_supabase_client()
    owner_id = UUID(current_user.sub)

    # Verify project ownership
    _verify_project_ownership(client, project_id, owner_id)

    try:
        return crud_get_label(client, label_id, project_id)
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
    current_user: CurrentUser,
) -> Label:
    """
    Update a label.

    Only the fields provided will be updated.
    Returns 404 if the label or project does not exist.
    """
    client = get_supabase_client()
    owner_id = UUID(current_user.sub)

    # Verify project ownership
    _verify_project_ownership(client, project_id, owner_id)

    try:
        return crud_update_label(client, label_id, project_id, data)
    except LabelNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label {label_id} not found",
        ) from e


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_label(
    project_id: UUID,
    label_id: UUID,
    current_user: CurrentUser,
) -> None:
    """
    Delete a label.

    Returns 404 if the label or project does not exist.
    """
    client = get_supabase_client()
    owner_id = UUID(current_user.sub)

    # Verify project ownership
    _verify_project_ownership(client, project_id, owner_id)

    try:
        crud_delete_label(client, label_id, project_id)
    except LabelNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label {label_id} not found",
        ) from e
