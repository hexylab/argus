"""Annotation API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from supabase import Client

from app.api.deps import Auth
from app.crud.annotation import AnnotationNotFoundError
from app.crud.annotation import bulk_create_annotations as crud_bulk_create
from app.crud.annotation import create_annotation as crud_create_annotation
from app.crud.annotation import delete_annotation as crud_delete_annotation
from app.crud.annotation import delete_annotations_by_frame as crud_delete_by_frame
from app.crud.annotation import get_annotation as crud_get_annotation
from app.crud.annotation import get_annotations as crud_get_annotations
from app.crud.annotation import update_annotation as crud_update_annotation
from app.crud.frame import FrameNotFoundError
from app.crud.frame import get_frame as crud_get_frame
from app.crud.label import LabelNotFoundError
from app.crud.label import get_label as crud_get_label
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.crud.video import VideoNotFoundError
from app.crud.video import get_video as crud_get_video
from app.models.annotation import (
    Annotation,
    AnnotationBulkSaveRequest,
    AnnotationCreate,
    AnnotationCreateRequest,
    AnnotationUpdate,
)

router = APIRouter(
    prefix="/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations",
    tags=["annotations"],
)


def _verify_project_ownership(client: Client, project_id: UUID, owner_id: UUID) -> None:
    """Verify that the user owns the project."""
    try:
        crud_get_project(client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e


def _verify_video_in_project(client: Client, video_id: UUID, project_id: UUID) -> None:
    """Verify that the video belongs to the project."""
    try:
        crud_get_video(client, video_id, project_id)
    except VideoNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video {video_id} not found",
        ) from e


def _verify_frame_in_video(client: Client, frame_id: UUID, video_id: UUID) -> None:
    """Verify that the frame belongs to the video."""
    try:
        crud_get_frame(client, frame_id, video_id)
    except FrameNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Frame {frame_id} not found",
        ) from e


def _verify_label_in_project(client: Client, label_id: UUID, project_id: UUID) -> None:
    """Verify that the label belongs to the project."""
    try:
        crud_get_label(client, label_id, project_id)
    except LabelNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Label {label_id} not found in project",
        ) from e


@router.post("", response_model=Annotation, status_code=status.HTTP_201_CREATED)
async def create_annotation(
    project_id: UUID,
    video_id: UUID,
    frame_id: UUID,
    data: AnnotationCreateRequest,
    auth: Auth,
) -> Annotation:
    """
    Create a new annotation on a frame.

    The user must own the project.
    The label must belong to the same project.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Verify video exists in project
    _verify_video_in_project(auth.client, video_id, project_id)

    # Verify frame exists in video
    _verify_frame_in_video(auth.client, frame_id, video_id)

    # Verify label exists in project
    _verify_label_in_project(auth.client, data.label_id, project_id)

    # Build AnnotationCreate with frame_id and created_by
    create_data = AnnotationCreate(
        frame_id=frame_id,
        label_id=data.label_id,
        bbox_x=data.bbox_x,
        bbox_y=data.bbox_y,
        bbox_width=data.bbox_width,
        bbox_height=data.bbox_height,
        segmentation=data.segmentation,
        confidence=data.confidence,
        source=data.source,
        reviewed=data.reviewed,
        created_by=owner_id,
    )

    return crud_create_annotation(auth.client, create_data)


@router.get("", response_model=list[Annotation])
async def list_annotations(
    project_id: UUID,
    video_id: UUID,
    frame_id: UUID,
    auth: Auth,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records"),
) -> list[Annotation]:
    """
    List all annotations for a frame.

    The user must own the project.
    Results are ordered by creation date.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Verify video exists in project
    _verify_video_in_project(auth.client, video_id, project_id)

    # Verify frame exists in video
    _verify_frame_in_video(auth.client, frame_id, video_id)

    return crud_get_annotations(auth.client, frame_id, skip=skip, limit=limit)


@router.get("/{annotation_id}", response_model=Annotation)
async def get_annotation(
    project_id: UUID,
    video_id: UUID,
    frame_id: UUID,
    annotation_id: UUID,
    auth: Auth,
) -> Annotation:
    """
    Get a specific annotation by ID.

    Returns 404 if the annotation or project does not exist.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Verify video exists in project
    _verify_video_in_project(auth.client, video_id, project_id)

    # Verify frame exists in video
    _verify_frame_in_video(auth.client, frame_id, video_id)

    try:
        return crud_get_annotation(auth.client, annotation_id, frame_id)
    except AnnotationNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation {annotation_id} not found",
        ) from e


@router.patch("/{annotation_id}", response_model=Annotation)
async def update_annotation(
    project_id: UUID,
    video_id: UUID,
    frame_id: UUID,
    annotation_id: UUID,
    data: AnnotationUpdate,
    auth: Auth,
) -> Annotation:
    """
    Update an annotation.

    Only the fields provided will be updated.
    Returns 404 if the annotation or project does not exist.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Verify video exists in project
    _verify_video_in_project(auth.client, video_id, project_id)

    # Verify frame exists in video
    _verify_frame_in_video(auth.client, frame_id, video_id)

    # If label_id is being updated, verify it exists in project
    if data.label_id is not None:
        _verify_label_in_project(auth.client, data.label_id, project_id)

    try:
        return crud_update_annotation(auth.client, annotation_id, frame_id, data)
    except AnnotationNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation {annotation_id} not found",
        ) from e


@router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_annotation(
    project_id: UUID,
    video_id: UUID,
    frame_id: UUID,
    annotation_id: UUID,
    auth: Auth,
) -> None:
    """
    Delete an annotation.

    Returns 404 if the annotation or project does not exist.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Verify video exists in project
    _verify_video_in_project(auth.client, video_id, project_id)

    # Verify frame exists in video
    _verify_frame_in_video(auth.client, frame_id, video_id)

    try:
        crud_delete_annotation(auth.client, annotation_id, frame_id)
    except AnnotationNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation {annotation_id} not found",
        ) from e


@router.put("", response_model=list[Annotation])
async def bulk_save_annotations(
    project_id: UUID,
    video_id: UUID,
    frame_id: UUID,
    data: AnnotationBulkSaveRequest,
    auth: Auth,
) -> list[Annotation]:
    """
    Bulk save annotations for a frame.

    This operation replaces all existing annotations for the frame.
    All annotations are deleted first, then new ones are created.

    The user must own the project.
    All labels must belong to the same project.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Verify video exists in project
    _verify_video_in_project(auth.client, video_id, project_id)

    # Verify frame exists in video
    _verify_frame_in_video(auth.client, frame_id, video_id)

    # Verify all labels exist in project
    for annotation in data.annotations:
        _verify_label_in_project(auth.client, annotation.label_id, project_id)

    # Delete all existing annotations for this frame
    crud_delete_by_frame(auth.client, frame_id)

    # Create new annotations
    if not data.annotations:
        return []

    create_data_list = [
        AnnotationCreate(
            frame_id=frame_id,
            label_id=ann.label_id,
            bbox_x=ann.bbox_x,
            bbox_y=ann.bbox_y,
            bbox_width=ann.bbox_width,
            bbox_height=ann.bbox_height,
            segmentation=ann.segmentation,
            confidence=ann.confidence,
            source=ann.source,
            reviewed=ann.reviewed,
            created_by=owner_id,
        )
        for ann in data.annotations
    ]

    return crud_bulk_create(auth.client, create_data_list)
