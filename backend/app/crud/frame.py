"""CRUD operations for frames."""

from typing import Any
from uuid import UUID

import numpy as np
from numpy.typing import NDArray
from supabase import Client

from app.models.frame import Frame, FrameCreate, FrameSimilarityResult


class FrameNotFoundError(Exception):
    """Raised when a frame is not found."""

    pass


def create_frame(client: Client, data: FrameCreate) -> Frame:
    """
    Create a new frame record.

    Args:
        client: Supabase client instance.
        data: Frame creation data.

    Returns:
        Created frame.
    """
    insert_data: dict[str, Any] = {
        "video_id": str(data.video_id),
        "frame_number": data.frame_number,
        "timestamp_ms": data.timestamp_ms,
        "s3_key": data.s3_key,
    }

    if data.thumbnail_s3_key is not None:
        insert_data["thumbnail_s3_key"] = data.thumbnail_s3_key
    if data.width is not None:
        insert_data["width"] = data.width
    if data.height is not None:
        insert_data["height"] = data.height

    result = client.table("frames").insert(insert_data).execute()

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Frame(**row)


def create_frames_bulk(client: Client, frames: list[FrameCreate]) -> list[Frame]:
    """
    Create multiple frame records in bulk.

    Args:
        client: Supabase client instance.
        frames: List of frame creation data.

    Returns:
        List of created frames.
    """
    if not frames:
        return []

    insert_data: list[dict[str, Any]] = []
    for data in frames:
        row: dict[str, Any] = {
            "video_id": str(data.video_id),
            "frame_number": data.frame_number,
            "timestamp_ms": data.timestamp_ms,
            "s3_key": data.s3_key,
        }
        if data.thumbnail_s3_key is not None:
            row["thumbnail_s3_key"] = data.thumbnail_s3_key
        if data.width is not None:
            row["width"] = data.width
        if data.height is not None:
            row["height"] = data.height
        insert_data.append(row)

    result = client.table("frames").insert(insert_data).execute()

    rows: list[dict[str, Any]] = result.data  # type: ignore[assignment]
    return [Frame(**r) for r in rows]


def get_frame(client: Client, frame_id: UUID, video_id: UUID) -> Frame:
    """
    Get a frame by ID.

    Args:
        client: Supabase client instance.
        frame_id: UUID of the frame.
        video_id: UUID of the video.

    Returns:
        Frame if found.

    Raises:
        FrameNotFoundError: If the frame is not found.
    """
    result = (
        client.table("frames")
        .select("*")
        .eq("id", str(frame_id))
        .eq("video_id", str(video_id))
        .execute()
    )

    if not result.data:
        raise FrameNotFoundError(f"Frame {frame_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Frame(**row)


def get_frames(
    client: Client,
    video_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> list[Frame]:
    """
    Get all frames for a video.

    Args:
        client: Supabase client instance.
        video_id: UUID of the video.
        skip: Number of records to skip.
        limit: Maximum number of records to return.

    Returns:
        List of frames.
    """
    result = (
        client.table("frames")
        .select("*")
        .eq("video_id", str(video_id))
        .order("frame_number", desc=False)
        .range(skip, skip + limit - 1)
        .execute()
    )

    rows: list[dict[str, Any]] = result.data  # type: ignore[assignment]
    return [Frame(**row) for row in rows]


def delete_frame(client: Client, frame_id: UUID, video_id: UUID) -> bool:
    """
    Delete a frame.

    Args:
        client: Supabase client instance.
        frame_id: UUID of the frame.
        video_id: UUID of the video.

    Returns:
        True if deleted successfully.

    Raises:
        FrameNotFoundError: If the frame is not found.
    """
    # First check if frame exists
    _ = get_frame(client, frame_id, video_id)

    client.table("frames").delete().eq("id", str(frame_id)).eq(
        "video_id", str(video_id)
    ).execute()

    return True


def delete_frames_by_video(client: Client, video_id: UUID) -> int:
    """
    Delete all frames for a video.

    Args:
        client: Supabase client instance.
        video_id: UUID of the video.

    Returns:
        Number of deleted frames.
    """
    result = client.table("frames").delete().eq("video_id", str(video_id)).execute()

    return len(result.data) if result.data else 0


def search_similar_frames(
    client: Client,
    query_embedding: NDArray[np.float32],
    project_id: UUID,
    limit: int = 100,
) -> list[FrameSimilarityResult]:
    """
    Search for frames similar to a query embedding.

    Uses the search_similar_frames PostgreSQL function with HNSW index
    for efficient similarity search.

    Args:
        client: Supabase client instance.
        query_embedding: Query embedding vector (768 dimensions).
        project_id: UUID of the project to search within.
        limit: Maximum number of results to return.

    Returns:
        List of similar frames with similarity scores (0-1, higher is more similar).
    """
    # Convert numpy array to list for JSON serialization
    embedding_list = query_embedding.tolist()

    result = client.rpc(
        "search_similar_frames",
        {
            "query_embedding": embedding_list,
            "project_id_filter": str(project_id),
            "limit_count": limit,
        },
    ).execute()

    rows: list[dict[str, Any]] = result.data  # type: ignore[assignment]
    return [FrameSimilarityResult(**row) for row in rows]


def update_frame_embedding(
    client: Client,
    frame_id: UUID,
    embedding: NDArray[np.float32],
) -> None:
    """
    Update the embedding for a frame.

    Args:
        client: Supabase client instance.
        frame_id: UUID of the frame.
        embedding: Embedding vector (768 dimensions).
    """
    # Convert numpy array to list for JSON serialization
    embedding_list = embedding.tolist()

    client.table("frames").update({"embedding": embedding_list}).eq(
        "id", str(frame_id)
    ).execute()
