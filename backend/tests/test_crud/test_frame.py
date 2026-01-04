"""Tests for frame CRUD operations."""

from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import uuid4

import numpy as np
import pytest

from app.crud.frame import (
    FrameNotFoundError,
    create_frame,
    create_frames_bulk,
    delete_frame,
    delete_frames_by_video,
    get_frame,
    get_frames,
    search_similar_frames,
    update_frame_embedding,
)
from app.models.frame import FrameCreate


class TestCreateFrame:
    """Tests for create_frame."""

    def test_create_minimal(self) -> None:
        """Test creating a frame with minimal data."""
        video_id = uuid4()
        data = FrameCreate(
            video_id=video_id,
            frame_number=0,
            timestamp_ms=0,
            s3_key=f"projects/{uuid4()}/videos/{video_id}/frames/000000.jpg",
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "video_id": str(video_id),
                "frame_number": 0,
                "timestamp_ms": 0,
                "s3_key": data.s3_key,
                "thumbnail_s3_key": None,
                "width": None,
                "height": None,
                "embedding": None,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )

        frame = create_frame(mock_client, data)

        assert frame.frame_number == 0
        assert frame.video_id == video_id
        mock_client.table.assert_called_once_with("frames")

    def test_create_with_all_fields(self) -> None:
        """Test creating a frame with all fields."""
        video_id = uuid4()
        data = FrameCreate(
            video_id=video_id,
            frame_number=10,
            timestamp_ms=10000,
            s3_key=f"projects/{uuid4()}/videos/{video_id}/frames/000010.jpg",
            thumbnail_s3_key=f"projects/{uuid4()}/videos/{video_id}/thumbnails/000010.jpg",
            width=1920,
            height=1080,
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "video_id": str(video_id),
                "frame_number": 10,
                "timestamp_ms": 10000,
                "s3_key": data.s3_key,
                "thumbnail_s3_key": data.thumbnail_s3_key,
                "width": 1920,
                "height": 1080,
                "embedding": None,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )

        frame = create_frame(mock_client, data)

        assert frame.frame_number == 10
        assert frame.timestamp_ms == 10000
        assert frame.width == 1920
        assert frame.height == 1080


class TestCreateFramesBulk:
    """Tests for create_frames_bulk."""

    def test_create_empty_list(self) -> None:
        """Test bulk create with empty list."""
        mock_client = MagicMock()

        frames = create_frames_bulk(mock_client, [])

        assert frames == []
        mock_client.table.assert_not_called()

    def test_create_multiple_frames(self) -> None:
        """Test bulk create with multiple frames."""
        video_id = uuid4()
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        data = [
            FrameCreate(
                video_id=video_id,
                frame_number=i,
                timestamp_ms=i * 1000,
                s3_key=f"projects/{project_id}/videos/{video_id}/frames/{i:06d}.jpg",
            )
            for i in range(3)
        ]

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "video_id": str(video_id),
                "frame_number": i,
                "timestamp_ms": i * 1000,
                "s3_key": f"projects/{project_id}/videos/{video_id}/frames/{i:06d}.jpg",
                "thumbnail_s3_key": None,
                "width": None,
                "height": None,
                "embedding": None,
                "created_at": now,
            }
            for i in range(3)
        ]
        mock_client.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )

        frames = create_frames_bulk(mock_client, data)

        assert len(frames) == 3
        assert frames[0].frame_number == 0
        assert frames[1].frame_number == 1
        assert frames[2].frame_number == 2


class TestGetFrame:
    """Tests for get_frame."""

    def test_get_existing_frame(self) -> None:
        """Test getting an existing frame."""
        frame_id = uuid4()
        video_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(frame_id),
                "video_id": str(video_id),
                "frame_number": 5,
                "timestamp_ms": 5000,
                "s3_key": "test/frame.jpg",
                "thumbnail_s3_key": "test/thumbnail.jpg",
                "width": 1920,
                "height": 1080,
                "embedding": None,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        frame = get_frame(mock_client, frame_id, video_id)

        assert frame.id == frame_id
        assert frame.frame_number == 5

    def test_get_nonexistent_frame(self) -> None:
        """Test getting a frame that doesn't exist."""
        frame_id = uuid4()
        video_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(FrameNotFoundError):
            get_frame(mock_client, frame_id, video_id)


class TestGetFrames:
    """Tests for get_frames."""

    def test_get_frames_empty(self) -> None:
        """Test getting frames when none exist."""
        video_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        frames = get_frames(mock_client, video_id)

        assert frames == []

    def test_get_frames_with_data(self) -> None:
        """Test getting frames when some exist."""
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "video_id": str(video_id),
                "frame_number": i,
                "timestamp_ms": i * 1000,
                "s3_key": f"test/frame_{i}.jpg",
                "thumbnail_s3_key": None,
                "width": None,
                "height": None,
                "embedding": None,
                "created_at": now,
            }
            for i in range(5)
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        frames = get_frames(mock_client, video_id)

        assert len(frames) == 5
        assert frames[0].frame_number == 0
        assert frames[4].frame_number == 4

    def test_get_frames_with_pagination(self) -> None:
        """Test getting frames with pagination."""
        video_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        get_frames(mock_client, video_id, skip=10, limit=5)

        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.assert_called_once_with(
            10, 14
        )


