"""Frame extraction task for video processing."""

import logging
import shutil
import tempfile
from pathlib import Path
from typing import Any
from uuid import UUID

import ffmpeg
import jwt
from celery import Task
from PIL import Image
from supabase import create_client

from app.celery import celery_app
from app.core.config import get_settings
from app.core.storage import (
    download_object,
    generate_frame_s3_key,
    generate_thumbnail_s3_key,
    upload_object,
)
from app.crud.frame import create_frames_bulk
from app.crud.video import VideoNotFoundError, get_video, update_video
from app.models.frame import FrameCreate
from app.models.video import VideoStatus, VideoUpdate

logger = logging.getLogger(__name__)

# Thumbnail size (width x height)
THUMBNAIL_SIZE = (320, 180)

# Frame extraction interval in seconds
FRAME_INTERVAL_SECONDS = 1.0


def generate_service_role_jwt() -> str:
    """Generate a service_role JWT for bypassing RLS.

    This JWT has the same structure as Supabase's service_role key,
    allowing the worker to bypass Row Level Security policies.
    """
    settings = get_settings()
    payload = {
        "role": "service_role",
        "iss": "supabase",
        "iat": 0,  # Issued at epoch (never expires effectively)
        "exp": 9999999999,  # Far future expiration
    }
    return jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")


def get_supabase_client() -> Any:
    """Get Supabase client for worker tasks.

    Uses a generated service_role JWT to bypass RLS.
    """
    settings = get_settings()
    service_role_key = generate_service_role_jwt()
    return create_client(settings.supabase_url, service_role_key)


def get_video_info(video_path: Path) -> dict[str, Any]:
    """
    Get video metadata using ffprobe.

    Args:
        video_path: Path to the video file.

    Returns:
        Dictionary with video info (duration, width, height, fps).
    """
    probe = ffmpeg.probe(str(video_path))
    video_stream = next(
        (s for s in probe["streams"] if s["codec_type"] == "video"),
        None,
    )

    if not video_stream:
        raise ValueError("No video stream found")

    # Parse frame rate (e.g., "30/1" or "29.97")
    fps_str = video_stream.get("r_frame_rate", "30/1")
    if "/" in fps_str:
        num, denom = fps_str.split("/")
        fps = float(num) / float(denom)
    else:
        fps = float(fps_str)

    return {
        "duration": float(probe["format"].get("duration", 0)),
        "width": int(video_stream.get("width", 0)),
        "height": int(video_stream.get("height", 0)),
        "fps": fps,
    }


