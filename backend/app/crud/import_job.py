"""CRUD operations for import jobs."""

from typing import Any
from uuid import UUID

from supabase import Client

from app.models.import_job import (
    ImportJob,
    ImportJobCreate,
    ImportJobUpdate,
    ImportStatus,
)


class ImportJobNotFoundError(Exception):
    """Raised when an import job is not found."""

    pass


def create_import_job(client: Client, data: ImportJobCreate) -> ImportJob:
    """
    Create a new import job record.

    Args:
        client: Supabase client instance.
        data: Import job creation data.

    Returns:
        Created import job.
    """
    insert_data: dict[str, Any] = {
        "project_id": str(data.project_id),
        "format": data.format.value,
        "s3_key": data.s3_key,
        "status": ImportStatus.PENDING.value,
        "created_by": str(data.created_by),
    }

    result = client.table("import_jobs").insert(insert_data).execute()

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return ImportJob(**row)


def get_import_job(client: Client, import_job_id: UUID, project_id: UUID) -> ImportJob:
    """
    Get an import job by ID.

    Args:
        client: Supabase client instance.
        import_job_id: UUID of the import job.
        project_id: UUID of the project.

    Returns:
        ImportJob if found.

    Raises:
        ImportJobNotFoundError: If the import job is not found.
    """
    result = (
        client.table("import_jobs")
        .select("*")
        .eq("id", str(import_job_id))
        .eq("project_id", str(project_id))
        .execute()
    )

    if not result.data:
        raise ImportJobNotFoundError(f"Import job {import_job_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return ImportJob(**row)


def get_import_jobs(
    client: Client,
    project_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> list[ImportJob]:
    """
    Get all import jobs for a project.

    Args:
        client: Supabase client instance.
        project_id: UUID of the project.
        skip: Number of records to skip.
        limit: Maximum number of records to return.

    Returns:
        List of import jobs.
    """
    result = (
        client.table("import_jobs")
        .select("*")
        .eq("project_id", str(project_id))
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )

    rows: list[dict[str, Any]] = result.data  # type: ignore[assignment]
    return [ImportJob(**row) for row in rows]


def update_import_job(
    client: Client,
    import_job_id: UUID,
    project_id: UUID,
    data: ImportJobUpdate,
) -> ImportJob:
    """
    Update an import job.

    Args:
        client: Supabase client instance.
        import_job_id: UUID of the import job.
        project_id: UUID of the project.
        data: Import job update data.

    Returns:
        Updated import job.

    Raises:
        ImportJobNotFoundError: If the import job is not found.
    """
    # Build update data, excluding None values
    update_data: dict[str, Any] = {}
    if data.video_id is not None:
        update_data["video_id"] = str(data.video_id)
    if data.status is not None:
        update_data["status"] = data.status.value
    if data.progress is not None:
        update_data["progress"] = data.progress
    if data.total_images is not None:
        update_data["total_images"] = data.total_images
    if data.processed_images is not None:
        update_data["processed_images"] = data.processed_images
    if data.total_annotations is not None:
        update_data["total_annotations"] = data.total_annotations
    if data.imported_annotations is not None:
        update_data["imported_annotations"] = data.imported_annotations
    if data.label_mapping is not None:
        update_data["label_mapping"] = data.label_mapping
    if data.error_message is not None:
        update_data["error_message"] = data.error_message

    if not update_data:
        # No fields to update, just return existing import job
        return get_import_job(client, import_job_id, project_id)

    result = (
        client.table("import_jobs")
        .update(update_data)
        .eq("id", str(import_job_id))
        .eq("project_id", str(project_id))
        .execute()
    )

    if not result.data:
        raise ImportJobNotFoundError(f"Import job {import_job_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return ImportJob(**row)


def delete_import_job(client: Client, import_job_id: UUID, project_id: UUID) -> bool:
    """
    Delete an import job.

    Args:
        client: Supabase client instance.
        import_job_id: UUID of the import job.
        project_id: UUID of the project.

    Returns:
        True if deleted successfully.

    Raises:
        ImportJobNotFoundError: If the import job is not found.
    """
    # First check if import job exists
    _ = get_import_job(client, import_job_id, project_id)

    client.table("import_jobs").delete().eq("id", str(import_job_id)).eq(
        "project_id", str(project_id)
    ).execute()

    return True