class TestDeleteFrame:
    """Tests for delete_frame."""

    def test_delete_existing_frame(self) -> None:
        """Test deleting an existing frame."""
        frame_id = uuid4()
        video_id = uuid4()

        mock_client = MagicMock()
        # Mock for get_frame (existence check)
        mock_select_result = MagicMock()
        mock_select_result.data = [
            {
                "id": str(frame_id),
                "video_id": str(video_id),
                "frame_number": 0,
                "timestamp_ms": 0,
                "s3_key": "test/frame.jpg",
                "thumbnail_s3_key": None,
                "width": None,
                "height": None,
                "embedding": None,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_select_result

        # Mock for delete
        mock_delete_result = MagicMock()
        mock_delete_result.data = []
        mock_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = mock_delete_result

        result = delete_frame(mock_client, frame_id, video_id)

        assert result is True
        mock_client.table.return_value.delete.assert_called_once()

    def test_delete_nonexistent_frame(self) -> None:
        """Test deleting a frame that doesn't exist."""
        frame_id = uuid4()
        video_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(FrameNotFoundError):
            delete_frame(mock_client, frame_id, video_id)


class TestDeleteFramesByVideo:
    """Tests for delete_frames_by_video."""

    def test_delete_all_frames_for_video(self) -> None:
        """Test deleting all frames for a video."""
        video_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [{"id": str(uuid4())} for _ in range(5)]
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_result

        count = delete_frames_by_video(mock_client, video_id)

        assert count == 5

    def test_delete_no_frames(self) -> None:
        """Test deleting frames when none exist."""
        video_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_result

        count = delete_frames_by_video(mock_client, video_id)

        assert count == 0


class TestSearchSimilarFrames:
    """Tests for search_similar_frames."""

    def test_search_returns_results(self) -> None:
        """Test searching for similar frames returns results."""
        project_id = uuid4()
        frame_id_1 = uuid4()
        frame_id_2 = uuid4()
        video_id = uuid4()

        # Create a 768-dimension query embedding
        query_embedding = np.random.randn(768).astype(np.float32)

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "frame_id": str(frame_id_1),
                "video_id": str(video_id),
                "frame_number": 10,
                "s3_key": "test/frame_10.jpg",
                "similarity": 0.95,
            },
            {
                "frame_id": str(frame_id_2),
                "video_id": str(video_id),
                "frame_number": 25,
                "s3_key": "test/frame_25.jpg",
                "similarity": 0.87,
            },
        ]
        mock_client.rpc.return_value.execute.return_value = mock_result

        results = search_similar_frames(
            mock_client, query_embedding, project_id, limit=10
        )

        assert len(results) == 2
        assert results[0].frame_id == frame_id_1
        assert results[0].similarity == 0.95
        assert results[1].frame_id == frame_id_2
        assert results[1].similarity == 0.87

        # Verify RPC was called with correct parameters
        mock_client.rpc.assert_called_once_with(
            "search_similar_frames",
            {
                "query_embedding": query_embedding.tolist(),
                "project_id_filter": str(project_id),
                "limit_count": 10,
            },
        )

    def test_search_empty_results(self) -> None:
        """Test searching when no similar frames found."""
        project_id = uuid4()
        query_embedding = np.random.randn(768).astype(np.float32)

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.rpc.return_value.execute.return_value = mock_result

        results = search_similar_frames(mock_client, query_embedding, project_id)

        assert results == []

    def test_search_default_limit(self) -> None:
        """Test that default limit of 100 is used."""
        project_id = uuid4()
        query_embedding = np.random.randn(768).astype(np.float32)

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.rpc.return_value.execute.return_value = mock_result

        search_similar_frames(mock_client, query_embedding, project_id)

        # Check the limit_count in the RPC call
        call_args = mock_client.rpc.call_args
        assert call_args[0][1]["limit_count"] == 100


class TestUpdateFrameEmbedding:
    """Tests for update_frame_embedding."""

    def test_update_embedding(self) -> None:
        """Test updating a frame's embedding."""
        frame_id = uuid4()
        embedding = np.random.randn(768).astype(np.float32)

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [{"id": str(frame_id)}]
        mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_result

        update_frame_embedding(mock_client, frame_id, embedding)

        # Verify update was called with embedding as list
        mock_client.table.assert_called_once_with("frames")
        mock_client.table.return_value.update.assert_called_once()
        update_call_args = mock_client.table.return_value.update.call_args
        assert "embedding" in update_call_args[0][0]
        assert update_call_args[0][0]["embedding"] == embedding.tolist()

    def test_update_embedding_converts_numpy_to_list(self) -> None:
        """Test that numpy array is converted to list for JSON serialization."""
        frame_id = uuid4()
        embedding = np.array([0.1, 0.2, 0.3], dtype=np.float32)

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_result

        update_frame_embedding(mock_client, frame_id, embedding)

        update_call_args = mock_client.table.return_value.update.call_args
        embedding_value = update_call_args[0][0]["embedding"]

        # Should be a list, not a numpy array
        assert isinstance(embedding_value, list)
        assert len(embedding_value) == 3
        # Use approximate comparison due to float32 precision
        np.testing.assert_allclose(embedding_value, [0.1, 0.2, 0.3], rtol=1e-6)
