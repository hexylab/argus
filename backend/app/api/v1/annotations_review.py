"""Annotation review API endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import Auth
from app.core.storage import generate_presigned_download_url
from app.crud.annotation import (
    bulk_approve_annotations as crud_bulk_approve,
)
from app.crud.annotation import (
    bulk_delete_annotations as crud_bulk_delete,
)
from app.crud.annotation import (
    get_project_annotation_stats as crud_get_stats,
)
from app.crud.annotation import (
    get_project_annotations as crud_get_annotations,
)
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.models.annotation import (
    AnnotationReviewStats,
    AnnotationSource,
    AnnotationWithFrame,
    BulkApproveRequest,
    BulkApproveResponse,
    BulkDeleteRequest,
    BulkDeleteResponse,
)

router = APIRouter(
    prefix="/projects/{project_id}/annotations",
    tags=["annotation-review"],
)


class AnnotationWithFrameResponse(BaseModel):
    """Annotation with frame information and presigned URLs for review."""

    id: UUID
    frame_id: UUID
    label_id: UUID
    bbox_x: float
    bbox_y: float
    bbox_width: float
    bbox_height: float
    segmentation: list[list[float]] | None = None
    confidence: float | None = None
    source: AnnotationSource
    reviewed: bool
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    created_by: UUID
    created_at: datetime
    # Frame info
    frame_number: int
    frame_s3_key: str
    frame_thumbnail_s3_key: str | None = None
    frame_thumbnail_url: str | None = None
    frame_image_url: str | None = None
    video_id: UUID
    # Label info
    label_name: str
    label_color: str


def _annotation_to_response(
    annotation: AnnotationWithFrame,
) -> AnnotationWithFrameResponse:
    """Convert AnnotationWithFrame to response with presigned URLs."""
    thumbnail_url = None
    if annotation.frame_thumbnail_s3_key:
        thumbnail_url = generate_presigned_download_url(
            annotation.frame_thumbnail_s3_key
        )

    image_url = generate_presigned_download_url(annotation.frame_s3_key)

    return AnnotationWithFrameResponse(
        id=annotation.id,
        frame_id=annotation.frame_id,
        label_id=annotation.label_id,
        bbox_x=annotation.bbox_x,
        bbox_y=annotation.bbox_y,
        bbox_width=annotation.bbox_width,
        bbox_height=annotation.bbox_height,
        segmentation=annotation.segmentation,
        confidence=annotation.confidence,
        source=annotation.source,
        reviewed=annotation.reviewed,
        reviewed_by=annotation.reviewed_by,
        reviewed_at=annotation.reviewed_at,
        created_by=annotation.created_by,
        created_at=annotation.created_at,
        frame_number=annotation.frame_number,
        frame_s3_key=annotation.frame_s3_key,
        frame_thumbnail_s3_key=annotation.frame_thumbnail_s3_key,
        frame_thumbnail_url=thumbnail_url,
        frame_image_url=image_url,
        video_id=annotation.video_id,
        label_name=annotation.label_name,
        label_color=annotation.label_color,
    )


def _verify_project_ownership(
    client: Auth,
    project_id: UUID,
    owner_id: UUID,
) -> None:
    """Verify that the user owns the project."""
    try:
        crud_get_project(client.client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e


@router.get("", response_model=list[AnnotationWithFrameResponse])
async def list_project_annotations(
    project_id: UUID,
    auth: Auth,
    source: AnnotationSource | None = Query(
        None, description="Filter by annotation source"
    ),
    reviewed: bool | None = Query(None, description="Filter by reviewed status"),
    min_confidence: float | None = Query(
        None, ge=0, le=1, description="Minimum confidence threshold"
    ),
    max_confidence: float | None = Query(
        None, ge=0, le=1, description="Maximum confidence threshold"
    ),
    label_id: UUID | None = Query(None, description="Filter by label ID"),
    video_id: UUID | None = Query(None, description="Filter by video ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records"),
) -> list[AnnotationWithFrameResponse]:
    """
    List all annotations for a project with filtering options.

    The user must own the project.
    Results are ordered by confidence (low to high for easy review).
    Returns presigned URLs for frame images.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth, project_id, owner_id)

    annotations = crud_get_annotations(
        auth.client,
        project_id,
        source=source,
        reviewed=reviewed,
        min_confidence=min_confidence,
        max_confidence=max_confidence,
        label_id=label_id,
        video_id=video_id,
        skip=skip,
        limit=limit,
    )

    return [_annotation_to_response(a) for a in annotations]


@router.get("/stats", response_model=AnnotationReviewStats)
async def get_annotation_stats(
    project_id: UUID,
    auth: Auth,
) -> AnnotationReviewStats:
    """
    Get annotation statistics for a project.

    Returns counts for total, reviewed, pending, auto, and manual annotations.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth, project_id, owner_id)

    return crud_get_stats(auth.client, project_id)


@router.post("/bulk-approve", response_model=BulkApproveResponse)
async def bulk_approve_annotations(
    project_id: UUID,
    data: BulkApproveRequest,
    auth: Auth,
) -> BulkApproveResponse:
    """
    Bulk approve annotations.

    Marks all specified annotations as reviewed.
    The user must own the project containing these annotations.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth, project_id, owner_id)

    approved_count = crud_bulk_approve(
        auth.client,
        data.annotation_ids,
        owner_id,
    )

    return BulkApproveResponse(approved_count=approved_count)


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_annotations(
    project_id: UUID,
    data: BulkDeleteRequest,
    auth: Auth,
) -> BulkDeleteResponse:
    """
    Bulk delete annotations.

    Permanently deletes all specified annotations.
    The user must own the project containing these annotations.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth, project_id, owner_id)

    deleted_count = crud_bulk_delete(
        auth.client,
        data.annotation_ids,
    )

    return BulkDeleteResponse(deleted_count=deleted_count)
