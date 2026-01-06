"""Import API endpoints for dataset import functionality."""

from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, status
from supabase import Client

from app.api.deps import Auth
from app.core.storage import (
    DEFAULT_PRESIGNED_URL_EXPIRES_IN,
    generate_import_s3_key,
    generate_presigned_upload_url,
)
from app.crud.import_job import ImportJobNotFoundError
from app.crud.import_job import create_import_job as crud_create_import_job
from app.crud.import_job import get_import_job as crud_get_import_job
from app.crud.import_job import get_import_jobs as crud_get_import_jobs
from app.crud.import_job import update_import_job as crud_update_import_job
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.models.import_job import (
    ImportJob,
    ImportJobCreate,
    ImportJobUpdate,
    ImportPreviewResponse,
    ImportStatus,
    ImportUploadUrlRequest,
    ImportUploadUrlResponse,
    StartImportRequest,
)

router = APIRouter(prefix="/projects/{project_id}/imports", tags=["imports"])


def _verify_project_ownership(client: Client, project_id: UUID, owner_id: UUID) -> None:
    """Verify that the user owns the project."""
    try:
        crud_get_project(client, project_id, owner_id)
    except ProjectNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        ) from e


@router.post("/upload-url", response_model=ImportUploadUrlResponse)
async def get_import_upload_url(
    project_id: UUID,
    data: ImportUploadUrlRequest,
    auth: Auth,
) -> ImportUploadUrlResponse:
    """
    Get a presigned URL for uploading an import ZIP file.

    This endpoint:
    1. Creates an import job record in the database with status 'pending'
    2. Generates a presigned S3 URL for direct upload
    3. Returns the URL and import job ID

    The client should then:
    1. Upload the ZIP file directly to S3 using the presigned URL
    2. Call POST /imports/{import_job_id}/preview to preview the contents
    3. Call POST /imports/{import_job_id}/start to start the import
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Generate import job ID and S3 key
    import_job_id = uuid4()
    s3_key = generate_import_s3_key(project_id, import_job_id, data.filename)

    # Create import job record in database
    import_job_data = ImportJobCreate(
        project_id=project_id,
        format=data.format,
        s3_key=s3_key,
        created_by=owner_id,
    )
    import_job = crud_create_import_job(auth.client, import_job_data)

    # Generate presigned URL for ZIP file upload
    upload_url = generate_presigned_upload_url(
        s3_key=s3_key,
        content_type="application/zip",
        expires_in=DEFAULT_PRESIGNED_URL_EXPIRES_IN,
    )

    return ImportUploadUrlResponse(
        import_job_id=import_job.id,
        upload_url=upload_url,
        s3_key=s3_key,
    )


@router.post("/{import_job_id}/preview", response_model=ImportPreviewResponse)
async def preview_import(
    project_id: UUID,
    import_job_id: UUID,
    auth: Auth,
) -> ImportPreviewResponse:
    """
    Preview the contents of an uploaded import ZIP file.

    Returns the detected format, number of images, labels found,
    and sample images for preview.
    """
    # Import here to avoid circular imports
    from app.tasks.import_dataset import preview_import_zip

    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    try:
        import_job = crud_get_import_job(auth.client, import_job_id, project_id)

        if import_job.status != ImportStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Import job is not in pending state (current: {import_job.status})",
            )

        if not import_job.s3_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Import job has no S3 key",
            )

        # Preview the ZIP file (synchronous for now, could be async later)
        preview_result = preview_import_zip(import_job.s3_key, import_job.format)

        return preview_result

    except ImportJobNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Import job {import_job_id} not found",
        ) from e


@router.post("/{import_job_id}/start", response_model=ImportJob)
async def start_import(
    project_id: UUID,
    import_job_id: UUID,
    data: StartImportRequest,
    auth: Auth,
) -> ImportJob:
    """
    Start the import processing.

    This should be called after previewing the import contents.
    Updates the import job status from 'pending' to 'processing' and
    queues a background task to process the import.

    Args:
        label_mapping: Optional mapping of external label names to internal label IDs.
                      If not provided, new labels will be created automatically.
        name: Optional name for the created image set.
    """
    # Import here to avoid circular imports
    from app.tasks.import_dataset import process_import

    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    try:
        import_job = crud_get_import_job(auth.client, import_job_id, project_id)

        if import_job.status != ImportStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Import job is not in pending state (current: {import_job.status})",
            )

        # Update import job with label mapping and status
        update_data = ImportJobUpdate(
            status=ImportStatus.PROCESSING,
            label_mapping=data.label_mapping,
        )
        updated_job = crud_update_import_job(
            auth.client, import_job_id, project_id, update_data
        )

        # Queue import processing task
        process_import.delay(
            str(import_job_id),
            str(project_id),
            str(owner_id),
            data.name,
        )

        return updated_job

    except ImportJobNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Import job {import_job_id} not found",
        ) from e


@router.get("/{import_job_id}", response_model=ImportJob)
async def get_import_status(
    project_id: UUID,
    import_job_id: UUID,
    auth: Auth,
) -> ImportJob:
    """
    Get the status of an import job.

    Returns the current status, progress, and any error message.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    try:
        return crud_get_import_job(auth.client, import_job_id, project_id)
    except ImportJobNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Import job {import_job_id} not found",
        ) from e


@router.get("", response_model=list[ImportJob])
async def list_import_jobs(
    project_id: UUID,
    auth: Auth,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records"),
) -> list[ImportJob]:
    """
    List all import jobs for a project.

    Results are ordered by creation date (newest first).
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    return crud_get_import_jobs(auth.client, project_id, skip=skip, limit=limit)
