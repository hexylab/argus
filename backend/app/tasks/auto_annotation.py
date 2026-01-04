"""Auto-annotation task using SAM 3.

This task runs on the sam3-worker (GPU) and generates bounding box
annotations from video frames using text prompts.
"""

import io
import logging
from typing import Any
from uuid import UUID

from celery import Task
from PIL import Image

from app.celery import celery_app
from app.core.storage import download_object_bytes
from app.crud.annotation import bulk_create_annotations
from app.models.annotation import AnnotationCreate, AnnotationSource
from app.tasks.frame_extraction import get_supabase_client

logger = logging.getLogger(__name__)


def download_and_open_image(s3_key: str) -> Image.Image:
    """Download image from S3 and open as PIL Image.

    Args:
        s3_key: S3 key of the image.

    Returns:
        PIL Image object.
    """
    image_bytes = download_object_bytes(s3_key)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def get_frames_by_ids(
    client: Any,
    frame_ids: list[UUID],
) -> list[dict[str, Any]]:
    """Get frames by their IDs.

    Args:
        client: Supabase client instance.
        frame_ids: List of frame UUIDs to fetch.

    Returns:
        List of frame records.
    """
    if not frame_ids:
        return []

    # Query frames by IDs
    result = (
        client.table("frames")
        .select("*")
        .in_("id", [str(fid) for fid in frame_ids])
        .execute()
    )

    rows: list[dict[str, Any]] = result.data
    return rows


def convert_bbox_to_normalized(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    image_width: int,
    image_height: int,
) -> tuple[float, float, float, float]:
    """Convert absolute coordinates to normalized (0-1) format.

    Args:
        x1: Left x coordinate.
        y1: Top y coordinate.
        x2: Right x coordinate.
        y2: Bottom y coordinate.
        image_width: Image width in pixels.
        image_height: Image height in pixels.

    Returns:
        Tuple of (bbox_x, bbox_y, bbox_width, bbox_height) in 0-1 range.
    """
    bbox_x = x1 / image_width
    bbox_y = y1 / image_height
    bbox_width = (x2 - x1) / image_width
    bbox_height = (y2 - y1) / image_height

    # Clamp to valid range
    bbox_x = max(0.0, min(1.0, bbox_x))
    bbox_y = max(0.0, min(1.0, bbox_y))
    bbox_width = max(0.0, min(1.0 - bbox_x, bbox_width))
    bbox_height = max(0.0, min(1.0 - bbox_y, bbox_height))

    return (bbox_x, bbox_y, bbox_width, bbox_height)


def process_frame_for_annotation(
    frame: dict[str, Any],
    label_id: UUID,
    label_name: str,
    created_by: UUID,
    confidence_threshold: float,
) -> list[AnnotationCreate]:
    """Process a single frame and generate annotations.

    Args:
        frame: Frame record from database.
        label_id: UUID of the label to apply.
        label_name: Label name to use as SAM3 prompt.
        created_by: UUID of the user creating annotations.
        confidence_threshold: Minimum confidence score to include.

    Returns:
        List of AnnotationCreate objects.
    """
    # Import SAM3 here to avoid loading on CPU workers
    from app.ml.sam3.segmentation import segment_from_text

    frame_id = UUID(frame["id"])
    s3_key = frame["s3_key"]

    # Download and open image
    image = download_and_open_image(s3_key)
    width, height = image.size

    # Run SAM3 segmentation
    result = segment_from_text(image, label_name, include_masks=False)

    # Close image to free memory
    image.close()

    # Create annotations for detections above threshold
    annotations: list[AnnotationCreate] = []
    for box in result.boxes:
        if box.score < confidence_threshold:
            continue

        bbox_x, bbox_y, bbox_width, bbox_height = convert_bbox_to_normalized(
            box.x1, box.y1, box.x2, box.y2, width, height
        )

        annotations.append(
            AnnotationCreate(
                frame_id=frame_id,
                label_id=label_id,
                created_by=created_by,
                bbox_x=bbox_x,
                bbox_y=bbox_y,
                bbox_width=bbox_width,
                bbox_height=bbox_height,
                confidence=box.score,
                source=AnnotationSource.AUTO,
                reviewed=False,
            )
        )

    return annotations


@celery_app.task(bind=True, queue="sam3", max_retries=3, default_retry_delay=120)  # type: ignore[untyped-decorator]
def auto_annotate_frames(
    self: Task,
    frame_ids: list[str],
    label_id: str,
    label_name: str,
    created_by: str,
    confidence_threshold: float = 0.5,
) -> dict[str, Any]:
    """Auto-annotate frames using SAM 3.

    This task:
    1. Fetches frame records from the database
    2. Downloads each frame image from S3
    3. Runs SAM 3 text-prompted segmentation using the label name
    4. Creates annotations for all detections above the confidence threshold

    This task runs on the sam3-worker (GPU Worker) which has
    SAM 3 installed.

    Args:
        self: Celery task instance.
        frame_ids: List of frame UUIDs to annotate.
        label_id: UUID of the label to apply.
        label_name: Label name to use as SAM3 prompt.
        created_by: UUID of the user creating annotations.
        confidence_threshold: Minimum confidence score (0-1) to include.
                             Default is 0.5.

    Returns:
        Dictionary with annotation results.
    """
    label_uuid = UUID(label_id)
    created_by_uuid = UUID(created_by)
    frame_uuids = [UUID(fid) for fid in frame_ids]

    try:
        logger.info(
            f"Starting auto-annotation for {len(frame_ids)} frames "
            f"with label '{label_name}'"
        )

        # Get Supabase client
        client = get_supabase_client()

        # Fetch frame records
        frames = get_frames_by_ids(client, frame_uuids)

        if not frames:
            logger.warning(f"No frames found for IDs: {frame_ids}")
            return {
                "frame_count": 0,
                "annotation_count": 0,
                "status": "no_frames",
            }

        logger.info(f"Found {len(frames)} frames to process")

        # Process each frame
        all_annotations: list[AnnotationCreate] = []
        processed_count = 0
        failed_count = 0

        for frame in frames:
            try:
                annotations = process_frame_for_annotation(
                    frame=frame,
                    label_id=label_uuid,
                    label_name=label_name,
                    created_by=created_by_uuid,
                    confidence_threshold=confidence_threshold,
                )
                all_annotations.extend(annotations)
                processed_count += 1
                logger.debug(
                    f"Processed frame {frame['id']}: "
                    f"{len(annotations)} annotations created"
                )
            except Exception as e:
                logger.warning(f"Failed to process frame {frame['id']}: {e}")
                failed_count += 1
                continue

        # Bulk create all annotations
        if all_annotations:
            bulk_create_annotations(client, all_annotations)
            logger.info(f"Created {len(all_annotations)} annotations")

        logger.info(
            f"Auto-annotation completed: "
            f"{processed_count} frames processed, "
            f"{len(all_annotations)} annotations created, "
            f"{failed_count} frames failed"
        )

        return {
            "frame_count": processed_count,
            "annotation_count": len(all_annotations),
            "failed_count": failed_count,
            "status": "success",
        }

    except Exception as e:
        logger.exception(f"Auto-annotation failed: {e}")

        # Retry on transient errors
        raise self.retry(exc=e) from e
