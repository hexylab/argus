"""Tests for frame API endpoints."""

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import TEST_USER_ID


class TestFramesAuth:
    """Tests for frame endpoint authentication."""

    def test_list_frames_no_auth(self, client_no_auth: TestClient) -> None:
        """Test that listing frames without auth fails."""
        project_id = uuid4()
        video_id = uuid4()
        response = client_no_auth.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames"
        )
        assert response.status_code in (401, 403)


class TestListFrames:
    """Tests for GET /api/v1/projects/{project_id}/videos/{video_id}/frames."""

    @patch("app.api.v1.frames.generate_presigned_download_url")
    def test_list_empty(
        self,
        mock_presigned: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test listing frames when none exist."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]

        # Mock for video existence check
        mock_video_result = MagicMock()
        mock_video_result.data = [
            {
                "id": str(video_id),
                "project_id": str(project_id),
                "filename": "test.mp4",
                "original_filename": "test.mp4",
                "s3_key": f"projects/{project_id}/videos/{video_id}/test.mp4",
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
            }
        ]

        # Mock for empty frames list
        mock_frames_result = MagicMock()
        mock_frames_result.data = []

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_video_result,
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_frames_result

        response = client.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames",
        )

        assert response.status_code == 200
        assert response.json() == []

    @patch("app.api.v1.frames.generate_presigned_download_url")
    def test_list_with_data(
        self,
        mock_presigned: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test listing frames with data."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        now = datetime.now(tz=UTC)

        mock_presigned.return_value = "https://minio.example.com/thumbnail-url"

        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
        ]

        # Mock for video existence check
        mock_video_result = MagicMock()
        mock_video_result.data = [
            {
                "id": str(video_id),
                "project_id": str(project_id),
                "filename": "test.mp4",
                "original_filename": "test.mp4",
                "s3_key": f"projects/{project_id}/videos/{video_id}/test.mp4",
                "mime_type": "video/mp4",
                "file_size": 1000000,
                "duration_seconds": 60.0,
                "width": 1920,
                "height": 1080,
                "fps": 30.0,
                "frame_count": 60,
                "status": "ready",
                "error_message": None,
                "metadata": {},
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
        ]

        # Mock for frames list
        mock_frames_result = MagicMock()
        mock_frames_result.data = [
            {
                "id": str(frame_id),
                "video_id": str(video_id),
                "frame_number": 0,
                "timestamp_ms": 0,
                "s3_key": f"projects/{project_id}/videos/{video_id}/frames/000000.jpg",
                "thumbnail_s3_key": f"projects/{project_id}/videos/{video_id}/thumbnails/000000.jpg",
                "width": 1920,
                "height": 1080,
                "embedding": None,
                "created_at": now,
            }
        ]

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_video_result,
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_frames_result

        response = client.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames",
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["frame_number"] == 0
        assert data[0]["timestamp_ms"] == 0
        assert data[0]["thumbnail_url"] == "https://minio.example.com/thumbnail-url"

    def test_list_frames_project_not_found(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test listing frames for non-existent project."""
        project_id = uuid4()
        video_id = uuid4()

        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        response = client.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames",
        )

        assert response.status_code == 404

    def test_list_frames_video_not_found(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test listing frames for non-existent video."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]

        # Mock for video not found
        mock_video_result = MagicMock()
        mock_video_result.data = []

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_video_result,
        ]

        response = client.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames",
        )

        assert response.status_code == 404


class TestFramesAuthorization:
    """Tests for frame authorization (access control)."""

    def test_access_other_users_project_frames_returns_404(
        self,
        client_other_user: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test that accessing frames in another user's project returns 404."""
        project_id = uuid4()
        video_id = uuid4()

        # Project not found because owner_id doesn't match
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        response = client_other_user.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames",
        )

        assert response.status_code == 404


class TestFramesInputValidation:
    """Tests for frame input validation."""

    def test_list_frames_invalid_video_uuid(
        self,
        client: TestClient,
    ) -> None:
        """Test that invalid video UUID format is rejected."""
        project_id = uuid4()
        response = client.get(
            f"/api/v1/projects/{project_id}/videos/not-a-uuid/frames",
        )
        assert response.status_code == 422

    def test_list_frames_invalid_pagination(
        self,
        client: TestClient,
    ) -> None:
        """Test that invalid pagination parameters are rejected."""
        project_id = uuid4()
        video_id = uuid4()
        response = client.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames?skip=-1&limit=0",
        )
        assert response.status_code == 422

    def test_list_frames_limit_too_high(
        self,
        client: TestClient,
    ) -> None:
        """Test that limit exceeding maximum is rejected."""
        project_id = uuid4()
        video_id = uuid4()
        response = client.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames?limit=501",
        )
        assert response.status_code == 422
