"""Tests for video CRUD operations."""

from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.crud.video import (
    VideoNotFoundError,
    create_video,
    delete_video,
    get_video,
    get_videos,
    update_video,
)
from app.models.video import VideoCreate, VideoStatus, VideoUpdate


class TestCreateVideo:
    """Tests for create_video."""

    def test_create_minimal(self) -> None:
        """Test creating a video with minimal data."""
        project_id = uuid4()
        data = VideoCreate(
            project_id=project_id,
            filename="test.mp4",
            original_filename="test.mp4",
            s3_key=f"projects/{project_id}/videos/{uuid4()}/test.mp4",
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "filename": "test.mp4",
                "original_filename": "test.mp4",
                "s3_key": data.s3_key,
                "mime_type": None,
                "file_size": None,
                "duration_seconds": None,
                "width": None,
                "height": None,
                "fps": None,
                "frame_count": None,
                "status": "uploading",
                "error_message": None,
                "metadata": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )

        video = create_video(mock_client, data)

        assert video.filename == "test.mp4"
        assert video.project_id == project_id
        assert video.status == VideoStatus.UPLOADING
        mock_client.table.assert_called_once_with("videos")

    def test_create_with_all_fields(self) -> None:
        """Test creating a video with all fields."""
        project_id = uuid4()
        data = VideoCreate(
            project_id=project_id,
            filename="full_video.mp4",
            original_filename="full_video.mp4",
            s3_key=f"projects/{project_id}/videos/{uuid4()}/full_video.mp4",
            mime_type="video/mp4",
            file_size=1000000,
            metadata={"codec": "h264"},
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "filename": "full_video.mp4",
                "original_filename": "full_video.mp4",
                "s3_key": data.s3_key,
                "mime_type": "video/mp4",
                "file_size": 1000000,
                "duration_seconds": None,
                "width": None,
                "height": None,
                "fps": None,
                "frame_count": None,
                "status": "uploading",
                "error_message": None,
                "metadata": {"codec": "h264"},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )

        video = create_video(mock_client, data)

        assert video.filename == "full_video.mp4"
        assert video.mime_type == "video/mp4"
        assert video.file_size == 1000000


class TestGetVideo:
    """Tests for get_video."""

    def test_get_existing_video(self) -> None:
        """Test getting an existing video."""
        video_id = uuid4()
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(video_id),
                "project_id": str(project_id),
                "filename": "existing.mp4",
                "original_filename": "existing.mp4",
                "s3_key": "test/key.mp4",
                "mime_type": "video/mp4",
                "file_size": None,
                "duration_seconds": None,
                "width": None,
                "height": None,
                "fps": None,
                "frame_count": None,
                "status": "ready",
                "error_message": None,
                "metadata": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        video = get_video(mock_client, video_id, project_id)

        assert video.id == video_id
        assert video.filename == "existing.mp4"

    def test_get_nonexistent_video(self) -> None:
        """Test getting a video that doesn't exist."""
        video_id = uuid4()
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(VideoNotFoundError):
            get_video(mock_client, video_id, project_id)


