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

    all_frames: list[dict[str, Any]] = []

    # Process in batches to avoid URI too long error
    batch_size = 50
    for i in range(0, len(frame_ids), batch_size):
        batch = frame_ids[i : i + batch_size]
        result = (
            client.table("frames")
            .select("*")
            .in_("id", [str(fid) for fid in batch])
            .execute()
        )
        all_frames.extend(result.data)

    return all_frames


def calculate_iou(
    box1: tuple[float, float, float, float],
    box2: tuple[float, float, float, float],
) -> float:
    """Calculate IoU (Intersection over Union) between two bounding boxes.

    Args:
        box1: (x, y, width, height) in normalized coordinates (0-1)
        box2: (x, y, width, height) in normalized coordinates (0-1)

    Returns:
        IoU value between 0 and 1
    """
    # box1 coordinates
    x1_min, y1_min = box1[0], box1[1]
    x1_max, y1_max = box1[0] + box1[2], box1[1] + box1[3]

    # box2 coordinates
    x2_min, y2_min = box2[0], box2[1]
    x2_max, y2_max = box2[0] + box2[2], box2[1] + box2[3]

    # Intersection area
    inter_x_min = max(x1_min, x2_min)
    inter_y_min = max(y1_min, y2_min)
    inter_x_max = min(x1_max, x2_max)
    inter_y_max = min(y1_max, y2_max)

    inter_width = max(0, inter_x_max - inter_x_min)
    inter_height = max(0, inter_y_max - inter_y_min)
    intersection = inter_width * inter_height

    # Area of each box
    area1 = box1[2] * box1[3]
    area2 = box2[2] * box2[3]

    # Union area
    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0.0


def is_duplicate_bbox(
    new_bbox: tuple[float, float, float, float],
    existing_bboxes: list[tuple[float, float, float, float]],
    iou_threshold: float,
) -> bool:
    """Check if new bbox overlaps with any existing bbox above IoU threshold.

    Args:
        new_bbox: (x, y, width, height) of new detection
        existing_bboxes: List of existing bboxes to compare against
        iou_threshold: IoU threshold for considering as duplicate

    Returns:
        True if duplicate (should skip), False otherwise
    """
    for existing_bbox in existing_bboxes:
        if calculate_iou(new_bbox, existing_bbox) >= iou_threshold:
            return True
    return False


