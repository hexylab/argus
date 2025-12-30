"""CRUD operations for annotations."""

from typing import Any
from uuid import UUID

from supabase import Client

from app.models.annotation import Annotation, AnnotationCreate, AnnotationUpdate


class AnnotationNotFoundError(Exception):
    """Raised when an annotation is not found."""

    pass


def create_annotation(client: Client, data: AnnotationCreate) -> Annotation:
    """
    Create a new annotation.

    Args:
        client: Supabase client instance.
        data: Annotation creation data.

    Returns:
        Created annotation.
    """
    insert_data: dict[str, Any] = {
        "frame_id": str(data.frame_id),
        "label_id": str(data.label_id),
        "bbox_x": data.bbox_x,
        "bbox_y": data.bbox_y,
        "bbox_width": data.bbox_width,
        "bbox_height": data.bbox_height,
        "segmentation": data.segmentation,
        "confidence": data.confidence,
        "source": data.source.value if data.source else "manual",
        "reviewed": data.reviewed,
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

    insert_data = [
        {
            "frame_id": str(data.frame_id),
            "label_id": str(data.label_id),
            "bbox_x": data.bbox_x,
            "bbox_y": data.bbox_y,
            "bbox_width": data.bbox_width,
            "bbox_height": data.bbox_height,
            "segmentation": data.segmentation,
            "confidence": data.confidence,
            "source": data.source.value if data.source else "manual",
            "reviewed": data.reviewed,
            "created_by": str(data.created_by),
        }
        for data in annotations
    ]

    result = client.table("annotations").insert(insert_data).execute()

    rows: list[dict[str, Any]] = result.data  # type: ignore[assignment]
    return [Annotation(**row) for row in rows]
