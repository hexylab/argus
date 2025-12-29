"""CRUD operations for projects."""

from typing import Any
from uuid import UUID

from supabase import Client

from app.models.project import Project, ProjectCreate, ProjectUpdate


class ProjectNotFoundError(Exception):
    """Raised when a project is not found."""

    pass


def create_project(client: Client, owner_id: UUID, data: ProjectCreate) -> Project:
    """
    Create a new project.

    Args:
        client: Supabase client instance.
        owner_id: UUID of the project owner.
        data: Project creation data.

    Returns:
        Created project.

    Raises:
        APIError: If the database operation fails.
    """
    insert_data = {
        "owner_id": str(owner_id),
        "name": data.name,
        "description": data.description,
        "settings": data.settings or {},
    }

    result = client.table("projects").insert(insert_data).execute()

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Project(**row)


def get_project(client: Client, project_id: UUID, owner_id: UUID) -> Project:
    """
    Get a project by ID.

    Args:
        client: Supabase client instance.
        project_id: UUID of the project.
        owner_id: UUID of the project owner.

    Returns:
        Project if found.

    Raises:
        ProjectNotFoundError: If the project is not found.
    """
    result = (
        client.table("projects")
        .select("*")
        .eq("id", str(project_id))
        .eq("owner_id", str(owner_id))
        .execute()
    )

    if not result.data:
        raise ProjectNotFoundError(f"Project {project_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Project(**row)


def get_projects(
    client: Client,
    owner_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> list[Project]:
    """
    Get all projects for an owner.

    Args:
        client: Supabase client instance.
        owner_id: UUID of the project owner.
        skip: Number of records to skip.
        limit: Maximum number of records to return.

    Returns:
        List of projects.
    """
    result = (
        client.table("projects")
        .select("*")
        .eq("owner_id", str(owner_id))
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )

    rows: list[dict[str, Any]] = result.data  # type: ignore[assignment]
    return [Project(**row) for row in rows]


def update_project(
    client: Client,
    project_id: UUID,
    owner_id: UUID,
    data: ProjectUpdate,
) -> Project:
    """
    Update a project.

    Args:
        client: Supabase client instance.
        project_id: UUID of the project.
        owner_id: UUID of the project owner.
        data: Project update data.

    Returns:
        Updated project.

    Raises:
        ProjectNotFoundError: If the project is not found.
    """
    # Build update data, excluding None values
    update_data: dict[str, Any] = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.status is not None:
        update_data["status"] = data.status.value
    if data.settings is not None:
        update_data["settings"] = data.settings

    if not update_data:
        # No fields to update, just return existing project
        return get_project(client, project_id, owner_id)

    result = (
        client.table("projects")
        .update(update_data)
        .eq("id", str(project_id))
        .eq("owner_id", str(owner_id))
        .execute()
    )

    if not result.data:
        raise ProjectNotFoundError(f"Project {project_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Project(**row)


def delete_project(client: Client, project_id: UUID, owner_id: UUID) -> bool:
    """
    Delete a project.

    Args:
        client: Supabase client instance.
        project_id: UUID of the project.
        owner_id: UUID of the project owner.

    Returns:
        True if deleted successfully.

    Raises:
        ProjectNotFoundError: If the project is not found.
    """
    # First check if project exists
    _ = get_project(client, project_id, owner_id)

    client.table("projects").delete().eq("id", str(project_id)).eq(
        "owner_id", str(owner_id)
    ).execute()

    return True