def get_existing_annotations_for_frames(
    client: Any,
    frame_ids: list[UUID],
    label_id: UUID,
) -> dict[UUID, list[tuple[float, float, float, float]]]:
    """Get existing annotation bboxes for multiple frames with specific label.

    Args:
        client: Supabase client
        frame_ids: List of frame UUIDs
        label_id: Label UUID to filter by

    Returns:
        Dictionary mapping frame_id to list of (bbox_x, bbox_y, bbox_width, bbox_height)
    """
    if not frame_ids:
        return {}

    result_dict: dict[UUID, list[tuple[float, float, float, float]]] = {
        fid: [] for fid in frame_ids
    }

    # Process in batches to avoid URI too long error
    batch_size = 50
    for i in range(0, len(frame_ids), batch_size):
        batch = frame_ids[i : i + batch_size]
        result = (
            client.table("annotations")
            .select("frame_id, bbox_x, bbox_y, bbox_width, bbox_height")
            .in_("frame_id", [str(fid) for fid in batch])
            .eq("label_id", str(label_id))
            .execute()
        )

        for row in result.data:
            fid = UUID(row["frame_id"])
            if fid in result_dict:
                result_dict[fid].append(
                    (
                        row["bbox_x"],
                        row["bbox_y"],
                        row["bbox_width"],
                        row["bbox_height"],
                    )
                )

    return result_dict


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
    iou_threshold: float,
    existing_bboxes: list[tuple[float, float, float, float]],
) -> tuple[list[AnnotationCreate], int]:
    """Process a single frame and generate annotations.

    Args:
        frame: Frame record from database.
        label_id: UUID of the label to apply.
        label_name: Label name to use as SAM3 prompt.
        created_by: UUID of the user creating annotations.
        confidence_threshold: Minimum confidence score to include.
        iou_threshold: IoU threshold for duplicate detection.
        existing_bboxes: List of existing bboxes to compare against.

    Returns:
        Tuple of (list of AnnotationCreate objects, number of skipped duplicates)
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
    skipped_count = 0

    # Track bboxes for same-frame duplicate detection
    current_frame_bboxes: list[tuple[float, float, float, float]] = list(
        existing_bboxes
    )

    # Sort boxes by confidence score (highest first) to prioritize high-confidence detections
    sorted_boxes = sorted(result.boxes, key=lambda b: b.score, reverse=True)

    for box in sorted_boxes:
        if box.score < confidence_threshold:
            continue

        bbox_tuple = convert_bbox_to_normalized(
            box.x1, box.y1, box.x2, box.y2, width, height
        )

        # Check for duplicate (against existing + same-frame detections)
        if is_duplicate_bbox(bbox_tuple, current_frame_bboxes, iou_threshold):
            skipped_count += 1
            continue

        annotations.append(
            AnnotationCreate(
                frame_id=frame_id,
                label_id=label_id,
                created_by=created_by,
                bbox_x=bbox_tuple[0],
                bbox_y=bbox_tuple[1],
                bbox_width=bbox_tuple[2],
                bbox_height=bbox_tuple[3],
                confidence=box.score,
                source=AnnotationSource.AUTO,
                reviewed=False,
            )
        )

        # Add to current frame bboxes for subsequent duplicate checks
        current_frame_bboxes.append(bbox_tuple)

    return annotations, skipped_count


@celery_app.task(bind=True, queue="sam3", max_retries=3, default_retry_delay=120)  # type: ignore[untyped-decorator]
def auto_annotate_frames(
    self: Task,
    frame_ids: list[str],
    label_id: str,
    label_name: str,
    created_by: str,
    confidence_threshold: float = 0.5,
    iou_threshold: float = 0.5,
) -> dict[str, Any]:
    """Auto-annotate frames using SAM 3.

    This task:
    1. Fetches frame records from the database
    2. Fetches existing annotations for duplicate detection
    3. Downloads each frame image from S3
    4. Runs SAM 3 text-prompted segmentation using the label name
    5. Creates annotations for detections above confidence threshold,
       skipping duplicates based on IoU threshold

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
        iou_threshold: IoU threshold (0-1) for duplicate detection.
                      Detections with IoU >= threshold against existing
                      annotations are skipped. Default is 0.5.

    Returns:
        Dictionary with annotation results.
    """
    label_uuid = UUID(label_id)
    created_by_uuid = UUID(created_by)
    frame_uuids = [UUID(fid) for fid in frame_ids]

    try:
        logger.info(
            f"Starting auto-annotation for {len(frame_ids)} frames "
            f"with label '{label_name}' (confidence >= {confidence_threshold}, "
            f"IoU threshold = {iou_threshold})"
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
                "skipped_count": 0,
                "status": "no_frames",
            }

        logger.info(f"Found {len(frames)} frames to process")

        # Fetch existing annotations for all frames (batch query to avoid N+1)
        existing_annotations = get_existing_annotations_for_frames(
            client, frame_uuids, label_uuid
        )
        total_existing = sum(len(bboxes) for bboxes in existing_annotations.values())
        logger.info(f"Found {total_existing} existing annotations for duplicate check")

        # Process each frame
        all_annotations: list[AnnotationCreate] = []
        processed_count = 0
        failed_count = 0
        skipped_count = 0

        for frame in frames:
            try:
                frame_id = UUID(frame["id"])
                existing_bboxes = existing_annotations.get(frame_id, [])

                annotations, skipped = process_frame_for_annotation(
                    frame=frame,
                    label_id=label_uuid,
                    label_name=label_name,
                    created_by=created_by_uuid,
                    confidence_threshold=confidence_threshold,
                    iou_threshold=iou_threshold,
                    existing_bboxes=existing_bboxes,
                )
                all_annotations.extend(annotations)
                skipped_count += skipped
                processed_count += 1
                logger.debug(
                    f"Processed frame {frame['id']}: "
                    f"{len(annotations)} annotations created, {skipped} skipped"
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
            f"{skipped_count} duplicates skipped, "
            f"{failed_count} frames failed"
        )

        return {
            "frame_count": processed_count,
            "annotation_count": len(all_annotations),
            "skipped_count": skipped_count,
            "failed_count": failed_count,
            "status": "success",
        }

    except Exception as e:
        logger.exception(f"Auto-annotation failed: {e}")

        # Retry on transient errors
        raise self.retry(exc=e) from e
