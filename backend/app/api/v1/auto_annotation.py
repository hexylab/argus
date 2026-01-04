"""Auto-annotation API endpoints."""

from typing import Any
from uuid import UUID

from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import Auth
from app.celery import celery_app
from app.crud.label import LabelNotFoundError, get_label
from app.crud.project import ProjectNotFoundError, get_project

router = APIRouter(
    prefix="/projects/{project_id}/auto-annotate",
    tags=["auto-annotation"],
)


class AutoAnnotateOptions(BaseModel):
    """Options for auto-annotation."""

    min_confidence: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold (0-1)",
    )


class AutoAnnotateRequest(BaseModel):
    """Request body for starting auto-annotation."""

    frame_ids: list[UUID] = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="List of frame IDs to annotate",
    )
    label_id: UUID = Field(..., description="Label ID to apply")
    options: AutoAnnotateOptions | None = Field(
        default=None,
        description="Optional annotation settings",
    )


class AutoAnnotateResponse(BaseModel):
    """Response for auto-annotation task submission."""

    task_id: str = Field(..., description="Celery task ID")
    status: str = Field(..., description="Task status")
    total_frames: int = Field(..., description="Number of frames to process")


class TaskStatusResponse(BaseModel):
    """Response for task status query."""

    task_id: str = Field(..., description="Celery task ID")
    status: str = Field(
        ..., description="Task status (PENDING, STARTED, SUCCESS, FAILURE)"
    )
    result: dict[str, Any] | None = Field(
        default=None,
        description="Task result (available when status is SUCCESS)",
    )
    error: str | None = Field(
        default=None,
        description="Error message (available when status is FAILURE)",
    )


def _verify_project_ownership(
    client: Any,
    project_id: UUID,
    owner_id: UUID,
) -> None:
    """Verify that the user owns the project."""
    try:
        get_project(client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e


@router.post("", response_model=AutoAnnotateResponse)
async def start_auto_annotation(
    project_id: UUID,
    data: AutoAnnotateRequest,
    auth: Auth,
) -> AutoAnnotateResponse:
    """
    Start auto-annotation for the specified frames.

    This endpoint queues an auto-annotation task that uses SAM 3 to
    automatically detect objects matching the label name in each frame.

    The task runs asynchronously. Use GET /auto-annotate/{task_id} to
    check the progress and results.
    """
    from app.tasks.auto_annotation import auto_annotate_frames

    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Verify label exists and belongs to this project
    try:
        label = get_label(auth.client, data.label_id, project_id)
    except LabelNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label {data.label_id} not found",
        ) from e

    # Get options
    options = data.options or AutoAnnotateOptions()

    # Queue the task
    task = auto_annotate_frames.delay(
        frame_ids=[str(fid) for fid in data.frame_ids],
        label_id=str(data.label_id),
        label_name=label.name,
        created_by=str(owner_id),
        confidence_threshold=options.min_confidence,
    )

    return AutoAnnotateResponse(
        task_id=task.id,
        status="PENDING",
        total_frames=len(data.frame_ids),
    )


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    project_id: UUID,
    task_id: str,
    auth: Auth,
) -> TaskStatusResponse:
    """
    Get the status of an auto-annotation task.

    Returns the current status and results (if completed) of the task.

    Status values:
    - PENDING: Task is waiting to be processed
    - STARTED: Task is currently being processed
    - SUCCESS: Task completed successfully
    - FAILURE: Task failed with an error
    - RETRY: Task is being retried after a failure
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Get task result
    result = AsyncResult(task_id, app=celery_app)

    response = TaskStatusResponse(
        task_id=task_id,
        status=result.status,
    )

    if result.successful():
        response.result = result.result
    elif result.failed():
        response.error = str(result.result) if result.result else "Unknown error"

    return response
