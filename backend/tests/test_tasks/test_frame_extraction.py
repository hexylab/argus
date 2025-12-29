"""Tests for frame extraction task."""

from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.models.video import VideoStatus


class TestGetVideoInfo:
    """Tests for get_video_info helper function."""

    @patch("app.tasks.frame_extraction.ffmpeg")
    def test_get_video_info(self, mock_ffmpeg: MagicMock) -> None:
        """Test extracting video metadata."""
        from app.tasks.frame_extraction import get_video_info

        mock_ffmpeg.probe.return_value = {
            "format": {"duration": "10.5"},
            "streams": [
                {
                    "codec_type": "video",
                    "width": 1920,
                    "height": 1080,
                    "r_frame_rate": "30/1",
                }
            ],
        }

        info = get_video_info(Path("/tmp/video.mp4"))

        assert info["duration"] == 10.5
        assert info["width"] == 1920
        assert info["height"] == 1080
        assert info["fps"] == 30.0

    @patch("app.tasks.frame_extraction.ffmpeg")
    def test_get_video_info_fractional_fps(self, mock_ffmpeg: MagicMock) -> None:
        """Test extracting video with fractional frame rate."""
        from app.tasks.frame_extraction import get_video_info

        mock_ffmpeg.probe.return_value = {
            "format": {"duration": "60.0"},
            "streams": [
                {
                    "codec_type": "video",
                    "width": 1280,
                    "height": 720,
                    "r_frame_rate": "30000/1001",  # ~29.97 fps
                }
            ],
        }

        info = get_video_info(Path("/tmp/video.mp4"))

        assert abs(info["fps"] - 29.97) < 0.01

    @patch("app.tasks.frame_extraction.ffmpeg")
    def test_get_video_info_no_video_stream(self, mock_ffmpeg: MagicMock) -> None:
        """Test error when no video stream found."""
        from app.tasks.frame_extraction import get_video_info

        mock_ffmpeg.probe.return_value = {
            "format": {"duration": "10.0"},
            "streams": [
                {"codec_type": "audio"},
            ],
        }

        with pytest.raises(ValueError, match="No video stream found"):
            get_video_info(Path("/tmp/audio.mp3"))


class TestCreateThumbnail:
    """Tests for create_thumbnail helper function."""

    @patch("app.tasks.frame_extraction.Image")
    def test_create_thumbnail(self, mock_image: MagicMock) -> None:
        """Test thumbnail creation."""
        from app.tasks.frame_extraction import THUMBNAIL_SIZE, create_thumbnail

        mock_img = MagicMock()
        mock_image.open.return_value.__enter__.return_value = mock_img

        frame_path = Path("/tmp/frame.jpg")
        thumbnail_path = Path("/tmp/thumbnail.jpg")

        with patch.object(Path, "mkdir"):
            create_thumbnail(frame_path, thumbnail_path)

        mock_image.open.assert_called_once_with(frame_path)
        mock_img.thumbnail.assert_called_once()
        mock_img.save.assert_called_once_with(thumbnail_path, "JPEG", quality=85)

        # Check thumbnail size was passed correctly
        thumbnail_call = mock_img.thumbnail.call_args
        assert thumbnail_call[0][0] == THUMBNAIL_SIZE


class TestExtractFramesFromVideo:
    """Tests for extract_frames_from_video helper function."""

    @patch("app.tasks.frame_extraction.get_video_info")
    @patch("app.tasks.frame_extraction.ffmpeg")
    def test_extract_frames(
        self, mock_ffmpeg: MagicMock, mock_get_info: MagicMock
    ) -> None:
        """Test frame extraction from video."""
        from app.tasks.frame_extraction import extract_frames_from_video

        mock_get_info.return_value = {
            "duration": 3.5,
            "width": 1920,
            "height": 1080,
            "fps": 30.0,
        }

        # Mock ffmpeg chain
        mock_input = MagicMock()
        mock_output = MagicMock()
        mock_overwrite = MagicMock()
        mock_ffmpeg.input.return_value = mock_input
        mock_input.output.return_value = mock_output
        mock_output.overwrite_output.return_value = mock_overwrite

        video_path = Path("/tmp/video.mp4")
        output_dir = Path("/tmp/frames")

        with (
            patch.object(Path, "mkdir"),
            patch.object(Path, "exists", return_value=True),
        ):
            frames = extract_frames_from_video(
                video_path, output_dir, interval_seconds=1.0
            )

        # Should extract 4 frames (0, 1, 2, 3 seconds)
        assert len(frames) == 4
        assert frames[0]["frame_number"] == 0
        assert frames[0]["timestamp_ms"] == 0
        assert frames[1]["frame_number"] == 1
        assert frames[1]["timestamp_ms"] == 1000
        assert frames[3]["frame_number"] == 3
        assert frames[3]["timestamp_ms"] == 3000


