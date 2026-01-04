"""Tests for annotation review CRUD operations."""

from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import uuid4

from app.crud.annotation import (
    bulk_approve_annotations,
    bulk_delete_annotations,
    get_project_annotation_stats,
    get_project_annotations,
)


class TestGetProjectAnnotations:
    """Tests for get_project_annotations."""

    def test_get_annotations_empty(self) -> None:
        """Test getting annotations when none exist."""
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        annotations = get_project_annotations(mock_client, project_id)

        assert annotations == []

    def test_get_annotations_with_data(self) -> None:
        """Test getting annotations when some exist."""
        project_id = uuid4()
        frame_id = uuid4()
        label_id = uuid4()
        video_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "frame_id": str(frame_id),
                "label_id": str(label_id),
                "bbox_x": 0.1,
                "bbox_y": 0.2,
                "bbox_width": 0.3,
                "bbox_height": 0.4,
                "confidence": 0.85,
                "source": "auto",
                "reviewed": False,
                "created_by": str(uuid4()),
                "created_at": now,
                "updated_at": now,
                "reviewed_by": None,
                "reviewed_at": None,
                "segmentation": None,
                "frames": {
                    "frame_number": 1,
                    "s3_key": "frames/1.jpg",
                    "thumbnail_s3_key": "thumbnails/1.jpg",
                    "video_id": str(video_id),
                },
                "labels": {
                    "name": "Person",
                    "color": "#FF0000",
                },
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        annotations = get_project_annotations(mock_client, project_id)

        assert len(annotations) == 1
        assert annotations[0].confidence == 0.85
        assert annotations[0].label_name == "Person"
        assert annotations[0].frame_number == 1

    def test_get_annotations_with_source_filter(self) -> None:
        """Test getting annotations with source filter."""
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []

        # Build the mock chain
        mock_query = MagicMock()
        mock_client.table.return_value.select.return_value.eq.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.range.return_value.execute.return_value = mock_result

        from app.models.annotation import AnnotationSource

        get_project_annotations(mock_client, project_id, source=AnnotationSource.AUTO)

        # Verify source filter was applied
        mock_query.eq.assert_called()

    def test_get_annotations_with_confidence_filter(self) -> None:
        """Test getting annotations with confidence filter."""
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []

        # Build the mock chain
        mock_query = MagicMock()
        mock_client.table.return_value.select.return_value.eq.return_value = mock_query
        mock_query.gte.return_value = mock_query
        mock_query.lte.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.range.return_value.execute.return_value = mock_result

        get_project_annotations(
            mock_client,
            project_id,
            min_confidence=0.5,
            max_confidence=0.9,
        )

        # Verify confidence filters were applied
        mock_query.gte.assert_called_with("confidence", 0.5)
        mock_query.lte.assert_called_with("confidence", 0.9)


class TestGetProjectAnnotationStats:
    """Tests for get_project_annotation_stats."""

    def test_get_stats_empty(self) -> None:
        """Test getting stats when no annotations exist."""
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_result

        stats = get_project_annotation_stats(mock_client, project_id)

        assert stats.total_count == 0
        assert stats.reviewed_count == 0
        assert stats.pending_count == 0
        assert stats.auto_count == 0
        assert stats.manual_count == 0

    def test_get_stats_with_data(self) -> None:
        """Test getting stats with annotations."""
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {"reviewed": True, "source": "auto"},
            {"reviewed": True, "source": "auto"},
            {"reviewed": False, "source": "auto"},
            {"reviewed": False, "source": "manual"},
            {"reviewed": True, "source": "manual"},
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_result

        stats = get_project_annotation_stats(mock_client, project_id)

        assert stats.total_count == 5
        assert stats.reviewed_count == 3
        assert stats.pending_count == 2
        assert stats.auto_count == 3
        assert stats.manual_count == 2


class TestBulkApproveAnnotations:
    """Tests for bulk_approve_annotations."""

    def test_bulk_approve_empty(self) -> None:
        """Test bulk approve with empty list."""
        mock_client = MagicMock()

        result = bulk_approve_annotations(mock_client, [], uuid4())

        assert result == 0
        mock_client.table.assert_not_called()

    def test_bulk_approve_success(self) -> None:
        """Test bulk approve success."""
        annotation_ids = [uuid4(), uuid4(), uuid4()]
        reviewer_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [{"id": str(aid)} for aid in annotation_ids]
        mock_client.table.return_value.update.return_value.in_.return_value.execute.return_value = mock_result

        result = bulk_approve_annotations(mock_client, annotation_ids, reviewer_id)

        assert result == 3
        mock_client.table.assert_called_with("annotations")

    def test_bulk_approve_partial(self) -> None:
        """Test bulk approve when only some annotations exist."""
        annotation_ids = [uuid4(), uuid4(), uuid4()]
        reviewer_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        # Only 2 of 3 annotations were updated
        mock_result.data = [
            {"id": str(annotation_ids[0])},
            {"id": str(annotation_ids[1])},
        ]
        mock_client.table.return_value.update.return_value.in_.return_value.execute.return_value = mock_result

        result = bulk_approve_annotations(mock_client, annotation_ids, reviewer_id)

        assert result == 2


class TestBulkDeleteAnnotations:
    """Tests for bulk_delete_annotations."""

    def test_bulk_delete_empty(self) -> None:
        """Test bulk delete with empty list."""
        mock_client = MagicMock()

        result = bulk_delete_annotations(mock_client, [])

        assert result == 0
        mock_client.table.assert_not_called()

    def test_bulk_delete_success(self) -> None:
        """Test bulk delete success."""
        annotation_ids = [uuid4(), uuid4()]

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [{"id": str(aid)} for aid in annotation_ids]
        mock_client.table.return_value.delete.return_value.in_.return_value.execute.return_value = mock_result

        result = bulk_delete_annotations(mock_client, annotation_ids)

        assert result == 2
        mock_client.table.assert_called_with("annotations")
