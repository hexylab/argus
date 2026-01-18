"""CRUD operations for annotations."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from supabase import Client

from app.models.annotation import (
    Annotation,
    AnnotationCreate,
    AnnotationReviewStats,
    AnnotationSource,
    AnnotationUpdate,
    AnnotationWithFrame,
)


class AnnotationNotFoundError(Exception):
    """Raised when an annotation is not found."""

    pass


def _determine_reviewed_status(source: AnnotationSource | None) -> bool:
    """
    Determine reviewed status based on annotation source.

    - manual/imported: reviewed=True (human-created or intentionally imported)
    - auto: reviewed=False (AI-generated, needs review)

    Args:
        source: Annotation source type.

    Returns:
        Whether the annotation should be marked as reviewed.
    """
    return source != AnnotationSource.AUTO


def create_annotation(client: Client, data: AnnotationCreate) -> Annotation:
    """
    Create a new annotation.

    Args:
        client: Supabase client instance.
        data: Annotation creation data.

    Returns:
        Created annotation.
    """
    source = data.source or AnnotationSource.MANUAL
    reviewed = _determine_reviewed_status(source)

    insert_data: dict[str, Any] = {
        "frame_id": str(data.frame_id),
        "label_id": str(data.label_id),
        "bbox_x": data.bbox_x,
        "bbox_y": data.bbox_y,
        "bbox_width": data.bbox_width,
        "bbox_height": data.bbox_height,
        "segmentation": data.segmentation,
        "confidence": data.confidence,
        "source": source.value,
        "reviewed": reviewed,
        "created_by": str(data.created_by),
    }

    result = client.table("annotations").insert(insert_data).execute()

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Annotation(**row)


def get_annotation(
    client: Client,
    annotation_id: UUID,
    frame_id: UUID,
) -> Annotation:
    """
    Get an annotation by ID.

    Args:
        client: Supabase client instance.
        annotation_id: UUID of the annotation.
        frame_id: UUID of the frame.

    Returns:
        Annotation if found.

    Raises:
        AnnotationNotFoundError: If the annotation is not found.
    """
    result = (
        client.table("annotations")
        .select("*")
        .eq("id", str(annotation_id))
        .eq("frame_id", str(frame_id))
        .execute()
    )

    if not result.data:
        raise AnnotationNotFoundError(f"Annotation {annotation_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Annotation(**row)


def get_annotations(
    client: Client,
    frame_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> list[Annotation]:
    """
    Get all annotations for a frame.

    Args:
        client: Supabase client instance.
        frame_id: UUID of the frame.
        skip: Number of records to skip.
        limit: Maximum number of records to return.

    Returns:
        List of annotations.
    """
    result = (
        client.table("annotations")
        .select("*")
        .eq("frame_id", str(frame_id))
        .order("created_at")
        .range(skip, skip + limit - 1)
        .execute()
    )

    rows: list[dict[str, Any]] = result.data  # type: ignore[assignment]
    return [Annotation(**row) for row in rows]


def update_annotation(
    client: Client,
    annotation_id: UUID,
    frame_id: UUID,
    data: AnnotationUpdate,
) -> Annotation:
    """
    Update an annotation.

    Args:
        client: Supabase client instance.
        annotation_id: UUID of the annotation.
        frame_id: UUID of the frame.
        data: Annotation update data.

    Returns:
        Updated annotation.

    Raises:
        AnnotationNotFoundError: If the annotation is not found.
    """
    # Build update data, excluding None values
    update_data: dict[str, Any] = {}
    if data.bbox_x is not None:
        update_data["bbox_x"] = data.bbox_x
    if data.bbox_y is not None:
        update_data["bbox_y"] = data.bbox_y
    if data.bbox_width is not None:
        update_data["bbox_width"] = data.bbox_width
    if data.bbox_height is not None:
        update_data["bbox_height"] = data.bbox_height
    if data.label_id is not None:
        update_data["label_id"] = str(data.label_id)
    if data.segmentation is not None:
        update_data["segmentation"] = data.segmentation
    if data.confidence is not None:
        update_data["confidence"] = data.confidence
    if data.source is not None:
        update_data["source"] = data.source.value
    if data.reviewed is not None:
        update_data["reviewed"] = data.reviewed
    if data.reviewed_by is not None:
        update_data["reviewed_by"] = str(data.reviewed_by)
    if data.reviewed_at is not None:
        update_data["reviewed_at"] = data.reviewed_at.isoformat()

    if not update_data:
        # No fields to update, just return existing annotation
        return get_annotation(client, annotation_id, frame_id)

    result = (
        client.table("annotations")
        .update(update_data)
        .eq("id", str(annotation_id))
        .eq("frame_id", str(frame_id))
        .execute()
    )

    if not result.data:
        raise AnnotationNotFoundError(f"Annotation {annotation_id} not found")

    row: dict[str, Any] = result.data[0]  # type: ignore[assignment]
    return Annotation(**row)


def delete_annotation(
    client: Client,
    annotation_id: UUID,
    frame_id: UUID,
) -> bool:
    """
    Delete an annotation.

    Args:
        client: Supabase client instance.
        annotation_id: UUID of the annotation.
        frame_id: UUID of the frame.

    Returns:
        True if deleted successfully.

    Raises:
        AnnotationNotFoundError: If the annotation is not found.
    """
    # First check if annotation exists
    _ = get_annotation(client, annotation_id, frame_id)

    client.table("annotations").delete().eq("id", str(annotation_id)).eq(
        "frame_id", str(frame_id)
    ).execute()

    return True


def delete_annotations_by_frame(client: Client, frame_id: UUID) -> int:
    """
    Delete all annotations for a frame.

    Args:
        client: Supabase client instance.
        frame_id: UUID of the frame.

    Returns:
        Number of deleted annotations.
    """
    result = (
        client.table("annotations").delete().eq("frame_id", str(frame_id)).execute()
    )

    return len(result.data) if result.data else 0


def bulk_create_annotations(
    client: Client,
    annotations: list[AnnotationCreate],
) -> list[Annotation]:
    """
    Create multiple annotations at once.

    Args:
        client: Supabase client instance.
        annotations: List of annotation creation data.

    Returns:
        List of created annotations.
    """
    if not annotations:
        return []

    insert_data = []
    for data in annotations:
        source = data.source or AnnotationSource.MANUAL
        reviewed = _determine_reviewed_status(source)
        insert_data.append(
            {
                "frame_id": str(data.frame_id),
                "label_id": str(data.label_id),
                "bbox_x": data.bbox_x,
                "bbox_y": data.bbox_y,
                "bbox_width": data.bbox_width,
                "bbox_height": data.bbox_height,
                "segmentation": data.segmentation,
                "confidence": data.confidence,
                "source": source.value,
                "reviewed": reviewed,
                "created_by": str(data.created_by),
            }
        )

    result = client.table("annotations").insert(insert_data).execute()

    rows: list[dict[str, Any]] = result.data  # type: ignore[assignment]
    return [Annotation(**row) for row in rows]


def get_project_annotations(
    client: Client,
    project_id: UUID,
    source: AnnotationSource | None = None,
    reviewed: bool | None = None,
    min_confidence: float | None = None,
    max_confidence: float | None = None,
    label_id: UUID | None = None,
    video_id: UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[AnnotationWithFrame]:
    """
    Get annotations for a project with filtering options.

    Args:
        client: Supabase client instance.
        project_id: UUID of the project.
        source: Filter by annotation source.
        reviewed: Filter by reviewed status.
        min_confidence: Minimum confidence threshold.
        max_confidence: Maximum confidence threshold.
        label_id: Filter by label ID.
        video_id: Filter by video ID.
        skip: Number of records to skip.
        limit: Maximum number of records to return.

    Returns:
        List of annotations with frame information.
    """
    # Build query with joins to frames, videos, and labels
    query = (
        client.table("annotations")
        .select(
            "*, "
            "frames!inner(frame_number, s3_key, thumbnail_s3_key, video_id, "
            "videos!inner(project_id)), "
            "labels!inner(name, color)"
        )
        .eq("frames.videos.project_id", str(project_id))
    )

    # Apply filters
    if source is not None:
        query = query.eq("source", source.value)
    if reviewed is not None:
        query = query.eq("reviewed", reviewed)
    if min_confidence is not None:
        query = query.gte("confidence", min_confidence)
    if max_confidence is not None:
        query = query.lte("confidence", max_confidence)
    if label_id is not None:
        query = query.eq("label_id", str(label_id))
    if video_id is not None:
        query = query.eq("frames.video_id", str(video_id))

    # Order by confidence descending (low confidence first for review)
    query = query.order("confidence", desc=False, nullsfirst=True)
    query = query.range(skip, skip + limit - 1)

    result = query.execute()

    annotations: list[AnnotationWithFrame] = []
    rows: list[dict[str, Any]] = result.data or []  # type: ignore[assignment]
    for row in rows:
        frame_data = row.pop("frames", {})
        label_data = row.pop("labels", {})

        annotations.append(
            AnnotationWithFrame(
                **row,
                frame_number=frame_data.get("frame_number", 0),
                frame_s3_key=frame_data.get("s3_key", ""),
                frame_thumbnail_s3_key=frame_data.get("thumbnail_s3_key"),
                video_id=frame_data.get("video_id"),
                label_name=label_data.get("name", ""),
                label_color=label_data.get("color", "#808080"),
            )
        )

    return annotations


def get_project_annotation_stats(
    client: Client,
    project_id: UUID,
) -> AnnotationReviewStats:
    """
    Get annotation statistics for a project.

    Uses count queries to avoid Supabase row limits (max_rows=1000).

    Args:
        client: Supabase client instance.
        project_id: UUID of the project.

    Returns:
        Annotation statistics.
    """
    # Total count
    total_result = (
        client.table("annotations")
        .select("*, frames!inner(videos!inner(project_id))", count="exact", head=True)
        .eq("frames.videos.project_id", str(project_id))
        .execute()
    )
    total_count = total_result.count or 0

    # Reviewed count
    reviewed_result = (
        client.table("annotations")
        .select("*, frames!inner(videos!inner(project_id))", count="exact", head=True)
        .eq("frames.videos.project_id", str(project_id))
        .eq("reviewed", True)
        .execute()
    )
    reviewed_count = reviewed_result.count or 0

    # Auto count
    auto_result = (
        client.table("annotations")
        .select("*, frames!inner(videos!inner(project_id))", count="exact", head=True)
        .eq("frames.videos.project_id", str(project_id))
        .eq("source", "auto")
        .execute()
    )
    auto_count = auto_result.count or 0

    # Manual count
    manual_result = (
        client.table("annotations")
        .select("*, frames!inner(videos!inner(project_id))", count="exact", head=True)
        .eq("frames.videos.project_id", str(project_id))
        .eq("source", "manual")
        .execute()
    )
    manual_count = manual_result.count or 0

    pending_count = total_count - reviewed_count

    return AnnotationReviewStats(
        total_count=total_count,
        reviewed_count=reviewed_count,
        pending_count=pending_count,
        auto_count=auto_count,
        manual_count=manual_count,
    )


def bulk_approve_annotations(
    client: Client,
    annotation_ids: list[UUID],
    reviewed_by: UUID,
) -> int:
    """
    Bulk approve annotations.

    Args:
        client: Supabase client instance.
        annotation_ids: List of annotation IDs to approve.
        reviewed_by: UUID of the user approving the annotations.

    Returns:
        Number of approved annotations.
    """
    if not annotation_ids:
        return 0

    now = datetime.now(UTC)
    total_approved = 0

    # Process in batches to avoid URI too long error
    batch_size = 50
    for i in range(0, len(annotation_ids), batch_size):
        batch = annotation_ids[i : i + batch_size]
        result = (
            client.table("annotations")
            .update(
                {
                    "reviewed": True,
                    "reviewed_by": str(reviewed_by),
                    "reviewed_at": now.isoformat(),
                }
            )
            .in_("id", [str(aid) for aid in batch])
            .execute()
        )
        total_approved += len(result.data) if result.data else 0

    return total_approved


def bulk_delete_annotations(
    client: Client,
    annotation_ids: list[UUID],
) -> int:
    """
    Bulk delete annotations.

    Args:
        client: Supabase client instance.
        annotation_ids: List of annotation IDs to delete.

    Returns:
        Number of deleted annotations.
    """
    if not annotation_ids:
        return 0

    total_deleted = 0

    # Process in batches to avoid URI too long error
    batch_size = 50
    for i in range(0, len(annotation_ids), batch_size):
        batch = annotation_ids[i : i + batch_size]
        result = (
            client.table("annotations")
            .delete()
            .in_("id", [str(aid) for aid in batch])
            .execute()
        )
        total_deleted += len(result.data) if result.data else 0

    return total_deleted
