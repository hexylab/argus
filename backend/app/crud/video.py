"""CRUD operations for videos."""

from typing import Any
from uuid import UUID

from supabase import Client

from app.models.video import Video, VideoCreate, VideoStatus, VideoUpdate


class VideoNotFoundError(Exception):
    """Raised when a video is not found."""

    pass


def create_video(client: Client, data: VideoCreate) -> Video:
    """
    Create a new video record.

    Args:
        client: Supabase client instance.
        data: Video creation data.

    Returns:
        Created video.
    """
    insert_data: dict[str, Any] = {
        "project_id": str(data.project_id),
        "filename": data.filename,
        "original_filename": data.original_filename,
        "s3_key": data.s3_key,
        "status": VideoStatus.UPLOADING.value,
        "source_type": data.source_type.value,
    }

    if data.mime_type is not None:
        insert_data["mime_type"] = data.mime_type
    if data.file_size is not None:
        insert_data["file_size"] = data.file_size
    if data.metadata is not None:
        insert_data["metadata"] = data.metadata

    result = client.table("videos").insert(insert_data).execute()

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Video(**row)


def get_video(client: Client, video_id: UUID, project_id: UUID) -> Video:
    """
    Get a video by ID.

    Args:
        client: Supabase client instance.
        video_id: UUID of the video.
        project_id: UUID of the project.

    Returns:
        Video if found.

    Raises:
        VideoNotFoundError: If the video is not found.
    """
    result = (
        client.table("videos")
        .select("*")
        .eq("id", str(video_id))
        .eq("project_id", str(project_id))
        .execute()
    )

    if not result.data:
        raise VideoNotFoundError(f"Video {video_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Video(**row)


def get_videos(
    client: Client,
    project_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> list[Video]:
    """
    Get all videos for a project.

    Args:
        client: Supabase client instance.
        project_id: UUID of the project.
        skip: Number of records to skip.
        limit: Maximum number of records to return.

    Returns:
        List of videos.
    """
    result = (
        client.table("videos")
        .select("*")
        .eq("project_id", str(project_id))
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )

    rows: list[dict[str, Any]] = result.data  # type: ignore[assignment]
    return [Video(**row) for row in rows]


def update_video(
    client: Client,
    video_id: UUID,
    project_id: UUID,
    data: VideoUpdate,
) -> Video:
    """
    Update a video.

    Args:
        client: Supabase client instance.
        video_id: UUID of the video.
        project_id: UUID of the project.
        data: Video update data.

    Returns:
        Updated video.

    Raises:
        VideoNotFoundError: If the video is not found.
    """
    # Build update data, excluding None values
    update_data: dict[str, Any] = {}
    if data.filename is not None:
        update_data["filename"] = data.filename
    if data.file_size is not None:
        update_data["file_size"] = data.file_size
    if data.duration_seconds is not None:
        update_data["duration_seconds"] = data.duration_seconds
    if data.width is not None:
        update_data["width"] = data.width
    if data.height is not None:
        update_data["height"] = data.height
    if data.fps is not None:
        update_data["fps"] = data.fps
    if data.frame_count is not None:
        update_data["frame_count"] = data.frame_count
    if data.status is not None:
        update_data["status"] = data.status.value
    if data.error_message is not None:
        update_data["error_message"] = data.error_message
    if data.metadata is not None:
        update_data["metadata"] = data.metadata

    if not update_data:
        # No fields to update, just return existing video
        return get_video(client, video_id, project_id)

    result = (
        client.table("videos")
        .update(update_data)
        .eq("id", str(video_id))
        .eq("project_id", str(project_id))
        .execute()
    )

    if not result.data:
        raise VideoNotFoundError(f"Video {video_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Video(**row)


def check_video_exists_by_filename(
    client: Client,
    project_id: UUID,
    filename: str,
) -> Video | None:
    """
    Check if a video with the given filename exists in the project.

    Args:
        client: Supabase client instance.
        project_id: UUID of the project.
        filename: Original filename to check.

    Returns:
        Video if found, None otherwise.
    """
    result = (
        client.table("videos")
        .select("*")
        .eq("project_id", str(project_id))
        .eq("original_filename", filename)
        .limit(1)
        .execute()
    )

    if not result.data:
        return None

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Video(**row)


def delete_video(client: Client, video_id: UUID, project_id: UUID) -> bool:
    """
    Delete a video.

    Args:
        client: Supabase client instance.
        video_id: UUID of the video.
        project_id: UUID of the project.

    Returns:
        True if deleted successfully.

    Raises:
        VideoNotFoundError: If the video is not found.
    """
    # First check if video exists
    _ = get_video(client, video_id, project_id)

    client.table("videos").delete().eq("id", str(video_id)).eq(
        "project_id", str(project_id)
    ).execute()

    return True
