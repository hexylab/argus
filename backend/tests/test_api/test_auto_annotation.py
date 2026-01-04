"""Tests for auto-annotation API endpoints."""

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import TEST_USER_ID


class TestAutoAnnotationAuth:
    """Tests for auto-annotation endpoint authentication."""

    def test_start_auto_annotation_no_auth(self, client_no_auth: TestClient) -> None:
        """Test that starting auto-annotation without auth fails."""
        project_id = uuid4()
        response = client_no_auth.post(
            f"/api/v1/projects/{project_id}/auto-annotate",
            json={
                "frame_ids": [str(uuid4())],
                "label_id": str(uuid4()),
            },
        )
        assert response.status_code in (401, 403)

    def test_get_task_status_no_auth(self, client_no_auth: TestClient) -> None:
        """Test that getting task status without auth fails."""
        project_id = uuid4()
        task_id = "test-task-id"
        response = client_no_auth.get(
            f"/api/v1/projects/{project_id}/auto-annotate/{task_id}"
        )
        assert response.status_code in (401, 403)


class TestStartAutoAnnotation:
    """Tests for POST /api/v1/projects/{project_id}/auto-annotate."""

    @patch("app.tasks.auto_annotation.auto_annotate_frames")
    def test_start_success(
        self,
        mock_task: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test successfully starting auto-annotation."""
        project_id = uuid4()
        label_id = uuid4()
        frame_ids = [uuid4(), uuid4()]
        now = datetime.now(tz=UTC).isoformat()

        # Mock project ownership check
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

        # Mock label check
        mock_label_result = MagicMock()
        mock_label_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "Test Label",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": now,
            }
        ]

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_label_result,
        ]

        # Mock Celery task
        mock_task_result = MagicMock()
        mock_task_result.id = "test-task-123"
        mock_task.delay.return_value = mock_task_result

        response = client.post(
            f"/api/v1/projects/{project_id}/auto-annotate",
            json={
                "frame_ids": [str(fid) for fid in frame_ids],
                "label_id": str(label_id),
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "test-task-123"
        assert data["status"] == "PENDING"
        assert data["total_frames"] == 2

        # Verify task was called with correct arguments
        mock_task.delay.assert_called_once()
        call_kwargs = mock_task.delay.call_args.kwargs
        assert len(call_kwargs["frame_ids"]) == 2
        assert call_kwargs["label_id"] == str(label_id)
        assert call_kwargs["label_name"] == "Test Label"
        assert call_kwargs["created_by"] == TEST_USER_ID
        assert call_kwargs["confidence_threshold"] == 0.5

    @patch("app.tasks.auto_annotation.auto_annotate_frames")
    def test_start_with_custom_confidence(
        self,
        mock_task: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test starting auto-annotation with custom confidence threshold."""
        project_id = uuid4()
        label_id = uuid4()
        frame_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        # Mock project and label
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

        mock_label_result = MagicMock()
        mock_label_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "Test Label",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": now,
            }
        ]

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_label_result,
        ]

        mock_task_result = MagicMock()
        mock_task_result.id = "test-task-456"
        mock_task.delay.return_value = mock_task_result

        response = client.post(
            f"/api/v1/projects/{project_id}/auto-annotate",
            json={
                "frame_ids": [str(frame_id)],
                "label_id": str(label_id),
                "options": {"min_confidence": 0.8},
            },
        )

        assert response.status_code == 200
        call_kwargs = mock_task.delay.call_args.kwargs
        assert call_kwargs["confidence_threshold"] == 0.8

    def test_start_project_not_found(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test starting auto-annotation with nonexistent project."""
        project_id = uuid4()

        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        response = client.post(
            f"/api/v1/projects/{project_id}/auto-annotate",
            json={
                "frame_ids": [str(uuid4())],
                "label_id": str(uuid4()),
            },
        )

        assert response.status_code == 404
        assert "Project" in response.json()["detail"]

    def test_start_label_not_found(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test starting auto-annotation with nonexistent label."""
        project_id = uuid4()
        label_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        # Mock project exists
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

        # Mock label not found
        mock_label_result = MagicMock()
        mock_label_result.data = []

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_label_result,
        ]

        response = client.post(
            f"/api/v1/projects/{project_id}/auto-annotate",
            json={
                "frame_ids": [str(uuid4())],
                "label_id": str(label_id),
            },
        )

        assert response.status_code == 404
        assert "Label" in response.json()["detail"]

    def test_start_empty_frame_ids(
        self,
        client: TestClient,
    ) -> None:
        """Test starting auto-annotation with empty frame_ids."""
        project_id = uuid4()

        response = client.post(
            f"/api/v1/projects/{project_id}/auto-annotate",
            json={
                "frame_ids": [],
                "label_id": str(uuid4()),
            },
        )

        assert response.status_code == 422

    def test_start_invalid_confidence(
        self,
        client: TestClient,
    ) -> None:
        """Test starting auto-annotation with invalid confidence."""
        project_id = uuid4()

        response = client.post(
            f"/api/v1/projects/{project_id}/auto-annotate",
            json={
                "frame_ids": [str(uuid4())],
                "label_id": str(uuid4()),
                "options": {"min_confidence": 1.5},  # Invalid: > 1.0
            },
        )

        assert response.status_code == 422


