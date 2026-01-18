"""Search API endpoints for semantic frame search."""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from supabase import Client

from app.api.deps import Auth
from app.core.storage import generate_presigned_download_url
from app.crud.frame import search_similar_frames
from app.crud.project import ProjectNotFoundError
from app.crud.project import get_project as crud_get_project
from app.crud.video import VideoNotFoundError
from app.crud.video import get_video as crud_get_video

logger = logging.getLogger(__name__)

# Timeout for text embedding extraction (seconds)
TEXT_EMBEDDING_TIMEOUT = 60


def _extract_text_embedding(query: str) -> list[float]:
    """Extract text embedding using SigLIP 2 via Celery task.

    This function sends the query to the siglip-worker (GPU) for processing
    and waits for the result synchronously.

    Args:
        query: Text query to extract embedding for.

    Returns:
        List of floats representing the text embedding.

    Raises:
        HTTPException: If embedding extraction fails or times out.
    """
    from app.tasks.embedding_extraction import extract_text_embedding

    try:
        # Call Celery task synchronously with timeout
        result = extract_text_embedding.apply_async(args=[query])
        embedding: list[float] = result.get(timeout=TEXT_EMBEDDING_TIMEOUT)
        return embedding
    except TimeoutError as e:
        logger.error(f"Text embedding extraction timed out for query: {query}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Text embedding extraction timed out",
        ) from e
    except Exception as e:
        logger.exception(f"Text embedding extraction failed for query: {query}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract text embedding",
        ) from e


router = APIRouter(
    prefix="/projects/{project_id}/search",
    tags=["search"],
)


class SearchRequest(BaseModel):
    """Request body for frame search."""

    query: str = Field(..., min_length=1, max_length=500, description="Text query")
    video_id: UUID | None = Field(None, description="Filter by specific video")
    limit: int = Field(100, ge=1, le=500, description="Maximum results to return")
    offset: int = Field(0, ge=0, description="Number of results to skip")
    min_similarity: float = Field(
        0.0, ge=-1.0, le=1.0, description="Minimum similarity threshold"
    )


class SearchResultItem(BaseModel):
    """Single search result item."""

    frame_id: UUID
    video_id: UUID
    frame_number: int
    similarity: float
    s3_key: str
    thumbnail_url: str | None = None


class SearchResponse(BaseModel):
    """Response for frame search."""

    results: list[SearchResultItem]
    total: int
    has_more: bool


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
    """Verify that the video exists in the project."""
    try:
        crud_get_video(client, video_id, project_id)
    except VideoNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video {video_id} not found in project",
        ) from e


@router.post("", response_model=SearchResponse)
async def search_frames(
    project_id: UUID,
    request: SearchRequest,
    auth: Auth,
) -> SearchResponse:
    """
    Search for frames similar to a text query.

    Uses SigLIP 2 embeddings and pgvector for semantic similarity search.
    Results are ordered by similarity score (descending).

    The user must own the project to search within it.
    """
    owner_id = UUID(auth.user.sub)

    # Verify project ownership
    _verify_project_ownership(auth.client, project_id, owner_id)

    # Verify video exists if filtering by video
    if request.video_id:
        _verify_video_in_project(auth.client, request.video_id, project_id)

    # Extract text embedding from query
    query_embedding = _extract_text_embedding(request.query)

    # Search for similar frames
    # Get more results than needed for filtering and pagination
    max_results = request.offset + request.limit + 100
    all_results = search_similar_frames(
        auth.client,
        query_embedding,
        project_id,
        limit=max_results,
    )

    # Apply filters
    filtered_results = all_results

    # Filter by video_id if specified
    if request.video_id:
        filtered_results = [
            r for r in filtered_results if r.video_id == request.video_id
        ]

    # Filter by min_similarity
    if request.min_similarity > -1.0:
        filtered_results = [
            r for r in filtered_results if r.similarity >= request.min_similarity
        ]

    # Calculate total before pagination
    total = len(filtered_results)

    # Apply pagination
    paginated_results = filtered_results[
        request.offset : request.offset + request.limit
    ]

    # Build response with thumbnail URLs
    results = []
    for r in paginated_results:
        # Generate thumbnail URL from s3_key
        # Thumbnail key pattern: replace /frames/ with /thumbnails/
        thumbnail_s3_key = r.s3_key.replace("/frames/", "/thumbnails/")
        thumbnail_url = generate_presigned_download_url(thumbnail_s3_key)

        results.append(
            SearchResultItem(
                frame_id=r.frame_id,
                video_id=r.video_id,
                frame_number=r.frame_number,
                similarity=r.similarity,
                s3_key=r.s3_key,
                thumbnail_url=thumbnail_url,
            )
        )

    return SearchResponse(
        results=results,
        total=total,
        has_more=request.offset + request.limit < total,
    )
