"""Tests for video API endpoints."""

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import TEST_USER_ID


class TestVideosAuth:
    """Tests for video endpoint authentication."""

    def test_get_upload_url_no_auth(self, client: TestClient) -> None:
        """Test that getting upload URL without auth fails."""
        project_id = uuid4()
        response = client.post(
            f"/api/v1/projects/{project_id}/videos/upload-url",
            json={"filename": "test.mp4"},
        )
        assert response.status_code in (401, 403)

    def test_list_videos_no_auth(self, client: TestClient) -> None:
        """Test that listing videos without auth fails."""
        project_id = uuid4()
        response = client.get(f"/api/v1/projects/{project_id}/videos")
        assert response.status_code in (401, 403)

    def test_get_video_no_auth(self, client: TestClient) -> None:
        """Test that getting a video without auth fails."""
        project_id = uuid4()
        video_id = uuid4()
        response = client.get(f"/api/v1/projects/{project_id}/videos/{video_id}")
        assert response.status_code in (401, 403)

    def test_complete_upload_no_auth(self, client: TestClient) -> None:
        """Test that completing upload without auth fails."""
        project_id = uuid4()
        video_id = uuid4()
        response = client.post(
            f"/api/v1/projects/{project_id}/videos/{video_id}/complete",
            json={},
        )
        assert response.status_code in (401, 403)

    def test_delete_video_no_auth(self, client: TestClient) -> None:
        """Test that deleting a video without auth fails."""
        project_id = uuid4()
        video_id = uuid4()
        response = client.delete(f"/api/v1/projects/{project_id}/videos/{video_id}")
        assert response.status_code in (401, 403)


class TestGetUploadUrl:
    """Tests for POST /api/v1/projects/{project_id}/videos/upload-url."""

    @patch("app.api.v1.videos.generate_presigned_upload_url")
    @patch("app.api.v1.videos.get_supabase_client")
    def test_get_upload_url_success(
        self,
        mock_get_client: MagicMock,
        mock_presigned: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test getting an upload URL successfully."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
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
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for video creation
        mock_video_result = MagicMock()
        mock_video_result.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "filename": "test.mp4",
                "original_filename": "test.mp4",
                "s3_key": f"projects/{project_id}/videos/xyz/test.mp4",
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
            }
        ]
        mock_supabase.table.return_value.insert.return_value.execute.return_value = (
            mock_video_result
        )
        mock_get_client.return_value = mock_supabase

        mock_presigned.return_value = "https://minio.example.com/presigned-url"

        response = client.post(
            f"/api/v1/projects/{project_id}/videos/upload-url",
            json={"filename": "test.mp4", "mime_type": "video/mp4"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "video_id" in data
        assert "upload_url" in data
        assert data["upload_url"] == "https://minio.example.com/presigned-url"
        assert "s3_key" in data
        assert "expires_in" in data

    @patch("app.api.v1.videos.get_supabase_client")
    def test_get_upload_url_project_not_found(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test getting upload URL for non-existent project."""
        project_id = uuid4()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.post(
            f"/api/v1/projects/{project_id}/videos/upload-url",
            json={"filename": "test.mp4"},
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestCompleteUpload:
    """Tests for POST /api/v1/projects/{project_id}/videos/{video_id}/complete."""

    @patch("app.api.v1.videos.get_supabase_client")
    def test_complete_upload_success(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test completing an upload successfully."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
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

        # Mock for getting video
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
                "status": "uploading",
                "error_message": None,
                "metadata": {},
                "created_at": now,
                "updated_at": now,
            }
        ]

        # Mock for updating video
        mock_update_result = MagicMock()
        mock_update_result.data = [
            {
                "id": str(video_id),
                "project_id": str(project_id),
                "filename": "test.mp4",
                "original_filename": "test.mp4",
                "s3_key": f"projects/{project_id}/videos/{video_id}/test.mp4",
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
                "created_at": now,
                "updated_at": now,
            }
        ]

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_video_result,
        ]
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_update_result
        mock_get_client.return_value = mock_supabase

        response = client.post(
            f"/api/v1/projects/{project_id}/videos/{video_id}/complete",
            json={"file_size": 5000000},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["file_size"] == 5000000

    @patch("app.api.v1.videos.get_supabase_client")
    def test_complete_upload_video_not_found(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test completing upload for non-existent video."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
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
        mock_get_client.return_value = mock_supabase

        response = client.post(
            f"/api/v1/projects/{project_id}/videos/{video_id}/complete",
            json={},
            headers=auth_headers,
        )

        assert response.status_code == 404

    @patch("app.api.v1.videos.get_supabase_client")
    def test_complete_upload_wrong_status(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test completing upload for video not in uploading status."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
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

        # Mock for video already ready
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

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_video_result,
        ]
        mock_get_client.return_value = mock_supabase

        response = client.post(
            f"/api/v1/projects/{project_id}/videos/{video_id}/complete",
            json={},
            headers=auth_headers,
        )

        assert response.status_code == 400


class TestListVideos:
    """Tests for GET /api/v1/projects/{project_id}/videos."""

    @patch("app.api.v1.videos.get_supabase_client")
    def test_list_empty(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test listing videos when none exist."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
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
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for empty videos list
        mock_videos_result = MagicMock()
        mock_videos_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_videos_result
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}/videos",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json() == []

    @patch("app.api.v1.videos.get_supabase_client")
    def test_list_with_data(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test listing videos with some data."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
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
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for videos list
        mock_videos_result = MagicMock()
        mock_videos_result.data = [
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
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_videos_result
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}/videos",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["filename"] == "test.mp4"


class TestGetVideo:
    """Tests for GET /api/v1/projects/{project_id}/videos/{video_id}."""

    @patch("app.api.v1.videos.get_supabase_client")
    def test_get_existing(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test getting an existing video."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
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

        # Mock for video
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

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_video_result,
        ]
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(video_id)
        assert data["filename"] == "test.mp4"

    @patch("app.api.v1.videos.get_supabase_client")
    def test_get_nonexistent(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test getting a non-existent video."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
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
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestDeleteVideo:
    """Tests for DELETE /api/v1/projects/{project_id}/videos/{video_id}."""

    @patch("app.api.v1.videos.delete_object")
    @patch("app.api.v1.videos.get_supabase_client")
    def test_delete_existing(
        self,
        mock_get_client: MagicMock,
        mock_delete_object: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test deleting an existing video."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()
        s3_key = f"projects/{project_id}/videos/{video_id}/test.mp4"

        mock_supabase = MagicMock()
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

        # Mock for video
        mock_video_result = MagicMock()
        mock_video_result.data = [
            {
                "id": str(video_id),
                "project_id": str(project_id),
                "filename": "test.mp4",
                "original_filename": "test.mp4",
                "s3_key": s3_key,
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

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_video_result,
            mock_video_result,  # For delete verification
        ]
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock()
        mock_get_client.return_value = mock_supabase

        response = client.delete(
            f"/api/v1/projects/{project_id}/videos/{video_id}",
            headers=auth_headers,
        )

        assert response.status_code == 204
        mock_delete_object.assert_called_once_with(s3_key)

    @patch("app.api.v1.videos.get_supabase_client")
    def test_delete_nonexistent(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test deleting a non-existent video."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
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
        mock_get_client.return_value = mock_supabase

        response = client.delete(
            f"/api/v1/projects/{project_id}/videos/{video_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404
