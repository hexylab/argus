"""Tests for embedding extraction task."""

import io
import sys
from datetime import UTC, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

import numpy as np
import pytest
from PIL import Image


@pytest.fixture
def mock_siglip_module():
    """Fixture to mock the siglip embeddings module for tests.

    This is needed because torch is not available in the test environment
    and the module is imported lazily inside functions.
    """
    mock_module = MagicMock()
    mock_module.extract_image_embeddings = MagicMock()

    # Store original module if it exists
    original = sys.modules.get("app.ml.siglip.embeddings")

    # Replace with mock
    sys.modules["app.ml.siglip.embeddings"] = mock_module

    yield mock_module

    # Restore original
    if original is not None:
        sys.modules["app.ml.siglip.embeddings"] = original
    else:
        sys.modules.pop("app.ml.siglip.embeddings", None)


class TestDownloadAndOpenImage:
    """Tests for download_and_open_image helper function."""

    @patch("app.tasks.embedding_extraction.download_object_bytes")
    def test_download_and_open_image(self, mock_download: MagicMock) -> None:
        """Test downloading and opening image from S3."""
        from app.tasks.embedding_extraction import download_and_open_image

        # Create a test image in memory
        test_image = Image.new("RGB", (100, 100), color="red")
        img_bytes = io.BytesIO()
        test_image.save(img_bytes, format="JPEG")
        mock_download.return_value = img_bytes.getvalue()

        result = download_and_open_image("test/frame.jpg")

        assert isinstance(result, Image.Image)
        assert result.mode == "RGB"
        assert result.size == (100, 100)
        mock_download.assert_called_once_with("test/frame.jpg")


class TestProcessFrameBatch:
    """Tests for process_frame_batch helper function."""

    @patch("app.tasks.embedding_extraction.update_frame_embedding")
    @patch("app.tasks.embedding_extraction.download_and_open_image")
    def test_process_batch_success(
        self,
        mock_download: MagicMock,
        mock_update: MagicMock,
        mock_siglip_module: MagicMock,
    ) -> None:
        """Test processing a batch of frames successfully."""
        from app.models.frame import Frame
        from app.tasks.embedding_extraction import process_frame_batch

        # Setup mock frames
        frame1 = Frame(
            id=uuid4(),
            video_id=uuid4(),
            frame_number=0,
            timestamp_ms=0,
            s3_key="test/frame_0.jpg",
            thumbnail_s3_key=None,
            width=100,
            height=100,
            embedding=None,
            created_at=datetime.now(tz=UTC),
        )
        frame2 = Frame(
            id=uuid4(),
            video_id=uuid4(),
            frame_number=1,
            timestamp_ms=1000,
            s3_key="test/frame_1.jpg",
            thumbnail_s3_key=None,
            width=100,
            height=100,
            embedding=None,
            created_at=datetime.now(tz=UTC),
        )

        # Setup mocks
        mock_image = MagicMock(spec=Image.Image)
        mock_download.return_value = mock_image
        mock_siglip_module.extract_image_embeddings.return_value = np.random.randn(
            2, 768
        ).astype(np.float32)

        mock_client = MagicMock()

        # Execute
        result = process_frame_batch(mock_client, [frame1, frame2])

        # Verify
        assert result == 2
        assert mock_download.call_count == 2
        assert mock_siglip_module.extract_image_embeddings.call_count == 1
        assert mock_update.call_count == 2

    def test_process_batch_empty(self) -> None:
        """Test processing empty batch."""
        from app.tasks.embedding_extraction import process_frame_batch

        mock_client = MagicMock()

        result = process_frame_batch(mock_client, [])

        assert result == 0

    @patch("app.tasks.embedding_extraction.update_frame_embedding")
    @patch("app.tasks.embedding_extraction.download_and_open_image")
    def test_process_batch_partial_failure(
        self,
        mock_download: MagicMock,
        mock_update: MagicMock,
        mock_siglip_module: MagicMock,
    ) -> None:
        """Test processing batch with some download failures."""
        from app.models.frame import Frame
        from app.tasks.embedding_extraction import process_frame_batch

        frame1 = Frame(
            id=uuid4(),
            video_id=uuid4(),
            frame_number=0,
            timestamp_ms=0,
            s3_key="test/frame_0.jpg",
            thumbnail_s3_key=None,
            width=100,
            height=100,
            embedding=None,
            created_at=datetime.now(tz=UTC),
        )
        frame2 = Frame(
            id=uuid4(),
            video_id=uuid4(),
            frame_number=1,
            timestamp_ms=1000,
            s3_key="test/frame_1.jpg",
            thumbnail_s3_key=None,
            width=100,
            height=100,
            embedding=None,
            created_at=datetime.now(tz=UTC),
        )

        # First download succeeds, second fails
        mock_image = MagicMock(spec=Image.Image)
        mock_download.side_effect = [mock_image, Exception("Download failed")]
        mock_siglip_module.extract_image_embeddings.return_value = np.random.randn(
            1, 768
        ).astype(np.float32)

        mock_client = MagicMock()

        result = process_frame_batch(mock_client, [frame1, frame2])

        # Only 1 frame should be processed
        assert result == 1
        assert mock_update.call_count == 1


