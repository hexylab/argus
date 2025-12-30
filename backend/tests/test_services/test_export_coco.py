"""Tests for COCO export service."""

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.services.export.coco import COCOExporter
from tests.conftest import TEST_USER_ID


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
        "frame_count": 2,
        "status": "ready",
        "error_message": None,
        "metadata": {},
        "created_at": now,
        "updated_at": now,
    }


def _mock_frame(
    frame_id: str, video_id: str, frame_number: int, now: str
) -> dict[str, Any]:
    """Create a mock frame result."""
    return {
        "id": frame_id,
        "video_id": video_id,
        "frame_number": frame_number,
        "timestamp_ms": frame_number * 33,
        "s3_key": f"frames/{frame_number:04d}.jpg",
        "thumbnail_s3_key": f"frames/{frame_number:04d}_thumb.jpg",
        "width": 1920,
        "height": 1080,
        "embedding": None,
        "created_at": now,
    }


def _mock_label(label_id: str, project_id: str, name: str, now: str) -> dict[str, Any]:
    """Create a mock label result."""
    return {
        "id": label_id,
        "project_id": project_id,
        "name": name,
        "color": "#FF0000",
        "description": None,
        "sort_order": 0,
        "created_at": now,
    }


def _mock_annotation(
    annotation_id: str,
    frame_id: str,
    label_id: str,
    bbox_x: float,
    bbox_y: float,
    bbox_width: float,
    bbox_height: float,
    now: str,
) -> dict[str, Any]:
    """Create a mock annotation result."""
    return {
        "id": annotation_id,
        "frame_id": frame_id,
        "label_id": label_id,
        "bbox_x": bbox_x,
        "bbox_y": bbox_y,
        "bbox_width": bbox_width,
        "bbox_height": bbox_height,
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


class TestCOCOExporter:
    """Tests for COCOExporter class."""

    def test_export_empty_project(self) -> None:
        """Test exporting a project with no data."""
        mock_client = MagicMock()
        project_id = uuid4()

        # Mock empty results
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        exporter = COCOExporter(mock_client)
        result = exporter.export_project(project_id)

        # Verify structure
        assert "info" in result
        assert "licenses" in result
        assert "images" in result
        assert "annotations" in result
        assert "categories" in result

        # Verify empty data
        assert result["images"] == []
        assert result["annotations"] == []
        assert result["categories"] == []
        assert result["licenses"] == []

        # Verify info
        assert result["info"]["description"] == "Exported from Argus"
        assert result["info"]["version"] == "1.0"

    def test_export_project_with_data(self) -> None:
        """Test exporting a project with videos, frames, labels, and annotations."""
        mock_client = MagicMock()
        project_id = uuid4()
        video_id = uuid4()
        frame_id_1 = uuid4()
        frame_id_2 = uuid4()
        label_id_1 = uuid4()
        label_id_2 = uuid4()
        annotation_id_1 = uuid4()
        annotation_id_2 = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        # Prepare mock data
        video_data = _mock_video(str(video_id), str(project_id), now)
        frame_data_1 = _mock_frame(str(frame_id_1), str(video_id), 0, now)
        frame_data_2 = _mock_frame(str(frame_id_2), str(video_id), 1, now)
        label_data_1 = _mock_label(str(label_id_1), str(project_id), "person", now)
        label_data_2 = _mock_label(str(label_id_2), str(project_id), "car", now)
        annotation_data_1 = _mock_annotation(
            str(annotation_id_1),
            str(frame_id_1),
            str(label_id_1),
            0.1,
            0.2,
            0.3,
            0.4,
            now,
        )
        annotation_data_2 = _mock_annotation(
            str(annotation_id_2),
            str(frame_id_2),
            str(label_id_2),
            0.5,
            0.5,
            0.2,
            0.2,
            now,
        )

        # Set up mock responses
        call_count: dict[str, int] = {
            "videos": 0,
            "frames": 0,
            "labels": 0,
            "annotations": 0,
        }

        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "videos":
                mock_result = MagicMock()
                if call_count["videos"] == 0:
                    mock_result.data = [video_data]
                    call_count["videos"] += 1
                else:
                    mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            elif table_name == "frames":
                mock_result = MagicMock()
                if call_count["frames"] == 0:
                    mock_result.data = [frame_data_1, frame_data_2]
                    call_count["frames"] += 1
                else:
                    mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            elif table_name == "labels":
                mock_result = MagicMock()
                if call_count["labels"] == 0:
                    mock_result.data = [label_data_1, label_data_2]
                    call_count["labels"] += 1
                else:
                    mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            elif table_name == "annotations":
                mock_result = MagicMock()
                count = call_count["annotations"]
                if count == 0:
                    mock_result.data = [annotation_data_1]
                elif count == 1:
                    mock_result.data = [annotation_data_2]
                elif count == 2:
                    mock_result.data = []  # End of frame 1 annotations
                elif count == 3:
                    mock_result.data = []  # End of frame 2 annotations
                else:
                    mock_result.data = []
                call_count["annotations"] += 1
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            return table_mock

        mock_client.table.side_effect = table_side_effect

        exporter = COCOExporter(mock_client)
        result = exporter.export_project(project_id)

        # Verify images
        assert len(result["images"]) == 2
        assert result["images"][0]["id"] == 1
        assert result["images"][0]["file_name"] == "0000.jpg"
        assert result["images"][0]["width"] == 1920
        assert result["images"][0]["height"] == 1080
        assert result["images"][1]["id"] == 2

        # Verify categories
        assert len(result["categories"]) == 2
        assert result["categories"][0]["id"] == 1
        assert result["categories"][0]["name"] == "person"
        assert result["categories"][1]["id"] == 2
        assert result["categories"][1]["name"] == "car"

        # Verify annotations
        assert len(result["annotations"]) == 2

        # First annotation
        ann1 = result["annotations"][0]
        assert ann1["id"] == 1
        assert ann1["image_id"] == 1
        assert ann1["category_id"] == 1
        # bbox: [x * width, y * height, w * width, h * height]
        assert ann1["bbox"] == [0.1 * 1920, 0.2 * 1080, 0.3 * 1920, 0.4 * 1080]
        assert ann1["area"] == 0.3 * 1920 * 0.4 * 1080
        assert ann1["iscrowd"] == 0

        # Second annotation
        ann2 = result["annotations"][1]
        assert ann2["id"] == 2
        assert ann2["image_id"] == 2
        assert ann2["category_id"] == 2

    def test_export_with_segmentation(self) -> None:
        """Test exporting annotations with segmentation data."""
        mock_client = MagicMock()
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()
        annotation_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        # Annotation with segmentation
        annotation_data = _mock_annotation(
            str(annotation_id),
            str(frame_id),
            str(label_id),
            0.1,
            0.1,
            0.2,
            0.2,
            now,
        )
        # Add segmentation (normalized coordinates)
        annotation_data["segmentation"] = [[0.1, 0.1, 0.3, 0.1, 0.3, 0.3, 0.1, 0.3]]

        call_count: dict[str, int] = {
            "videos": 0,
            "frames": 0,
            "labels": 0,
            "annotations": 0,
        }

        def table_side_effect(table_name: str) -> MagicMock:
            table_mock = MagicMock()

            if table_name == "videos":
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
                    mock_result.data = [
                        _mock_frame(str(frame_id), str(video_id), 0, now)
                    ]
                    call_count["frames"] += 1
                else:
                    mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            elif table_name == "labels":
                mock_result = MagicMock()
                if call_count["labels"] == 0:
                    mock_result.data = [
                        _mock_label(str(label_id), str(project_id), "person", now)
                    ]
                    call_count["labels"] += 1
                else:
                    mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            elif table_name == "annotations":
                mock_result = MagicMock()
                if call_count["annotations"] == 0:
                    mock_result.data = [annotation_data]
                    call_count["annotations"] += 1
                else:
                    mock_result.data = []
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            return table_mock

        mock_client.table.side_effect = table_side_effect

        exporter = COCOExporter(mock_client)
        result = exporter.export_project(project_id)

        # Verify segmentation is converted to absolute coordinates
        assert len(result["annotations"]) == 1
        seg = result["annotations"][0]["segmentation"]
        assert len(seg) == 1
        # Check first polygon: [x1*w, y1*h, x2*w, y2*h, ...]
        expected = [
            0.1 * 1920,
            0.1 * 1080,
            0.3 * 1920,
            0.1 * 1080,
            0.3 * 1920,
            0.3 * 1080,
            0.1 * 1920,
            0.3 * 1080,
        ]
        assert seg[0] == pytest.approx(expected)
