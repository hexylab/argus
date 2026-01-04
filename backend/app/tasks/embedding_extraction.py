"""Embedding extraction task for video frames.

This task runs on the siglip-worker (GPU) and extracts embeddings
from video frames using SigLIP 2.
"""

import io
import logging
from itertools import batched
from typing import Any
from uuid import UUID

from celery import Task
from PIL import Image

from app.celery import celery_app
from app.core.storage import download_object_bytes
from app.crud.frame import get_frames, update_frame_embedding
from app.models.frame import Frame
from app.tasks.frame_extraction import get_supabase_client

logger = logging.getLogger(__name__)

# Batch size for embedding extraction (adjust based on GPU VRAM)
# 8 frames * ~3MB per frame = ~24MB + model overhead
EMBEDDING_BATCH_SIZE = 8


def download_and_open_image(s3_key: str) -> Image.Image:
    """Download image from S3 and open as PIL Image.

    Args:
        s3_key: S3 key of the image.

    Returns:
        PIL Image object.
    """
    image_bytes = download_object_bytes(s3_key)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def process_frame_batch(
    client: Any,
    frames: list[Frame],
) -> int:
    """Process a batch of frames: extract embeddings and update DB.

    Args:
        client: Supabase client instance.
        frames: List of frames to process.

    Returns:
        Number of frames processed.
    """
    if not frames:
        return 0

    # Import here to avoid loading torch on CPU workers
    from app.ml.siglip.embeddings import extract_image_embeddings

    # Download images
    images: list[Image.Image] = []
    valid_frames: list[Frame] = []

    for frame in frames:
        try:
            img = download_and_open_image(frame.s3_key)
            images.append(img)
            valid_frames.append(frame)
        except Exception as e:
            logger.warning(f"Failed to download frame {frame.id}: {e}")
            continue

    if not images:
        return 0

    # Extract embeddings
    embeddings = extract_image_embeddings(images)

    # Update database
    for frame, embedding in zip(valid_frames, embeddings, strict=True):
        update_frame_embedding(client, frame.id, embedding)

    # Close images to free memory
    for img in images:
        img.close()

    return len(valid_frames)


@celery_app.task(bind=True, queue="siglip", max_retries=3, default_retry_delay=120)  # type: ignore[untyped-decorator]
def extract_embeddings(
    self: Task,
    video_id: str,
    project_id: str,
) -> dict[str, Any]:
    """Extract embeddings from video frames using SigLIP 2.

    This task:
    1. Gets all frames for the video from the database
    2. Downloads frames from S3 in batches
    3. Extracts embeddings using SigLIP 2
    4. Updates frame records with embeddings

    This task runs on the siglip-worker (GPU Worker) which has
    torch and transformers installed.

    Args:
        self: Celery task instance.
        video_id: UUID of the video.
        project_id: UUID of the project.

    Returns:
        Dictionary with extraction results.
    """
    video_uuid = UUID(video_id)

    try:
        logger.info(f"Starting embedding extraction for video {video_id}")

        # Get Supabase client
        client = get_supabase_client()

        # Get all frames for the video
        # Note: get_frames has pagination, we need all frames
        all_frames: list[Frame] = []
        skip = 0
        limit = 1000

        while True:
            batch = get_frames(client, video_uuid, skip=skip, limit=limit)
            if not batch:
                break
            all_frames.extend(batch)
            if len(batch) < limit:
                break
            skip += limit

        if not all_frames:
            logger.warning(f"No frames found for video {video_id}")
            return {
                "video_id": video_id,
                "frame_count": 0,
                "status": "no_frames",
            }

        logger.info(f"Processing {len(all_frames)} frames for video {video_id}")

        # Process frames in batches
        total_processed = 0

        for frame_batch in batched(all_frames, EMBEDDING_BATCH_SIZE):
            batch_list = list(frame_batch)
            processed = process_frame_batch(client, batch_list)
            total_processed += processed
            logger.debug(
                f"Processed batch: {processed}/{len(batch_list)} frames "
                f"(total: {total_processed}/{len(all_frames)})"
            )

        logger.info(
            f"Embedding extraction completed for video {video_id}: "
            f"{total_processed}/{len(all_frames)} frames processed"
        )

        return {
            "video_id": video_id,
            "frame_count": total_processed,
            "total_frames": len(all_frames),
            "status": "success",
        }

    except Exception as e:
        logger.exception(f"Embedding extraction failed for video {video_id}: {e}")

        # Retry on transient errors
        raise self.retry(exc=e) from e
