"""CRUD operations for labels."""

from typing import Any
from uuid import UUID

from supabase import Client

from app.models.label import Label, LabelCreate, LabelUpdate


class LabelNotFoundError(Exception):
    """Raised when a label is not found."""

    pass


def create_label(client: Client, data: LabelCreate) -> Label:
    """
    Create a new label.

    Args:
        client: Supabase client instance.
        data: Label creation data.

    Returns:
        Created label.
    """
    insert_data = {
        "project_id": str(data.project_id),
        "name": data.name,
        "color": data.color,
        "description": data.description,
        "sort_order": data.sort_order,
    }

    result = client.table("labels").insert(insert_data).execute()

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Label(**row)


def get_label(client: Client, label_id: UUID, project_id: UUID) -> Label:
    """
    Get a label by ID.

    Args:
        client: Supabase client instance.
        label_id: UUID of the label.
        project_id: UUID of the project.

    Returns:
        Label if found.

    Raises:
        LabelNotFoundError: If the label is not found.
    """
    result = (
        client.table("labels")
        .select("*")
        .eq("id", str(label_id))
        .eq("project_id", str(project_id))
        .execute()
    )

    if not result.data:
        raise LabelNotFoundError(f"Label {label_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Label(**row)


def get_labels(
    client: Client,
    project_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> list[Label]:
    """
    Get all labels for a project.

    Args:
        client: Supabase client instance.
        project_id: UUID of the project.
        skip: Number of records to skip.
        limit: Maximum number of records to return.

    Returns:
        List of labels.
    """
    result = (
        client.table("labels")
        .select("*")
        .eq("project_id", str(project_id))
        .order("sort_order")
        .order("created_at")
        .range(skip, skip + limit - 1)
        .execute()
    )

    rows: list[dict[str, Any]] = result.data  # type: ignore[assignment]
    return [Label(**row) for row in rows]


def update_label(
    client: Client,
    label_id: UUID,
    project_id: UUID,
    data: LabelUpdate,
) -> Label:
    """
    Update a label.

    Args:
        client: Supabase client instance.
        label_id: UUID of the label.
        project_id: UUID of the project.
        data: Label update data.

    Returns:
        Updated label.

    Raises:
        LabelNotFoundError: If the label is not found.
    """
    # Build update data, excluding None values
    update_data: dict[str, Any] = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.color is not None:
        update_data["color"] = data.color
    if data.description is not None:
        update_data["description"] = data.description
    if data.sort_order is not None:
        update_data["sort_order"] = data.sort_order

    if not update_data:
        # No fields to update, just return existing label
        return get_label(client, label_id, project_id)

    result = (
        client.table("labels")
        .update(update_data)
        .eq("id", str(label_id))
        .eq("project_id", str(project_id))
        .execute()
    )

    if not result.data:
        raise LabelNotFoundError(f"Label {label_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Label(**row)


def delete_label(client: Client, label_id: UUID, project_id: UUID) -> bool:
    """
    Delete a label.

    Args:
        client: Supabase client instance.
        label_id: UUID of the label.
        project_id: UUID of the project.

    Returns:
        True if deleted successfully.

    Raises:
        LabelNotFoundError: If the label is not found.
    """
    # First check if label exists
    _ = get_label(client, label_id, project_id)

    client.table("labels").delete().eq("id", str(label_id)).eq(
        "project_id", str(project_id)
    ).execute()

    return True
