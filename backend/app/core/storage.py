"""S3/MinIO storage client for video uploads."""

from functools import lru_cache
from pathlib import Path
from uuid import UUID

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from mypy_boto3_s3 import S3Client

from app.core.config import get_settings

# Default presigned URL expiration (1 hour)
DEFAULT_PRESIGNED_URL_EXPIRES_IN = 3600


@lru_cache
def get_storage_client() -> S3Client:
    """Get cached S3/MinIO client instance."""
    settings = get_settings()

    # Configure boto3 for MinIO compatibility
    s3_config = Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},
    )

    endpoint_url = (
        f"{'https' if settings.minio_use_ssl else 'http'}://{settings.minio_endpoint}"
    )

    client: S3Client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        config=s3_config,
    )

    return client


def generate_s3_key(project_id: UUID, video_id: UUID, filename: str) -> str:
    """
    Generate S3 object key for a video file.

    Args:
        project_id: UUID of the project.
        video_id: UUID of the video.
        filename: Original filename.

    Returns:
        S3 object key in format: projects/{project_id}/videos/{video_id}/{filename}
    """
    return f"projects/{project_id}/videos/{video_id}/{filename}"


def generate_presigned_upload_url(
    s3_key: str,
    content_type: str | None = None,
    expires_in: int = DEFAULT_PRESIGNED_URL_EXPIRES_IN,
) -> str:
    """
    Generate a presigned URL for uploading a file to S3.

    Args:
        s3_key: The S3 object key.
        content_type: MIME type of the file.
        expires_in: URL expiration time in seconds.

    Returns:
        Presigned URL for PUT upload.
    """
    settings = get_settings()
    client = get_storage_client()

    params: dict[str, str] = {
        "Bucket": settings.minio_bucket,
        "Key": s3_key,
    }

    if content_type:
        params["ContentType"] = content_type

    url: str = client.generate_presigned_url(
        "put_object",
        Params=params,
        ExpiresIn=expires_in,
    )

    return url


def generate_presigned_download_url(
    s3_key: str,
    expires_in: int = DEFAULT_PRESIGNED_URL_EXPIRES_IN,
) -> str:
    """
    Generate a presigned URL for downloading a file from S3.

    Args:
        s3_key: The S3 object key.
        expires_in: URL expiration time in seconds.

    Returns:
        Presigned URL for GET download.
    """
    settings = get_settings()
    client = get_storage_client()

    url: str = client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.minio_bucket,
            "Key": s3_key,
        },
        ExpiresIn=expires_in,
    )

    return url


def delete_object(s3_key: str) -> None:
    """
    Delete an object from S3.

    Args:
        s3_key: The S3 object key to delete.
    """
    settings = get_settings()
    client = get_storage_client()

    client.delete_object(
        Bucket=settings.minio_bucket,
        Key=s3_key,
    )


def check_object_exists(s3_key: str) -> bool:
    """
    Check if an object exists in S3.

    Args:
        s3_key: The S3 object key.

    Returns:
        True if the object exists, False otherwise.
    """
    settings = get_settings()
    client = get_storage_client()

    try:
        client.head_object(
            Bucket=settings.minio_bucket,
            Key=s3_key,
        )
        return True
    except ClientError:
        return False


def download_object(s3_key: str, local_path: Path) -> None:
    """
    Download an object from S3 to a local file.

    Args:
        s3_key: The S3 object key.
        local_path: Local file path to save the object.
    """
    settings = get_settings()
    client = get_storage_client()

    # Ensure parent directory exists
    local_path.parent.mkdir(parents=True, exist_ok=True)

    client.download_file(
        Bucket=settings.minio_bucket,
        Key=s3_key,
        Filename=str(local_path),
    )


def upload_object(
    local_path: Path,
    s3_key: str,
    content_type: str | None = None,
) -> None:
    """
    Upload a local file to S3.

    Args:
        local_path: Local file path to upload.
        s3_key: The S3 object key.
        content_type: MIME type of the file.
    """
    settings = get_settings()
    client = get_storage_client()

    extra_args: dict[str, str] = {}
    if content_type:
        extra_args["ContentType"] = content_type

    client.upload_file(
        Filename=str(local_path),
        Bucket=settings.minio_bucket,
        Key=s3_key,
        ExtraArgs=extra_args if extra_args else None,
    )


def generate_frame_s3_key(
    project_id: UUID,
    video_id: UUID,
    frame_number: int,
) -> str:
    """
    Generate S3 object key for a frame image.

    Args:
        project_id: UUID of the project.
        video_id: UUID of the video.
        frame_number: Frame number (0-indexed).

    Returns:
        S3 object key for the frame.
    """
    return f"projects/{project_id}/videos/{video_id}/frames/{frame_number:06d}.jpg"


def generate_thumbnail_s3_key(
    project_id: UUID,
    video_id: UUID,
    frame_number: int,
) -> str:
    """
    Generate S3 object key for a thumbnail image.

    Args:
        project_id: UUID of the project.
        video_id: UUID of the video.
        frame_number: Frame number (0-indexed).

    Returns:
        S3 object key for the thumbnail.
    """
    return f"projects/{project_id}/videos/{video_id}/thumbnails/{frame_number:06d}.jpg"
