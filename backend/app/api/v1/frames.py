"""Frame API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from supabase import Client

from app.api.deps import Auth
from app.core.storage import generate_presigned_download_url
from app.crud.frame import get_frames as crud_get_frames
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.crud.video import VideoNotFoundError
from app.crud.video import get_video as crud_get_video
from app.models.frame import Frame

router = APIRouter(
    prefix="/projects/{project_id}/videos/{video_id}/frames",
    tags=["frames"],
)


class FrameResponse(BaseModel):
    """Frame response with thumbnail URL."""

    id: UUID
    video_id: UUID
    frame_number: int = Field(..., ge=0)
    timestamp_ms: int = Field(..., ge=0)
    s3_key: str
    thumbnail_s3_key: str | None = None
    thumbnail_url: str | None = None
    width: int | None = None
    height: int | None = None
    created_at: str


def _verify_project_ownership(client: Client, project_id: UUID, owner_id: UUID) -> None:
    """Verify that the user owns the project."""
    try:
        crud_get_project(client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e


def _verify_video_exists(client: Client, video_id: UUID, project_id: UUID) -> None:
    """Verify that the video exists in the project."""
    try:
        crud_get_video(client, video_id, project_id)
    except VideoNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video {video_id} not found",
        ) from e


def _frame_to_response(frame: Frame) -> FrameResponse:
    """Convert Frame model to FrameResponse with thumbnail URL."""
    thumbnail_url = None
    if frame.thumbnail_s3_key:
        thumbnail_url = generate_presigned_download_url(frame.thumbnail_s3_key)

    return FrameResponse(
        id=frame.id,
        video_id=frame.video_id,
        frame_number=frame.frame_number,
        timestamp_ms=frame.timestamp_ms,
        s3_key=frame.s3_key,
        thumbnail_s3_key=frame.thumbnail_s3_key,
        thumbnail_url=thumbnail_url,
        width=frame.width,
        height=frame.height,
        created_at=frame.created_at.isoformat(),
    )


@router.get("", response_model=list[FrameResponse])
async def list_frames(
    project_id: UUID,
    video_id: UUID,
    auth: Auth,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records"),
) -> list[FrameResponse]:
    """
    List all frames for a video.

    Returns frames with presigned thumbnail URLs for display.
    The user must own the project.
    Results are ordered by frame number (ascending).
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Verify video exists in project
    _verify_video_exists(auth.client, video_id, project_id)

    frames = crud_get_frames(auth.client, video_id, skip=skip, limit=limit)

    return [_frame_to_response(frame) for frame in frames]
