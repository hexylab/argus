"""Tests for export API endpoints."""

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
        "frame_count": 1,
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
        "s3_key": "frames/0000.jpg",
        "thumbnail_s3_key": "frames/0000_thumb.jpg",
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
    annotation_id: str,
    frame_id: str,
    label_id: str,
    now: str,
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


class TestExportAuth:
    """Tests for export endpoint authentication."""

    def test_export_coco_requires_auth(self, client_no_auth: TestClient) -> None:
        """Test that COCO export requires authentication."""
        project_id = uuid4()
        response = client_no_auth.get(f"/api/v1/projects/{project_id}/export/coco")
        assert response.status_code == 401


class TestExportCOCO:
    """Tests for COCO export endpoint."""

    def test_export_coco_project_not_found(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test exporting from nonexistent project."""
        project_id = uuid4()

        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        response = client.get(f"/api/v1/projects/{project_id}/export/coco")
        assert response.status_code == 404

    def test_export_coco_empty_project(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test exporting from project with no data."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "projects":
                mock_result = MagicMock()
                mock_result.data = [_mock_project(str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
            else:
                # Empty results for videos, frames, labels, annotations
                mock_result = MagicMock()
                mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result
                table_mock.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            return table_mock

        mock_supabase.table.side_effect = table_side_effect

        response = client.get(f"/api/v1/projects/{project_id}/export/coco")
        assert response.status_code == 200

        data = response.json()
        assert "info" in data
        assert "licenses" in data
        assert "images" in data
        assert "annotations" in data
        assert "categories" in data
        assert data["images"] == []
        assert data["annotations"] == []
        assert data["categories"] == []

    def test_export_coco_with_data(
        self,
        client: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test exporting from project with data."""
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()
        annotation_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        call_count: dict[str, int] = {
            "videos": 0,
            "frames": 0,
            "labels": 0,
            "annotations": 0,
        }

        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "projects":
                mock_result = MagicMock()
                mock_result.data = [_mock_project(str(project_id), now)]
                table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

            elif table_name == "videos":
                mock_result = MagicMock()
                if call_count["videos"] == 0:
                    mock_result.data = [
                        _mock_video(str(video_id), str(project_id), now)
                    ]
                    call_count["videos"] += 1
                else:
                    mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            elif table_name == "frames":
                mock_result = MagicMock()
                if call_count["frames"] == 0:
                    mock_result.data = [_mock_frame(str(frame_id), str(video_id), now)]
                    call_count["frames"] += 1
                else:
                    mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            elif table_name == "labels":
                mock_result = MagicMock()
                if call_count["labels"] == 0:
                    mock_result.data = [
                        _mock_label(str(label_id), str(project_id), now)
                    ]
                    call_count["labels"] += 1
                else:
                    mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            elif table_name == "annotations":
                mock_result = MagicMock()
                if call_count["annotations"] == 0:
                    mock_result.data = [
                        _mock_annotation(
                            str(annotation_id), str(frame_id), str(label_id), now
                        )
                    ]
                    call_count["annotations"] += 1
                else:
                    mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            return table_mock

        mock_supabase.table.side_effect = table_side_effect

        response = client.get(f"/api/v1/projects/{project_id}/export/coco")
        assert response.status_code == 200

        data = response.json()

        # Verify images
        assert len(data["images"]) == 1
        assert data["images"][0]["id"] == 1
        assert data["images"][0]["file_name"] == "0000.jpg"
        assert data["images"][0]["width"] == 1920
        assert data["images"][0]["height"] == 1080

        # Verify categories
        assert len(data["categories"]) == 1
        assert data["categories"][0]["id"] == 1
        assert data["categories"][0]["name"] == "Test Label"

        # Verify annotations
        assert len(data["annotations"]) == 1
        ann = data["annotations"][0]
        assert ann["id"] == 1
        assert ann["image_id"] == 1
        assert ann["category_id"] == 1
        assert ann["bbox"] == [0.1 * 1920, 0.2 * 1080, 0.3 * 1920, 0.4 * 1080]
        assert ann["iscrowd"] == 0

    def test_export_coco_other_user_project(
        self,
        client_other_user: TestClient,
        mock_supabase: MagicMock,
    ) -> None:
        """Test that user cannot export from other user's project."""
        project_id = uuid4()

        # Project belongs to TEST_USER_ID, but client_other_user is OTHER_USER_ID
        mock_result = MagicMock()
        mock_result.data = []  # No project found for this owner
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        response = client_other_user.get(f"/api/v1/projects/{project_id}/export/coco")
        assert response.status_code == 404