class TestExtractFramesTask:
    """Tests for extract_frames Celery task."""

    def _create_mock_video(
        self,
        video_id: str,
        project_id: str,
        status: VideoStatus = VideoStatus.PROCESSING,
    ) -> dict[str, Any]:
        """Create a mock video response."""
        return {
            "id": video_id,
            "project_id": project_id,
            "filename": "test.mp4",
            "original_filename": "test.mp4",
            "s3_key": f"projects/{project_id}/videos/{video_id}/test.mp4",
            "mime_type": "video/mp4",
            "file_size": 1000000,
            "duration_seconds": None,
            "width": None,
            "height": None,
            "fps": None,
            "frame_count": None,
            "status": status.value,
            "error_message": None,
            "metadata": {},
            "created_at": datetime.now(tz=UTC).isoformat(),
            "updated_at": datetime.now(tz=UTC).isoformat(),
        }

    @patch("app.tasks.frame_extraction.shutil")
    @patch("app.tasks.frame_extraction.create_frames_bulk")
    @patch("app.tasks.frame_extraction.update_video")
    @patch("app.tasks.frame_extraction.get_video")
    @patch("app.tasks.frame_extraction.create_thumbnail")
    @patch("app.tasks.frame_extraction.upload_object")
    @patch("app.tasks.frame_extraction.extract_frames_from_video")
    @patch("app.tasks.frame_extraction.get_video_info")
    @patch("app.tasks.frame_extraction.download_object")
    @patch("app.tasks.frame_extraction.get_supabase_client")
    @patch("app.tasks.frame_extraction.tempfile")
    def test_extract_frames_success(
        self,
        mock_tempfile: MagicMock,
        mock_get_client: MagicMock,
        mock_download: MagicMock,
        mock_get_info: MagicMock,
        mock_extract: MagicMock,
        mock_upload: MagicMock,
        mock_thumbnail: MagicMock,
        mock_get_video: MagicMock,
        mock_update_video: MagicMock,
        mock_create_frames: MagicMock,
        mock_shutil: MagicMock,
    ) -> None:
        """Test successful frame extraction."""
        from app.tasks.frame_extraction import extract_frames

        video_id = str(uuid4())
        project_id = str(uuid4())

        # Setup mocks
        mock_tempfile.mkdtemp.return_value = "/tmp/argus_frames_test"
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        mock_video_data = self._create_mock_video(video_id, project_id)
        mock_video = MagicMock()
        mock_video.s3_key = mock_video_data["s3_key"]
        mock_get_video.return_value = mock_video

        mock_get_info.return_value = {
            "duration": 2.0,
            "width": 1920,
            "height": 1080,
            "fps": 30.0,
        }

        mock_extract.return_value = [
            {
                "frame_number": 0,
                "timestamp_ms": 0,
                "local_path": Path("/tmp/frames/000000.jpg"),
                "width": 1920,
                "height": 1080,
            },
            {
                "frame_number": 1,
                "timestamp_ms": 1000,
                "local_path": Path("/tmp/frames/000001.jpg"),
                "width": 1920,
                "height": 1080,
            },
        ]

        mock_created_frames = [MagicMock(), MagicMock()]
        mock_create_frames.return_value = mock_created_frames

        # Run task
        result = extract_frames(video_id, project_id)

        # Verify result
        assert result["video_id"] == video_id
        assert result["frame_count"] == 2
        assert result["status"] == "success"

        # Verify video was downloaded
        mock_download.assert_called_once()

        # Verify frames were extracted
        mock_extract.assert_called_once()

        # Verify uploads (2 frames + 2 thumbnails = 4 uploads)
        assert mock_upload.call_count == 4

        # Verify frames were created in database
        mock_create_frames.assert_called_once()

        # Verify video was updated to ready status
        mock_update_video.assert_called()
        update_call = mock_update_video.call_args
        assert update_call[0][3].status == VideoStatus.READY

        # Note: rmtree is called in finally block only if temp_dir exists
        # Since we're mocking, the actual temp dir doesn't exist

    @patch("app.tasks.frame_extraction.shutil")
    @patch("app.tasks.frame_extraction.update_video")
    @patch("app.tasks.frame_extraction.get_video")
    @patch("app.tasks.frame_extraction.get_supabase_client")
    @patch("app.tasks.frame_extraction.tempfile")
    def test_extract_frames_video_not_found(
        self,
        mock_tempfile: MagicMock,
        mock_get_client: MagicMock,
        mock_get_video: MagicMock,
        mock_update_video: MagicMock,
        mock_shutil: MagicMock,
    ) -> None:
        """Test frame extraction when video not found."""
        from app.crud.video import VideoNotFoundError
        from app.tasks.frame_extraction import extract_frames

        video_id = str(uuid4())
        project_id = str(uuid4())

        mock_tempfile.mkdtemp.return_value = "/tmp/argus_frames_test"
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_get_video.side_effect = VideoNotFoundError(f"Video {video_id} not found")

        # Task should raise and retry
        with pytest.raises(VideoNotFoundError):
            extract_frames(video_id, project_id)

    @patch("app.tasks.frame_extraction.shutil")
    @patch("app.tasks.frame_extraction.update_video")
    @patch("app.tasks.frame_extraction.get_video")
    @patch("app.tasks.frame_extraction.download_object")
    @patch("app.tasks.frame_extraction.get_supabase_client")
    @patch("app.tasks.frame_extraction.tempfile")
    def test_extract_frames_download_error(
        self,
        mock_tempfile: MagicMock,
        mock_get_client: MagicMock,
        mock_download: MagicMock,
        mock_get_video: MagicMock,
        mock_update_video: MagicMock,
        mock_shutil: MagicMock,
    ) -> None:
        """Test frame extraction when S3 download fails."""
        from app.tasks.frame_extraction import extract_frames

        video_id = str(uuid4())
        project_id = str(uuid4())

        mock_tempfile.mkdtemp.return_value = "/tmp/argus_frames_test"
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        mock_video = MagicMock()
        mock_video.s3_key = f"projects/{project_id}/videos/{video_id}/test.mp4"
        mock_get_video.return_value = mock_video

        mock_download.side_effect = Exception("S3 download failed")

        # Task should fail and update video status
        with pytest.raises(Exception, match="S3 download failed"):
            extract_frames(video_id, project_id)

        # Verify video was updated to failed status
        mock_update_video.assert_called()
        update_call = mock_update_video.call_args
        assert update_call[0][3].status == VideoStatus.FAILED
        assert "S3 download failed" in str(update_call[0][3].error_message)


class TestGenerateS3Keys:
    """Tests for S3 key generation functions."""

    def test_generate_frame_s3_key(self) -> None:
        """Test frame S3 key generation."""
        from app.core.storage import generate_frame_s3_key

        project_id = uuid4()
        video_id = uuid4()

        key = generate_frame_s3_key(project_id, video_id, 42)

        assert key == f"projects/{project_id}/videos/{video_id}/frames/000042.jpg"

    def test_generate_thumbnail_s3_key(self) -> None:
        """Test thumbnail S3 key generation."""
        from app.core.storage import generate_thumbnail_s3_key

        project_id = uuid4()
        video_id = uuid4()

        key = generate_thumbnail_s3_key(project_id, video_id, 123)

        assert key == f"projects/{project_id}/videos/{video_id}/thumbnails/000123.jpg"