class TestGetVideos:
    """Tests for get_videos."""

    def test_get_videos_empty(self) -> None:
        """Test getting videos when none exist."""
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        videos = get_videos(mock_client, project_id)

        assert videos == []

    def test_get_videos_with_data(self) -> None:
        """Test getting videos when some exist."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "filename": "video1.mp4",
                "original_filename": "video1.mp4",
                "s3_key": "test/key1.mp4",
                "mime_type": "video/mp4",
                "file_size": None,
                "duration_seconds": None,
                "width": None,
                "height": None,
                "fps": None,
                "frame_count": None,
                "status": "ready",
                "error_message": None,
                "metadata": {},
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "filename": "video2.mp4",
                "original_filename": "video2.mp4",
                "s3_key": "test/key2.mp4",
                "mime_type": "video/mp4",
                "file_size": None,
                "duration_seconds": None,
                "width": None,
                "height": None,
                "fps": None,
                "frame_count": None,
                "status": "uploading",
                "error_message": None,
                "metadata": {},
                "created_at": now,
                "updated_at": now,
            },
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        videos = get_videos(mock_client, project_id)

        assert len(videos) == 2
        assert videos[0].filename == "video1.mp4"
        assert videos[1].filename == "video2.mp4"

    def test_get_videos_with_pagination(self) -> None:
        """Test getting videos with pagination."""
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        get_videos(mock_client, project_id, skip=10, limit=5)

        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.assert_called_once_with(
            10, 14
        )


class TestUpdateVideo:
    """Tests for update_video."""

    def test_update_status(self) -> None:
        """Test updating video status."""
        video_id = uuid4()
        project_id = uuid4()
        data = VideoUpdate(status=VideoStatus.READY)

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(video_id),
                "project_id": str(project_id),
                "filename": "test.mp4",
                "original_filename": "test.mp4",
                "s3_key": "test/key.mp4",
                "mime_type": "video/mp4",
                "file_size": None,
                "duration_seconds": None,
                "width": None,
                "height": None,
                "fps": None,
                "frame_count": None,
                "status": "ready",
                "error_message": None,
                "metadata": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        video = update_video(mock_client, video_id, project_id, data)

        assert video.status == VideoStatus.READY

    def test_update_file_size(self) -> None:
        """Test updating video file size."""
        video_id = uuid4()
        project_id = uuid4()
        data = VideoUpdate(file_size=5000000)

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(video_id),
                "project_id": str(project_id),
                "filename": "test.mp4",
                "original_filename": "test.mp4",
                "s3_key": "test/key.mp4",
                "mime_type": "video/mp4",
                "file_size": 5000000,
                "duration_seconds": None,
                "width": None,
                "height": None,
                "fps": None,
                "frame_count": None,
                "status": "ready",
                "error_message": None,
                "metadata": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        video = update_video(mock_client, video_id, project_id, data)

        assert video.file_size == 5000000

    def test_update_nonexistent_video(self) -> None:
        """Test updating a video that doesn't exist."""
        video_id = uuid4()
        project_id = uuid4()
        data = VideoUpdate(status=VideoStatus.READY)

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(VideoNotFoundError):
            update_video(mock_client, video_id, project_id, data)

    def test_update_empty_returns_existing(self) -> None:
        """Test that empty update returns existing video."""
        video_id = uuid4()
        project_id = uuid4()
        data = VideoUpdate()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(video_id),
                "project_id": str(project_id),
                "filename": "existing.mp4",
                "original_filename": "existing.mp4",
                "s3_key": "test/key.mp4",
                "mime_type": "video/mp4",
                "file_size": None,
                "duration_seconds": None,
                "width": None,
                "height": None,
                "fps": None,
                "frame_count": None,
                "status": "ready",
                "error_message": None,
                "metadata": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        video = update_video(mock_client, video_id, project_id, data)

        assert video.filename == "existing.mp4"
        # Should not call update, only select
        mock_client.table.return_value.update.assert_not_called()


class TestDeleteVideo:
    """Tests for delete_video."""

    def test_delete_existing_video(self) -> None:
        """Test deleting an existing video."""
        video_id = uuid4()
        project_id = uuid4()

        mock_client = MagicMock()
        # Mock for get_video (existence check)
        mock_select_result = MagicMock()
        mock_select_result.data = [
            {
                "id": str(video_id),
                "project_id": str(project_id),
                "filename": "to_delete.mp4",
                "original_filename": "to_delete.mp4",
                "s3_key": "test/key.mp4",
                "mime_type": "video/mp4",
                "file_size": None,
                "duration_seconds": None,
                "width": None,
                "height": None,
                "fps": None,
                "frame_count": None,
                "status": "ready",
                "error_message": None,
                "metadata": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_select_result

        # Mock for delete
        mock_delete_result = MagicMock()
        mock_delete_result.data = []
        mock_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = mock_delete_result

        result = delete_video(mock_client, video_id, project_id)

        assert result is True
        mock_client.table.return_value.delete.assert_called_once()

    def test_delete_nonexistent_video(self) -> None:
        """Test deleting a video that doesn't exist."""
        video_id = uuid4()
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(VideoNotFoundError):
            delete_video(mock_client, video_id, project_id)