class TestExtractEmbeddingsTask:
    """Tests for extract_embeddings Celery task."""

    @patch("app.tasks.embedding_extraction.process_frame_batch")
    @patch("app.tasks.embedding_extraction.get_frames")
    @patch("app.tasks.embedding_extraction.get_supabase_client")
    def test_extract_embeddings_success(
        self,
        mock_get_client: MagicMock,
        mock_get_frames: MagicMock,
        mock_process_batch: MagicMock,
    ) -> None:
        """Test successful embedding extraction."""
        from app.models.frame import Frame
        from app.tasks.embedding_extraction import extract_embeddings

        video_id = str(uuid4())
        project_id = str(uuid4())

        # Setup mock frames
        frames = [
            Frame(
                id=uuid4(),
                video_id=uuid4(),
                frame_number=i,
                timestamp_ms=i * 1000,
                s3_key=f"test/frame_{i}.jpg",
                thumbnail_s3_key=None,
                width=100,
                height=100,
                embedding=None,
                created_at=datetime.now(tz=UTC),
            )
            for i in range(3)
        ]

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_get_frames.return_value = frames
        mock_process_batch.return_value = 3

        # Execute (without Celery context)
        result = extract_embeddings.run(video_id, project_id)

        assert result["status"] == "success"
        assert result["frame_count"] == 3
        assert result["total_frames"] == 3

    @patch("app.tasks.embedding_extraction.get_frames")
    @patch("app.tasks.embedding_extraction.get_supabase_client")
    def test_extract_embeddings_no_frames(
        self,
        mock_get_client: MagicMock,
        mock_get_frames: MagicMock,
    ) -> None:
        """Test extraction when no frames exist."""
        from app.tasks.embedding_extraction import extract_embeddings

        video_id = str(uuid4())
        project_id = str(uuid4())

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_get_frames.return_value = []

        result = extract_embeddings.run(video_id, project_id)

        assert result["status"] == "no_frames"
        assert result["frame_count"] == 0

    @patch("app.tasks.embedding_extraction.process_frame_batch")
    @patch("app.tasks.embedding_extraction.get_frames")
    @patch("app.tasks.embedding_extraction.get_supabase_client")
    def test_extract_embeddings_batching(
        self,
        mock_get_client: MagicMock,
        mock_get_frames: MagicMock,
        mock_process_batch: MagicMock,
    ) -> None:
        """Test that frames are processed in batches."""
        from app.models.frame import Frame
        from app.tasks.embedding_extraction import (
            EMBEDDING_BATCH_SIZE,
            extract_embeddings,
        )

        video_id = str(uuid4())
        project_id = str(uuid4())

        # Create more frames than batch size
        num_frames = EMBEDDING_BATCH_SIZE * 2 + 3
        frames = [
            Frame(
                id=uuid4(),
                video_id=uuid4(),
                frame_number=i,
                timestamp_ms=i * 1000,
                s3_key=f"test/frame_{i}.jpg",
                thumbnail_s3_key=None,
                width=100,
                height=100,
                embedding=None,
                created_at=datetime.now(tz=UTC),
            )
            for i in range(num_frames)
        ]

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_get_frames.return_value = frames
        mock_process_batch.return_value = EMBEDDING_BATCH_SIZE

        result = extract_embeddings.run(video_id, project_id)

        # Should have called process_batch 3 times (2 full batches + 1 partial)
        assert mock_process_batch.call_count == 3
        assert result["total_frames"] == num_frames


class TestEmbeddingBatchSize:
    """Tests for embedding batch size configuration."""

    def test_batch_size_configured(self) -> None:
        """Test that batch size is properly configured."""
        from app.tasks.embedding_extraction import EMBEDDING_BATCH_SIZE

        assert EMBEDDING_BATCH_SIZE > 0
        assert EMBEDDING_BATCH_SIZE <= 16  # Reasonable GPU memory limit
