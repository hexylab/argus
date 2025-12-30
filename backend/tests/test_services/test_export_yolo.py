"""Tests for YOLO export service."""

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock
from uuid import uuid4

from app.services.export.yolo import YOLOExporter
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


class TestYOLOExporter:
    """Tests for YOLOExporter class."""

    def test_export_empty_project(self) -> None:
        """Test exporting a project with no data."""
        mock_client = MagicMock()
        project_id = uuid4()

        # Mock empty results
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        exporter = YOLOExporter(mock_client)
        result = exporter.export_project(project_id)

        # Verify structure
        assert "data_yaml" in result
        assert "annotations" in result

        # Verify empty data
        assert result["data_yaml"] == "names:\nnc: 0\n"
        assert result["annotations"] == {}

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
        # bbox: x=0.1, y=0.2, w=0.3, h=0.4 -> center: 0.25, 0.4
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
        # bbox: x=0.5, y=0.5, w=0.2, h=0.2 -> center: 0.6, 0.6
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
                # Note: _get_all_annotations breaks after first call if len < limit,
                # so each frame only makes one call
                if count == 0:
                    mock_result.data = [annotation_data_1]  # Frame 1 annotation
                elif count == 1:
                    mock_result.data = [annotation_data_2]  # Frame 2 annotation
                else:
                    mock_result.data = []
                call_count["annotations"] += 1
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            return table_mock

        mock_client.table.side_effect = table_side_effect

        exporter = YOLOExporter(mock_client)
        result = exporter.export_project(project_id)

        # Verify data.yaml
        assert "names:" in result["data_yaml"]
        assert "0: person" in result["data_yaml"]
        assert "1: car" in result["data_yaml"]
        assert "nc: 2" in result["data_yaml"]

        # Verify annotations
        assert len(result["annotations"]) == 2
        assert "0000.txt" in result["annotations"]
        assert "0001.txt" in result["annotations"]

        # Verify annotation content for frame 1
        # bbox: x=0.1, y=0.2, w=0.3, h=0.4 -> center: 0.25, 0.4
        ann1 = result["annotations"]["0000.txt"]
        assert ann1.startswith("0 ")  # class_id 0 (person)
        parts = ann1.strip().split()
        assert parts[0] == "0"
        assert float(parts[1]) == 0.25  # center_x = 0.1 + 0.3/2
        assert float(parts[2]) == 0.4  # center_y = 0.2 + 0.4/2
        assert float(parts[3]) == 0.3  # width
        assert float(parts[4]) == 0.4  # height

        # Verify annotation content for frame 2
        # bbox: x=0.5, y=0.5, w=0.2, h=0.2 -> center: 0.6, 0.6
        ann2 = result["annotations"]["0001.txt"]
        assert ann2.startswith("1 ")  # class_id 1 (car)
        parts = ann2.strip().split()
        assert parts[0] == "1"
        assert float(parts[1]) == 0.6  # center_x = 0.5 + 0.2/2
        assert float(parts[2]) == 0.6  # center_y = 0.5 + 0.2/2

    def test_export_frame_with_no_annotations(self) -> None:
        """Test that frames with no annotations produce empty content."""
        mock_client = MagicMock()
        project_id = uuid4()
        video_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

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
                mock_result.data = []  # No annotations
                table_mock.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

            return table_mock

        mock_client.table.side_effect = table_side_effect

        exporter = YOLOExporter(mock_client)
        result = exporter.export_project(project_id)

        # Verify that the frame exists in annotations but with empty content
        assert "0000.txt" in result["annotations"]
        assert result["annotations"]["0000.txt"] == ""
