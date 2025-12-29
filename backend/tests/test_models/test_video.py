"""Tests for Video models."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.video import (
    Video,
    VideoCreate,
    VideoMetadata,
    VideoStatus,
    VideoUpdate,
)


class TestVideoStatus:
    """Tests for VideoStatus enum."""

    def test_values(self) -> None:
        """Test enum values."""
        assert VideoStatus.UPLOADING.value == "uploading"
        assert VideoStatus.PROCESSING.value == "processing"
        assert VideoStatus.READY.value == "ready"
        assert VideoStatus.FAILED.value == "failed"


class TestVideoMetadata:
    """Tests for VideoMetadata."""

    def test_defaults(self) -> None:
        """Test default values."""
        meta = VideoMetadata()
        assert meta.codec is None
        assert meta.bitrate is None

    def test_with_values(self) -> None:
        """Test with values."""
        meta = VideoMetadata(codec="h264", bitrate=5000000)
        assert meta.codec == "h264"
        assert meta.bitrate == 5000000

    def test_extra_allowed(self) -> None:
        """Test extra fields are allowed."""
        meta = VideoMetadata(custom_field="value")  # type: ignore[call-arg]
        assert meta.custom_field == "value"  # type: ignore[attr-defined]


class TestVideo:
    """Tests for Video model."""

    def test_full_video(self) -> None:
        """Test Video with all fields."""
        now = datetime.now(tz=UTC)
        video = Video(
            id=uuid4(),
            project_id=uuid4(),
            filename="video_001.mp4",
            original_filename="my_video.mp4",
            s3_key="projects/123/videos/video_001.mp4",
            mime_type="video/mp4",
            file_size=1024000,
            duration_seconds=120.5,
            width=1920,
            height=1080,
            fps=30.0,
            frame_count=3615,
            status=VideoStatus.READY,
            created_at=now,
            updated_at=now,
        )
        assert video.filename == "video_001.mp4"
        assert video.status == VideoStatus.READY

    def test_minimal_video(self) -> None:
        """Test Video with minimal fields."""
        now = datetime.now(tz=UTC)
        video = Video(
            id=uuid4(),
            project_id=uuid4(),
            filename="video.mp4",
            original_filename="orig.mp4",
            s3_key="videos/v.mp4",
            mime_type=None,
            file_size=None,
            duration_seconds=None,
            width=None,
            height=None,
            fps=None,
            frame_count=None,
            created_at=now,
            updated_at=now,
        )
        assert video.status == VideoStatus.UPLOADING
        assert video.file_size is None


class TestVideoCreate:
    """Tests for VideoCreate schema."""

    def test_minimal_create(self) -> None:
        """Test minimal create."""
        create = VideoCreate(
            project_id=uuid4(),
            filename="video.mp4",
            original_filename="orig.mp4",
            s3_key="videos/v.mp4",
            mime_type=None,
            file_size=None,
            metadata=None,
        )
        assert create.filename == "video.mp4"

    def test_full_create(self) -> None:
        """Test full create."""
        create = VideoCreate(
            project_id=uuid4(),
            filename="video.mp4",
            original_filename="orig.mp4",
            s3_key="videos/v.mp4",
            mime_type="video/mp4",
            file_size=1024000,
            metadata={"codec": "h264"},
        )
        assert create.mime_type == "video/mp4"

    def test_required_fields(self) -> None:
        """Test required fields."""
        with pytest.raises(ValidationError):
            VideoCreate(
                project_id=uuid4(),
                filename="video.mp4",
                original_filename="orig.mp4",
                s3_key=None,  # type: ignore[arg-type]
                mime_type=None,
                file_size=None,
                metadata=None,
            )  # missing s3_key

    def test_file_size_non_negative(self) -> None:
        """Test file_size must be non-negative."""
        with pytest.raises(ValidationError):
            VideoCreate(
                project_id=uuid4(),
                filename="video.mp4",
                original_filename="orig.mp4",
                s3_key="videos/v.mp4",
                mime_type=None,
                file_size=-1,
                metadata=None,
            )


class TestVideoUpdate:
    """Tests for VideoUpdate schema."""

    def test_status_update(self) -> None:
        """Test status update."""
        update = VideoUpdate(
            filename=None,
            duration_seconds=None,
            width=None,
            height=None,
            fps=None,
            frame_count=None,
            status=VideoStatus.READY,
            error_message=None,
            metadata=None,
        )
        assert update.status == VideoStatus.READY

    def test_partial_update(self) -> None:
        """Test partial update."""
        update = VideoUpdate(
            filename=None,
            duration_seconds=120.5,
            width=1920,
            height=1080,
            fps=None,
            frame_count=None,
            status=None,
            error_message=None,
            metadata=None,
        )
        assert update.duration_seconds == 120.5
        assert update.status is None

    def test_empty_update(self) -> None:
        """Test empty update is valid."""
        update = VideoUpdate(
            filename=None,
            duration_seconds=None,
            width=None,
            height=None,
            fps=None,
            frame_count=None,
            status=None,
            error_message=None,
            metadata=None,
        )
        assert update.status is None
        assert update.filename is None