def extract_frames_from_video(
    video_path: Path,
    output_dir: Path,
    interval_seconds: float = FRAME_INTERVAL_SECONDS,
) -> list[dict[str, Any]]:
    """
    Extract frames from video at specified interval.

    Args:
        video_path: Path to the video file.
        output_dir: Directory to save extracted frames.
        interval_seconds: Interval between frames in seconds.

    Returns:
        List of dicts with frame_number, timestamp_ms, and local_path.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    video_info = get_video_info(video_path)
    duration = video_info["duration"]

    frames: list[dict[str, Any]] = []
    frame_number = 0
    timestamp = 0.0

    while timestamp < duration:
        output_path = output_dir / f"{frame_number:06d}.jpg"

        # Extract single frame at timestamp
        (
            ffmpeg.input(str(video_path), ss=timestamp)
            .output(str(output_path), vframes=1, format="image2", vcodec="mjpeg")
            .overwrite_output()
            .run(quiet=True)
        )

        if output_path.exists():
            frames.append(
                {
                    "frame_number": frame_number,
                    "timestamp_ms": int(timestamp * 1000),
                    "local_path": output_path,
                    "width": video_info["width"],
                    "height": video_info["height"],
                }
            )

        frame_number += 1
        timestamp += interval_seconds

    return frames


def create_thumbnail(
    frame_path: Path,
    thumbnail_path: Path,
    size: tuple[int, int] = THUMBNAIL_SIZE,
) -> None:
    """
    Create a thumbnail from a frame image.

    Args:
        frame_path: Path to the source frame image.
        thumbnail_path: Path to save the thumbnail.
        size: Thumbnail size (width, height).
    """
    thumbnail_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(frame_path) as img:
        # Use LANCZOS for high-quality downsampling
        img.thumbnail(size, Image.Resampling.LANCZOS)
        img.save(thumbnail_path, "JPEG", quality=85)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)  # type: ignore[untyped-decorator]
def extract_frames(
    self: Task,
    video_id: str,
    project_id: str,
) -> dict[str, Any]:
    """
    Extract frames from an uploaded video.

    This task:
    1. Downloads the video from S3
    2. Extracts frames at 1-second intervals using FFmpeg
    3. Creates thumbnails for each frame
    4. Uploads frames and thumbnails to S3
    5. Registers frame metadata in the database
    6. Updates video status to 'ready' (or 'failed' on error)

    Args:
        self: Celery task instance.
        video_id: UUID of the video.
        project_id: UUID of the project.

    Returns:
        Dictionary with extraction results.
    """
    video_uuid = UUID(video_id)
    project_uuid = UUID(project_id)
    temp_dir = None

    try:
        logger.info(f"Starting frame extraction for video {video_id}")

        # Get Supabase client
        client = get_supabase_client()

        # Get video metadata
        try:
            video = get_video(client, video_uuid, project_uuid)
        except VideoNotFoundError:
            logger.error(f"Video {video_id} not found")
            raise

        # Create temporary directory for processing
        temp_dir = Path(tempfile.mkdtemp(prefix="argus_frames_"))
        video_path = temp_dir / "video"
        frames_dir = temp_dir / "frames"
        thumbnails_dir = temp_dir / "thumbnails"

        # Download video from S3
        logger.info(f"Downloading video from S3: {video.s3_key}")
        download_object(video.s3_key, video_path)

        # Get video info for metadata update
        video_info = get_video_info(video_path)

        # Extract frames
        logger.info("Extracting frames from video")
        extracted_frames = extract_frames_from_video(
            video_path,
            frames_dir,
            FRAME_INTERVAL_SECONDS,
        )

        logger.info(f"Extracted {len(extracted_frames)} frames")

        # Process each frame: create thumbnail and upload to S3
        frame_creates: list[FrameCreate] = []

        for frame_data in extracted_frames:
            frame_number = frame_data["frame_number"]
            frame_path = frame_data["local_path"]

            # Generate S3 keys
            frame_s3_key = generate_frame_s3_key(project_uuid, video_uuid, frame_number)
            thumbnail_s3_key = generate_thumbnail_s3_key(
                project_uuid, video_uuid, frame_number
            )

            # Create thumbnail
            thumbnail_path = thumbnails_dir / f"{frame_number:06d}.jpg"
            create_thumbnail(frame_path, thumbnail_path)

            # Upload frame and thumbnail to S3
            upload_object(frame_path, frame_s3_key, "image/jpeg")
            upload_object(thumbnail_path, thumbnail_s3_key, "image/jpeg")

            # Prepare frame creation data
            frame_creates.append(
                FrameCreate(
                    video_id=video_uuid,
                    frame_number=frame_number,
                    timestamp_ms=frame_data["timestamp_ms"],
                    s3_key=frame_s3_key,
                    thumbnail_s3_key=thumbnail_s3_key,
                    width=frame_data["width"],
                    height=frame_data["height"],
                )
            )

        # Bulk insert frames to database
        logger.info(f"Inserting {len(frame_creates)} frames to database")
        created_frames = create_frames_bulk(client, frame_creates)

        # Update video metadata and status
        update_video(
            client,
            video_uuid,
            project_uuid,
            VideoUpdate(
                status=VideoStatus.READY,
                duration_seconds=video_info["duration"],
                width=video_info["width"],
                height=video_info["height"],
                fps=video_info["fps"],
                frame_count=len(created_frames),
            ),
        )

        logger.info(f"Frame extraction completed for video {video_id}")

        # Queue embedding extraction task on GPU worker
        from app.tasks.embedding_extraction import extract_embeddings

        extract_embeddings.delay(video_id, project_id)
        logger.info(f"Queued embedding extraction for video {video_id}")

        return {
            "video_id": video_id,
            "frame_count": len(created_frames),
            "status": "success",
        }

    except Exception as e:
        logger.exception(f"Frame extraction failed for video {video_id}: {e}")

        # Update video status to failed
        try:
            client = get_supabase_client()
            update_video(
                client,
                video_uuid,
                project_uuid,
                VideoUpdate(
                    status=VideoStatus.FAILED,
                    error_message=str(e)[:500],  # Truncate long error messages
                ),
            )
        except Exception as update_error:
            logger.error(f"Failed to update video status: {update_error}")

        # Retry on transient errors
        raise self.retry(exc=e) from e

    finally:
        # Clean up temporary directory
        if temp_dir and temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
