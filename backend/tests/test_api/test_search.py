"""Tests for search API endpoints."""

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

import numpy as np
from fastapi.testclient import TestClient

from tests.conftest import TEST_USER_ID


class TestSearchAuth:
    """Tests for search endpoint authentication."""

    def test_search_no_auth(self, client_no_auth: TestClient) -> None:
        """Test that searching without auth fails."""
        project_id = uuid4()
        response = client_no_auth.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu"},
        )
        assert response.status_code in (401, 403)


class TestSearchFrames:
    """Tests for POST /api/v1/projects/{project_id}/search."""

    @patch("app.api.v1.search.generate_presigned_download_url")
    @patch("app.api.v1.search._extract_text_embedding")
    def test_search_empty_results(
        self,
        mock_extract: MagicMock,
        mock_presigned: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test searching when no frames match."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        # Mock text embedding extraction
        mock_extract.return_value = np.array([0.1] * 768, dtype=np.float32)
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
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for empty search results (RPC call)
        mock_rpc_result = MagicMock()
        mock_rpc_result.data = []
        mock_supabase.rpc.return_value.execute.return_value = mock_rpc_result

        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
        assert data["total"] == 0
        assert data["has_more"] is False

    @patch("app.api.v1.search.generate_presigned_download_url")
    @patch("app.api.v1.search._extract_text_embedding")
    def test_search_with_results(
        self,
        mock_extract: MagicMock,
        mock_presigned: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test searching with matching frames."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        # Mock text embedding extraction
        mock_extract.return_value = np.array([0.1] * 768, dtype=np.float32)
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
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for search results (RPC call)
        mock_rpc_result = MagicMock()
        mock_rpc_result.data = [
            {
                "frame_id": str(frame_id),
                "video_id": str(video_id),
                "frame_number": 42,
                "s3_key": f"projects/{project_id}/videos/{video_id}/frames/0042.png",
                "similarity": 0.85,
            }
        ]
        mock_supabase.rpc.return_value.execute.return_value = mock_rpc_result

        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["frame_id"] == str(frame_id)
        assert data["results"][0]["video_id"] == str(video_id)
        assert data["results"][0]["frame_number"] == 42
        assert data["results"][0]["similarity"] == 0.85
        assert data["total"] == 1
        assert data["has_more"] is False

    @patch("app.api.v1.search.generate_presigned_download_url")
    @patch("app.api.v1.search._extract_text_embedding")
    def test_search_with_video_filter(
        self,
        mock_extract: MagicMock,
        mock_presigned: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test searching with video_id filter."""
        project_id = uuid4()
        video_id_1 = uuid4()
        video_id_2 = uuid4()
        frame_id_1 = uuid4()
        frame_id_2 = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_extract.return_value = np.array([0.1] * 768, dtype=np.float32)
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
                "created_at": now,
                "updated_at": now,
            }
        ]

        # Mock for video check
        mock_video_result = MagicMock()
        mock_video_result.data = [
            {
                "id": str(video_id_1),
                "project_id": str(project_id),
                "filename": "test.mp4",
                "original_filename": "test.mp4",
                "s3_key": f"projects/{project_id}/videos/{video_id_1}/test.mp4",
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

        # Mock for search results - returns frames from both videos
        mock_rpc_result = MagicMock()
        mock_rpc_result.data = [
            {
                "frame_id": str(frame_id_1),
                "video_id": str(video_id_1),
                "frame_number": 10,
                "s3_key": f"projects/{project_id}/videos/{video_id_1}/frames/0010.png",
                "similarity": 0.9,
            },
            {
                "frame_id": str(frame_id_2),
                "video_id": str(video_id_2),
                "frame_number": 20,
                "s3_key": f"projects/{project_id}/videos/{video_id_2}/frames/0020.png",
                "similarity": 0.8,
            },
        ]
        mock_supabase.rpc.return_value.execute.return_value = mock_rpc_result

        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "video_id": str(video_id_1)},
        )

        assert response.status_code == 200
        data = response.json()
        # Should only return frame from video_id_1
        assert len(data["results"]) == 1
        assert data["results"][0]["video_id"] == str(video_id_1)
        assert data["total"] == 1

    @patch("app.api.v1.search.generate_presigned_download_url")
    @patch("app.api.v1.search._extract_text_embedding")
    def test_search_with_min_similarity(
        self,
        mock_extract: MagicMock,
        mock_presigned: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test searching with min_similarity filter."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id_1 = uuid4()
        frame_id_2 = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_extract.return_value = np.array([0.1] * 768, dtype=np.float32)
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
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for search results - one above threshold, one below
        mock_rpc_result = MagicMock()
        mock_rpc_result.data = [
            {
                "frame_id": str(frame_id_1),
                "video_id": str(video_id),
                "frame_number": 10,
                "s3_key": f"projects/{project_id}/videos/{video_id}/frames/0010.png",
                "similarity": 0.6,
            },
            {
                "frame_id": str(frame_id_2),
                "video_id": str(video_id),
                "frame_number": 20,
                "s3_key": f"projects/{project_id}/videos/{video_id}/frames/0020.png",
                "similarity": 0.3,
            },
        ]
        mock_supabase.rpc.return_value.execute.return_value = mock_rpc_result

        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "min_similarity": 0.5},
        )

        assert response.status_code == 200
        data = response.json()
        # Should only return frame with similarity >= 0.5
        assert len(data["results"]) == 1
        assert data["results"][0]["similarity"] >= 0.5
        assert data["total"] == 1

    @patch("app.api.v1.search.generate_presigned_download_url")
    @patch("app.api.v1.search._extract_text_embedding")
    def test_search_pagination(
        self,
        mock_extract: MagicMock,
        mock_presigned: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test search pagination."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_extract.return_value = np.array([0.1] * 768, dtype=np.float32)
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
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Create 5 mock results
        mock_rpc_result = MagicMock()
        mock_rpc_result.data = [
            {
                "frame_id": str(uuid4()),
                "video_id": str(video_id),
                "frame_number": i,
                "s3_key": f"projects/{project_id}/videos/{video_id}/frames/{i:04d}.png",
                "similarity": 0.9 - i * 0.1,
            }
            for i in range(5)
        ]
        mock_supabase.rpc.return_value.execute.return_value = mock_rpc_result

        # Request with limit=2, offset=0
        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "limit": 2, "offset": 0},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2
        assert data["total"] == 5
        assert data["has_more"] is True

        # Request with limit=2, offset=2
        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "limit": 2, "offset": 2},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2
        assert data["total"] == 5
        assert data["has_more"] is True

        # Request with limit=2, offset=4 (last page)
        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "limit": 2, "offset": 4},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["total"] == 5
        assert data["has_more"] is False


class TestSearchAuthorization:
    """Tests for search authorization (access control)."""

    @patch("app.api.v1.search._extract_text_embedding")
    def test_search_other_users_project_returns_404(
        self,
        mock_extract: MagicMock,
        client_other_user: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test that searching in another user's project returns 404."""
        project_id = uuid4()

        mock_extract.return_value = np.array([0.1] * 768, dtype=np.float32)

        # Project not found because owner_id doesn't match
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        response = client_other_user.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu"},
        )

        assert response.status_code == 404

    @patch("app.api.v1.search._extract_text_embedding")
    def test_search_video_not_in_project_returns_404(
        self,
        mock_extract: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test that filtering by non-existent video returns 404."""
        project_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_extract.return_value = np.array([0.1] * 768, dtype=np.float32)

        # Mock for project ownership check - project exists
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

        # Mock for video check - video not found
        mock_video_result = MagicMock()
        mock_video_result.data = []

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_video_result,
        ]

        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "video_id": str(video_id)},
        )

        assert response.status_code == 404


class TestSearchInputValidation:
    """Tests for search input validation."""

    def test_search_empty_query(
        self,
        client: TestClient,
    ) -> None:
        """Test that empty query is rejected."""
        project_id = uuid4()
        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": ""},
        )
        assert response.status_code == 422

    def test_search_query_too_long(
        self,
        client: TestClient,
    ) -> None:
        """Test that overly long query is rejected."""
        project_id = uuid4()
        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "a" * 501},
        )
        assert response.status_code == 422

    def test_search_invalid_limit(
        self,
        client: TestClient,
    ) -> None:
        """Test that invalid limit is rejected."""
        project_id = uuid4()
        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "limit": 0},
        )
        assert response.status_code == 422

        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "limit": 501},
        )
        assert response.status_code == 422

    def test_search_invalid_offset(
        self,
        client: TestClient,
    ) -> None:
        """Test that negative offset is rejected."""
        project_id = uuid4()
        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "offset": -1},
        )
        assert response.status_code == 422

    def test_search_invalid_min_similarity(
        self,
        client: TestClient,
    ) -> None:
        """Test that out-of-range min_similarity is rejected."""
        project_id = uuid4()
        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "min_similarity": 1.5},
        )
        assert response.status_code == 422

        response = client.post(
            f"/api/v1/projects/{project_id}/search",
            json={"query": "cpu", "min_similarity": -1.5},
        )
        assert response.status_code == 422
