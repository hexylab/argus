"""Project API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import Auth
from app.crud.project import ProjectNotFoundError
from app.crud.project import create_project as crud_create_project
from app.crud.project import delete_project as crud_delete_project
from app.crud.project import get_project as crud_get_project
from app.crud.project import get_projects as crud_get_projects
from app.crud.project import update_project as crud_update_project
from app.models.project import Project, ProjectCreate, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    auth: Auth,
) -> Project:
    """
    Create a new project.

    The project will be owned by the authenticated user.
    """
    owner_id = UUID(auth.user.sub)
    return crud_create_project(auth.client, owner_id, data)


@router.get("", response_model=list[Project])
async def list_projects(
    auth: Auth,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records"),
) -> list[Project]:
    """
    List all projects for the authenticated user.

    Results are ordered by creation date (newest first).
    """
    owner_id = UUID(auth.user.sub)
    return crud_get_projects(auth.client, owner_id, skip=skip, limit=limit)


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: UUID,
    auth: Auth,
) -> Project:
    """
    Get a specific project by ID.

    Returns 404 if the project does not exist or is not owned by the user.
    """
    owner_id = UUID(auth.user.sub)
    try:
        return crud_get_project(auth.client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e


@router.patch("/{project_id}", response_model=Project)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    auth: Auth,
) -> Project:
    """
    Update a project.

    Only the fields provided will be updated.
    Returns 404 if the project does not exist or is not owned by the user.
    """
    owner_id = UUID(auth.user.sub)
    try:
        return crud_update_project(auth.client, project_id, owner_id, data)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    auth: Auth,
) -> None:
    """
    Delete a project.

    Returns 404 if the project does not exist or is not owned by the user.
    """
    owner_id = UUID(auth.user.sub)
    try:
        crud_delete_project(auth.client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e
