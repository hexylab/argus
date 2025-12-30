"""Tests for annotation API endpoints."""

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import TEST_USER_ID


def _mock_project(project_id: str, now: str) -> dict[str, Any]:
    """Create a mock project result."""
    return {
        "id": project_id,
        "owner_id": TEST_USER_ID,
        "name": "Test Project",
        "description": None,
        "status": "active",
        "settings": {},
        "created_at": now,
        "updated_at": now,
    }


def _mock_video(video_id: str, project_id: str, now: str) -> dict[str, Any]:
    """Create a mock video result."""
    return {
        "id": video_id,
        "project_id": project_id,
        "filename": "test.mp4",
        "original_filename": "test.mp4",
        "s3_key": "videos/test.mp4",
        "mime_type": "video/mp4",
        "file_size": 1000,
        "duration_seconds": 10.0,
        "width": 1920,
        "height": 1080,
        "fps": 30.0,
        "frame_count": 300,
        "status": "ready",
        "error_message": None,
        "metadata": {},
        "created_at": now,
        "updated_at": now,
    }


def _mock_frame(frame_id: str, video_id: str, now: str) -> dict[str, Any]:
    """Create a mock frame result."""
    return {
        "id": frame_id,
        "video_id": video_id,
        "frame_number": 0,
        "timestamp_ms": 0,
        "s3_key": "frames/0.jpg",
        "thumbnail_s3_key": "frames/0_thumb.jpg",
        "width": 1920,
        "height": 1080,
        "embedding": None,
        "created_at": now,
    }


def _mock_label(label_id: str, project_id: str, now: str) -> dict[str, Any]:
    """Create a mock label result."""
    return {
        "id": label_id,
        "project_id": project_id,
        "name": "Test Label",
        "color": "#FF0000",
        "description": None,
        "sort_order": 0,
        "created_at": now,
    }


def _mock_annotation(
    annotation_id: str, frame_id: str, label_id: str, now: str
) -> dict[str, Any]:
    """Create a mock annotation result."""
    return {
        "id": annotation_id,
        "frame_id": frame_id,
        "label_id": label_id,
        "bbox_x": 0.1,
        "bbox_y": 0.2,
        "bbox_width": 0.3,
        "bbox_height": 0.4,
        "segmentation": None,
        "confidence": None,
        "source": "manual",
        "reviewed": False,
        "reviewed_by": None,
        "reviewed_at": None,
        "created_by": TEST_USER_ID,
        "created_at": now,
        "updated_at": now,
    }


class TestAnnotationsAuth:
    """Tests for annotation endpoint authentication."""

    def test_create_annotation_no_auth(self, client_no_auth: TestClient) -> None:
        """Test that creating an annotation without auth fails."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        response = client_no_auth.post(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations",
            json={
                "label_id": str(uuid4()),
                "bbox_x": 0.1,
                "bbox_y": 0.2,
                "bbox_width": 0.3,
                "bbox_height": 0.4,
            },
        )
        assert response.status_code in (401, 403)

    def test_list_annotations_no_auth(self, client_no_auth: TestClient) -> None:
        """Test that listing annotations without auth fails."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        response = client_no_auth.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations"
        )
        assert response.status_code in (401, 403)

    def test_get_annotation_no_auth(self, client_no_auth: TestClient) -> None:
        """Test that getting an annotation without auth fails."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        annotation_id = uuid4()
        response = client_no_auth.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations/{annotation_id}"
        )
        assert response.status_code in (401, 403)

    def test_update_annotation_no_auth(self, client_no_auth: TestClient) -> None:
        """Test that updating an annotation without auth fails."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        annotation_id = uuid4()
        response = client_no_auth.patch(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations/{annotation_id}",
            json={"bbox_x": 0.5},
        )
        assert response.status_code in (401, 403)

    def test_delete_annotation_no_auth(self, client_no_auth: TestClient) -> None:
        """Test that deleting an annotation without auth fails."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        annotation_id = uuid4()
        response = client_no_auth.delete(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations/{annotation_id}"
        )
        assert response.status_code in (401, 403)

    def test_bulk_save_annotations_no_auth(self, client_no_auth: TestClient) -> None:
        """Test that bulk saving annotations without auth fails."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        response = client_no_auth.put(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations",
            json={"annotations": []},
        )
        assert response.status_code in (401, 403)