class TestGetTaskStatus:
    """Tests for GET /api/v1/projects/{project_id}/auto-annotate/{task_id}."""

    @patch("app.api.v1.auto_annotation.AsyncResult")
    def test_get_pending_status(
        self,
        mock_async_result_class: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test getting status of a pending task."""
        project_id = uuid4()
        task_id = "test-task-123"
        now = datetime.now(tz=UTC).isoformat()

        # Mock project ownership check
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

        # Mock AsyncResult
        mock_result = MagicMock()
        mock_result.status = "PENDING"
        mock_result.successful.return_value = False
        mock_result.failed.return_value = False
        mock_async_result_class.return_value = mock_result

        response = client.get(f"/api/v1/projects/{project_id}/auto-annotate/{task_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == task_id
        assert data["status"] == "PENDING"
        assert data["result"] is None
        assert data["error"] is None

    @patch("app.api.v1.auto_annotation.AsyncResult")
    def test_get_success_status(
        self,
        mock_async_result_class: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test getting status of a successful task."""
        project_id = uuid4()
        task_id = "test-task-123"
        now = datetime.now(tz=UTC).isoformat()

        # Mock project ownership check
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

        # Mock AsyncResult with success
        mock_result = MagicMock()
        mock_result.status = "SUCCESS"
        mock_result.successful.return_value = True
        mock_result.failed.return_value = False
        mock_result.result = {
            "frame_count": 10,
            "annotation_count": 25,
            "failed_count": 0,
            "status": "success",
        }
        mock_async_result_class.return_value = mock_result

        response = client.get(f"/api/v1/projects/{project_id}/auto-annotate/{task_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == task_id
        assert data["status"] == "SUCCESS"
        assert data["result"]["frame_count"] == 10
        assert data["result"]["annotation_count"] == 25
        assert data["error"] is None

    @patch("app.api.v1.auto_annotation.AsyncResult")
    def test_get_failure_status(
        self,
        mock_async_result_class: MagicMock,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test getting status of a failed task."""
        project_id = uuid4()
        task_id = "test-task-123"
        now = datetime.now(tz=UTC).isoformat()

        # Mock project ownership check
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

        # Mock AsyncResult with failure
        mock_result = MagicMock()
        mock_result.status = "FAILURE"
        mock_result.successful.return_value = False
        mock_result.failed.return_value = True
        mock_result.result = Exception("SAM3 model failed")
        mock_async_result_class.return_value = mock_result

        response = client.get(f"/api/v1/projects/{project_id}/auto-annotate/{task_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == task_id
        assert data["status"] == "FAILURE"
        assert data["result"] is None
        assert "SAM3 model failed" in data["error"]

    def test_get_status_project_not_found(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test getting task status with nonexistent project."""
        project_id = uuid4()
        task_id = "test-task-123"

        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        response = client.get(f"/api/v1/projects/{project_id}/auto-annotate/{task_id}")

        assert response.status_code == 404
