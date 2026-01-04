"""Tests for Frame models."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.frame import Frame, FrameCreate, FrameSimilarityResult, FrameUpdate


class TestFrame:
    """Tests for Frame model."""

    def test_full_frame(self) -> None:
        """Test Frame with all fields."""
        now = datetime.now(tz=UTC)
        frame = Frame(
            id=uuid4(),
            video_id=uuid4(),
            frame_number=100,
            timestamp_ms=3333,
            s3_key="frames/f100.jpg",
            thumbnail_s3_key="frames/f100_thumb.jpg",
            width=1920,
            height=1080,
            embedding=[0.1] * 768,
            created_at=now,
        )
        assert frame.frame_number == 100
        assert frame.embedding is not None
        assert len(frame.embedding) == 768

    def test_minimal_frame(self) -> None:
        """Test Frame with minimal fields."""
        now = datetime.now(tz=UTC)
        frame = Frame(
            id=uuid4(),
            video_id=uuid4(),
            frame_number=0,
            timestamp_ms=0,
            s3_key="frames/f0.jpg",
            thumbnail_s3_key=None,
            width=None,
            height=None,
            embedding=None,
            created_at=now,
        )
        assert frame.embedding is None
        assert frame.thumbnail_s3_key is None


class TestFrameCreate:
    """Tests for FrameCreate schema."""

    def test_minimal_create(self) -> None:
        """Test minimal create."""
        create = FrameCreate(
            video_id=uuid4(),
            frame_number=0,
            timestamp_ms=0,
            s3_key="frames/f.jpg",
            thumbnail_s3_key=None,
            width=None,
            height=None,
        )
        assert create.frame_number == 0

    def test_full_create(self) -> None:
        """Test full create."""
        create = FrameCreate(
            video_id=uuid4(),
            frame_number=100,
            timestamp_ms=3333,
            s3_key="frames/f100.jpg",
            thumbnail_s3_key="frames/f100_thumb.jpg",
            width=1920,
            height=1080,
        )
        assert create.frame_number == 100
        assert create.width == 1920

    def test_negative_frame_number(self) -> None:
        """Test frame_number must be non-negative."""
        with pytest.raises(ValidationError):
            FrameCreate(
                video_id=uuid4(),
                frame_number=-1,
                timestamp_ms=0,
                s3_key="frames/f.jpg",
                thumbnail_s3_key=None,
                width=None,
                height=None,
            )

    def test_negative_timestamp(self) -> None:
        """Test timestamp_ms must be non-negative."""
        with pytest.raises(ValidationError):
            FrameCreate(
                video_id=uuid4(),
                frame_number=0,
                timestamp_ms=-1,
                s3_key="frames/f.jpg",
                thumbnail_s3_key=None,
                width=None,
                height=None,
            )


class TestFrameUpdate:
    """Tests for FrameUpdate schema."""

    def test_partial_update(self) -> None:
        """Test partial update."""
        update = FrameUpdate(
            s3_key=None,
            thumbnail_s3_key="frames/thumb.jpg",
            width=1920,
            height=None,
        )
        assert update.thumbnail_s3_key == "frames/thumb.jpg"
        assert update.width == 1920

    def test_empty_update(self) -> None:
        """Test empty update is valid."""
        update = FrameUpdate(
            s3_key=None,
            thumbnail_s3_key=None,
            width=None,
            height=None,
        )
        assert update.s3_key is None
        assert update.width is None


class TestFrameSimilarityResult:
    """Tests for FrameSimilarityResult model."""

    def test_similarity_result(self) -> None:
        """Test similarity search result."""
        result = FrameSimilarityResult(
            frame_id=uuid4(),
            video_id=uuid4(),
            frame_number=50,
            s3_key="frames/f50.jpg",
            similarity=0.95,
        )
        assert result.similarity == 0.95
        assert result.frame_number == 50

    def test_low_similarity(self) -> None:
        """Test result with low similarity score."""
        result = FrameSimilarityResult(
            frame_id=uuid4(),
            video_id=uuid4(),
            frame_number=100,
            s3_key="frames/f100.jpg",
            similarity=0.15,
        )
        assert result.similarity == 0.15