class TestCreateAnnotation:
    """Tests for POST /api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations."""

    def test_create_success(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test creating an annotation successfully."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()
        annotation_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        # Set up mock chain for multiple select().eq().eq() calls
        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "projects":
                mock_result = MagicMock()
                mock_result.data = [_mock_project(str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "videos":
                mock_result = MagicMock()
                mock_result.data = [_mock_video(str(video_id), str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "frames":
                mock_result = MagicMock()
                mock_result.data = [_mock_frame(str(frame_id), str(video_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "labels":
                mock_result = MagicMock()
                mock_result.data = [_mock_label(str(label_id), str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "annotations":
                mock_result = MagicMock()
                mock_result.data = [
                    _mock_annotation(
                        str(annotation_id), str(frame_id), str(label_id), now
                    )
                ]
                table_mock.insert.return_value.execute.return_value = mock_result

            return table_mock

        mock_supabase.table.side_effect = table_side_effect

        response = client.post(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations",
            json={
                "label_id": str(label_id),
                "bbox_x": 0.1,
                "bbox_y": 0.2,
                "bbox_width": 0.3,
                "bbox_height": 0.4,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["bbox_x"] == 0.1
        assert data["bbox_y"] == 0.2
        assert data["bbox_width"] == 0.3
        assert data["bbox_height"] == 0.4
        assert data["label_id"] == str(label_id)

    def test_create_project_not_found(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test creating annotation with nonexistent project."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()

        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        response = client.post(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations",
            json={
                "label_id": str(label_id),
                "bbox_x": 0.1,
                "bbox_y": 0.2,
                "bbox_width": 0.3,
                "bbox_height": 0.4,
            },
        )

        assert response.status_code == 404

    def test_create_invalid_bbox(
        self,
        client: TestClient,
    ) -> None:
        """Test creating annotation with invalid bbox values."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()

        # bbox_x out of range
        response = client.post(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations",
            json={
                "label_id": str(label_id),
                "bbox_x": 1.5,  # Invalid: > 1
                "bbox_y": 0.2,
                "bbox_width": 0.3,
                "bbox_height": 0.4,
            },
        )
        assert response.status_code == 422


class TestListAnnotations:
    """Tests for GET /api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations."""

    def test_list_success(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test listing annotations successfully."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()
        annotation_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "projects":
                mock_result = MagicMock()
                mock_result.data = [_mock_project(str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "videos":
                mock_result = MagicMock()
                mock_result.data = [_mock_video(str(video_id), str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "frames":
                mock_result = MagicMock()
                mock_result.data = [_mock_frame(str(frame_id), str(video_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "annotations":
                mock_result = MagicMock()
                mock_result.data = [
                    _mock_annotation(
                        str(annotation_id), str(frame_id), str(label_id), now
                    )
                ]
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            return table_mock

        mock_supabase.table.side_effect = table_side_effect

        response = client.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(annotation_id)

    def test_list_empty(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test listing annotations when none exist."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "projects":
                mock_result = MagicMock()
                mock_result.data = [_mock_project(str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "videos":
                mock_result = MagicMock()
                mock_result.data = [_mock_video(str(video_id), str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "frames":
                mock_result = MagicMock()
                mock_result.data = [_mock_frame(str(frame_id), str(video_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "annotations":
                mock_result = MagicMock()
                mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            return table_mock

        mock_supabase.table.side_effect = table_side_effect

        response = client.get(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0


class TestUpdateAnnotation:
    """Tests for PATCH /api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations/{annotation_id}."""

    def test_update_success(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test updating an annotation successfully."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()
        annotation_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "projects":
                mock_result = MagicMock()
                mock_result.data = [_mock_project(str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "videos":
                mock_result = MagicMock()
                mock_result.data = [_mock_video(str(video_id), str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "frames":
                mock_result = MagicMock()
                mock_result.data = [_mock_frame(str(frame_id), str(video_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "annotations":
                updated_annotation = _mock_annotation(
                    str(annotation_id), str(frame_id), str(label_id), now
                )
                updated_annotation["bbox_x"] = 0.5
                mock_result = MagicMock()
                mock_result.data = [updated_annotation]
                table_mock.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

            return table_mock

        mock_supabase.table.side_effect = table_side_effect

        response = client.patch(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations/{annotation_id}",
            json={"bbox_x": 0.5},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["bbox_x"] == 0.5


class TestDeleteAnnotation:
    """Tests for DELETE /api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations/{annotation_id}."""

    def test_delete_success(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test deleting an annotation successfully."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()
        annotation_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "projects":
                mock_result = MagicMock()
                mock_result.data = [_mock_project(str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "videos":
                mock_result = MagicMock()
                mock_result.data = [_mock_video(str(video_id), str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "frames":
                mock_result = MagicMock()
                mock_result.data = [_mock_frame(str(frame_id), str(video_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "annotations":
                mock_result = MagicMock()
                mock_result.data = [
                    _mock_annotation(
                        str(annotation_id), str(frame_id), str(label_id), now
                    )
                ]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
                table_mock.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock()

            return table_mock

        mock_supabase.table.side_effect = table_side_effect

        response = client.delete(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations/{annotation_id}"
        )

        assert response.status_code == 204


class TestBulkSaveAnnotations:
    """Tests for PUT /api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations."""

    def test_bulk_save_success(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test bulk saving annotations successfully."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()
        annotation_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "projects":
                mock_result = MagicMock()
                mock_result.data = [_mock_project(str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "videos":
                mock_result = MagicMock()
                mock_result.data = [_mock_video(str(video_id), str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "frames":
                mock_result = MagicMock()
                mock_result.data = [_mock_frame(str(frame_id), str(video_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "labels":
                mock_result = MagicMock()
                mock_result.data = [_mock_label(str(label_id), str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "annotations":
                # Delete returns empty
                delete_result = MagicMock()
                delete_result.data = []
                table_mock.delete.return_value.eq.return_value.execute.return_value = (
                    delete_result
                )
                # Insert returns the new annotations
                insert_result = MagicMock()
                insert_result.data = [
                    _mock_annotation(
                        str(annotation_id), str(frame_id), str(label_id), now
                    )
                ]
                table_mock.insert.return_value.execute.return_value = insert_result

            return table_mock

        mock_supabase.table.side_effect = table_side_effect

        response = client.put(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations",
            json={
                "annotations": [
                    {
                        "label_id": str(label_id),
                        "bbox_x": 0.1,
                        "bbox_y": 0.2,
                        "bbox_width": 0.3,
                        "bbox_height": 0.4,
                    }
                ]
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    def test_bulk_save_empty(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test bulk saving empty annotations list (clears all)."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "projects":
                mock_result = MagicMock()
                mock_result.data = [_mock_project(str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "videos":
                mock_result = MagicMock()
                mock_result.data = [_mock_video(str(video_id), str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "frames":
                mock_result = MagicMock()
                mock_result.data = [_mock_frame(str(frame_id), str(video_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            elif table_name == "annotations":
                delete_result = MagicMock()
                delete_result.data = []
                table_mock.delete.return_value.eq.return_value.execute.return_value = (
                    delete_result
                )

            return table_mock

        mock_supabase.table.side_effect = table_side_effect

        response = client.put(
            f"/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations",
            json={"annotations": []},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
