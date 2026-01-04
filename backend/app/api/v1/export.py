"""Export API endpoints."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import Auth
from app.core.storage import generate_presigned_download_url
from app.crud.frame import get_frames as crud_get_frames
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.crud.video import get_videos as crud_get_videos
from app.services.export.coco import COCOExporter
from app.services.export.yolo import YOLOExporter

router = APIRouter(
    prefix="/projects/{project_id}/export",
    tags=["export"],
)


class ImageExportItem(BaseModel):
    """Single image export item with presigned URL."""

    filename: str
    url: str


class ImagesExportResponse(BaseModel):
    """Response containing all project images with presigned URLs."""

    images: list[ImageExportItem]


@router.get("/coco", response_model=dict[str, Any])
async def export_coco(
    project_id: UUID,
    auth: Auth,
    reviewed_only: bool = Query(
        False, description="If true, only export reviewed annotations"
    ),
) -> dict[str, Any]:
    """
    Export project annotations in COCO format.

    Returns a JSON object containing the COCO format dataset.
    The user must own the project.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    try:
        crud_get_project(auth.client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e

    # Export to COCO format
    exporter = COCOExporter(auth.client)
    return exporter.export_project(project_id, reviewed_only=reviewed_only)


@router.get("/yolo", response_model=dict[str, Any])
async def export_yolo(
    project_id: UUID,
    auth: Auth,
    reviewed_only: bool = Query(
        False, description="If true, only export reviewed annotations"
    ),
) -> dict[str, Any]:
    """
    Export project annotations in YOLO format.

    Returns a JSON object containing:
    - data_yaml: YAML string with class names and count
    - annotations: Dict mapping filename.txt to annotation content

    Each annotation line has format: class_id center_x center_y width height
    All coordinates are normalized (0-1).

    The user must own the project.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    try:
        crud_get_project(auth.client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e

    # Export to YOLO format
    exporter = YOLOExporter(auth.client)
    return exporter.export_project(project_id, reviewed_only=reviewed_only)


@router.get("/images", response_model=ImagesExportResponse)
async def export_images(
    project_id: UUID,
    auth: Auth,
) -> ImagesExportResponse:
    """
    Get presigned URLs for all project images.

    Returns a list of images with their filenames and presigned download URLs.
    Filenames are extracted from the S3 key (last segment).
    The user must own the project.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    try:
        crud_get_project(auth.client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e

    # Get all videos and frames
    images: list[ImageExportItem] = []

    # Fetch all videos (paginated)
    all_videos = []
    skip = 0
    limit = 1000
    while True:
        videos = crud_get_videos(auth.client, project_id, skip=skip, limit=limit)
        if not videos:
            break
        all_videos.extend(videos)
        if len(videos) < limit:
            break
        skip += limit

    # For each video, fetch all frames
    for video in all_videos:
        skip = 0
        while True:
            frames = crud_get_frames(auth.client, video.id, skip=skip, limit=limit)
            if not frames:
                break

            for frame in frames:
                # Extract filename from s3_key
                filename = (
                    frame.s3_key.split("/")[-1] if "/" in frame.s3_key else frame.s3_key
                )
                # Generate presigned URL
                url = generate_presigned_download_url(frame.s3_key)
                images.append(ImageExportItem(filename=filename, url=url))

            if len(frames) < limit:
                break
            skip += limit

    return ImagesExportResponse(images=images)
