"""Tests for label CRUD operations."""

from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.crud.label import (
    LabelNotFoundError,
    create_label,
    delete_label,
    get_label,
    get_labels,
    update_label,
)
from app.models.label import LabelCreate, LabelUpdate


class TestCreateLabel:
    """Tests for create_label."""

    def test_create_minimal(self) -> None:
        """Test creating a label with minimal data."""
        project_id = uuid4()
        data = LabelCreate(project_id=project_id, name="Test Label")

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "name": "Test Label",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )

        label = create_label(mock_client, data)

        assert label.name == "Test Label"
        assert label.project_id == project_id
        mock_client.table.assert_called_once_with("labels")

    def test_create_with_all_fields(self) -> None:
        """Test creating a label with all fields."""
        project_id = uuid4()
        data = LabelCreate(
            project_id=project_id,
            name="Full Label",
            color="#00FF00",
            description="A label with all fields",
            sort_order=5,
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "name": "Full Label",
                "color": "#00FF00",
                "description": "A label with all fields",
                "sort_order": 5,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )

        label = create_label(mock_client, data)

        assert label.name == "Full Label"
        assert label.color == "#00FF00"
        assert label.description == "A label with all fields"
        assert label.sort_order == 5


class TestGetLabel:
    """Tests for get_label."""

    def test_get_existing_label(self) -> None:
        """Test getting an existing label."""
        label_id = uuid4()
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "Existing Label",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        label = get_label(mock_client, label_id, project_id)

        assert label.id == label_id
        assert label.name == "Existing Label"

    def test_get_nonexistent_label(self) -> None:
        """Test getting a label that doesn't exist."""
        label_id = uuid4()
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(LabelNotFoundError):
            get_label(mock_client, label_id, project_id)


class TestGetLabels:
    """Tests for get_labels."""

    def test_get_labels_empty(self) -> None:
        """Test getting labels when none exist."""
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        labels = get_labels(mock_client, project_id)

        assert labels == []

    def test_get_labels_with_data(self) -> None:
        """Test getting labels when some exist."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "name": "Label 1",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": now,
            },
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "name": "Label 2",
                "color": "#00FF00",
                "description": "Second label",
                "sort_order": 1,
                "created_at": now,
            },
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        labels = get_labels(mock_client, project_id)

        assert len(labels) == 2
        assert labels[0].name == "Label 1"
        assert labels[1].name == "Label 2"

    def test_get_labels_with_pagination(self) -> None:
        """Test getting labels with pagination."""
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        get_labels(mock_client, project_id, skip=10, limit=5)

        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value.range.assert_called_once_with(
            10, 14
        )


class TestUpdateLabel:
    """Tests for update_label."""

    def test_update_name(self) -> None:
        """Test updating label name."""
        label_id = uuid4()
        project_id = uuid4()
        data = LabelUpdate(
            name="Updated Name",
            color=None,
            description=None,
            sort_order=None,
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "Updated Name",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        label = update_label(mock_client, label_id, project_id, data)

        assert label.name == "Updated Name"

    def test_update_color(self) -> None:
        """Test updating label color."""
        label_id = uuid4()
        project_id = uuid4()
        data = LabelUpdate(
            name=None,
            color="#00FF00",
            description=None,
            sort_order=None,
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "Label",
                "color": "#00FF00",
                "description": None,
                "sort_order": 0,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        label = update_label(mock_client, label_id, project_id, data)

        assert label.color == "#00FF00"

    def test_update_nonexistent_label(self) -> None:
        """Test updating a label that doesn't exist."""
        label_id = uuid4()
        project_id = uuid4()
        data = LabelUpdate(
            name="Updated",
            color=None,
            description=None,
            sort_order=None,
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(LabelNotFoundError):
            update_label(mock_client, label_id, project_id, data)

    def test_update_empty_returns_existing(self) -> None:
        """Test that empty update returns existing label."""
        label_id = uuid4()
        project_id = uuid4()
        data = LabelUpdate(
            name=None,
            color=None,
            description=None,
            sort_order=None,
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "Existing",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        label = update_label(mock_client, label_id, project_id, data)

        assert label.name == "Existing"
        # Should not call update, only select
        mock_client.table.return_value.update.assert_not_called()


class TestDeleteLabel:
    """Tests for delete_label."""

    def test_delete_existing_label(self) -> None:
        """Test deleting an existing label."""
        label_id = uuid4()
        project_id = uuid4()

        mock_client = MagicMock()
        # Mock for get_label (existence check)
        mock_select_result = MagicMock()
        mock_select_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "To Delete",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_select_result

        # Mock for delete
        mock_delete_result = MagicMock()
        mock_delete_result.data = []
        mock_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = mock_delete_result

        result = delete_label(mock_client, label_id, project_id)

        assert result is True
        mock_client.table.return_value.delete.assert_called_once()

    def test_delete_nonexistent_label(self) -> None:
        """Test deleting a label that doesn't exist."""
        label_id = uuid4()
        project_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(LabelNotFoundError):
            delete_label(mock_client, label_id, project_id)
