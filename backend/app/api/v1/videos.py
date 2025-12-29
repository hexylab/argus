"""Video API endpoints."""

import contextlib
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from supabase import Client

from app.api.deps import Auth
from app.core.storage import (
    DEFAULT_PRESIGNED_URL_EXPIRES_IN,
    delete_object,
    generate_presigned_upload_url,
    generate_s3_key,
)
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.crud.video import VideoNotFoundError
from app.crud.video import create_video as crud_create_video
from app.crud.video import delete_video as crud_delete_video
from app.crud.video import get_video as crud_get_video
from app.crud.video import get_videos as crud_get_videos
from app.crud.video import update_video as crud_update_video
from app.models.video import Video, VideoCreate, VideoStatus, VideoUpdate

router = APIRouter(prefix="/projects/{project_id}/videos", tags=["videos"])


class UploadUrlRequest(BaseModel):
    """Request body for getting an upload URL."""

    filename: str = Field(..., min_length=1, max_length=255)
    mime_type: str | None = Field(None, max_length=100)


class UploadUrlResponse(BaseModel):
    """Response containing the presigned upload URL."""

    video_id: UUID
    upload_url: str
    s3_key: str
    expires_in: int = Field(description="URL expiration time in seconds")


class UploadCompleteRequest(BaseModel):
    """Request body for marking an upload as complete."""

    file_size: int | None = Field(None, ge=0, description="File size in bytes")


def _verify_project_ownership(client: Client, project_id: UUID, owner_id: UUID) -> None:
    """Verify that the user owns the project."""
    try:
        crud_get_project(client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e


@router.post("/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    project_id: UUID,
    data: UploadUrlRequest,
    auth: Auth,
) -> UploadUrlResponse:
    """
    Get a presigned URL for uploading a video.

    This endpoint:
    1. Creates a video record in the database with status 'uploading'
    2. Generates a presigned S3 URL for direct upload
    3. Returns the URL and video ID

    The client should then:
    1. Upload the file directly to S3 using the presigned URL
    2. Call POST /videos/{video_id}/complete when done
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Generate video ID and S3 key
    video_id = uuid4()
    s3_key = generate_s3_key(project_id, video_id, data.filename)

    # Create video record in database
    video_data = VideoCreate(
        project_id=project_id,
        filename=data.filename,
        original_filename=data.filename,
        s3_key=s3_key,
        mime_type=data.mime_type,
    )
    video = crud_create_video(auth.client, video_data)

    # Generate presigned URL
    upload_url = generate_presigned_upload_url(
        s3_key=s3_key,
        content_type=data.mime_type,
        expires_in=DEFAULT_PRESIGNED_URL_EXPIRES_IN,
    )

    return UploadUrlResponse(
        video_id=video.id,
        upload_url=upload_url,
        s3_key=s3_key,
        expires_in=DEFAULT_PRESIGNED_URL_EXPIRES_IN,
    )


@router.post("/{video_id}/complete", response_model=Video)
async def mark_upload_complete(
    project_id: UUID,
    video_id: UUID,
    data: UploadCompleteRequest,
    auth: Auth,
) -> Video:
    """
    Mark a video upload as complete and start frame extraction.

    This should be called after the file has been uploaded to S3.
    Updates the video status from 'uploading' to 'processing' and
    queues a background task to extract frames.
    """
    # Import here to avoid circular imports
    from app.tasks.frame_extraction import extract_frames

    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    try:
        # Get the video to check current status
        video = crud_get_video(auth.client, video_id, project_id)

        if video.status != VideoStatus.UPLOADING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video is not in uploading state (current: {video.status})",
            )

        # Update video status to processing
        update_data = VideoUpdate(status=VideoStatus.PROCESSING)
        if data.file_size is not None:
            update_data = VideoUpdate(
                status=VideoStatus.PROCESSING, file_size=data.file_size
            )

        updated_video = crud_update_video(
            auth.client, video_id, project_id, update_data
        )

        # Queue frame extraction task
        extract_frames.delay(str(video_id), str(project_id))

        return updated_video

    except VideoNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video {video_id} not found",
        ) from e


@router.get("", response_model=list[Video])
async def list_videos(
    project_id: UUID,
    auth: Auth,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records"),
) -> list[Video]:
    """
    List all videos in a project.

    The user must own the project.
    Results are ordered by creation date (newest first).
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    return crud_get_videos(auth.client, project_id, skip=skip, limit=limit)


@router.get("/{video_id}", response_model=Video)
async def get_video(
    project_id: UUID,
    video_id: UUID,
    auth: Auth,
) -> Video:
    """
    Get a specific video by ID.

    Returns 404 if the video or project does not exist.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    try:
        return crud_get_video(auth.client, video_id, project_id)
    except VideoNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video {video_id} not found",
        ) from e


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    project_id: UUID,
    video_id: UUID,
    auth: Auth,
) -> None:
    """
    Delete a video.

    This also deletes the video file from S3.
    Returns 404 if the video or project does not exist.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    try:
        # Get video to get S3 key
        video = crud_get_video(auth.client, video_id, project_id)

        # Delete from database
        crud_delete_video(auth.client, video_id, project_id)

        # Delete from S3 (best effort, don't fail if S3 delete fails)
        with contextlib.suppress(Exception):
            delete_object(video.s3_key)

    except VideoNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video {video_id} not found",
        ) from e
