"""Tests for Label models."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.label import Label, LabelCreate, LabelUpdate


class TestLabel:
    """Tests for Label model."""

    def test_full_label(self) -> None:
        """Test Label with all fields."""
        now = datetime.now(tz=UTC)
        label = Label(
            id=uuid4(),
            project_id=uuid4(),
            name="Person",
            color="#00FF00",
            description="Human person",
            sort_order=1,
            created_at=now,
        )
        assert label.name == "Person"
        assert label.color == "#00FF00"

    def test_minimal_label(self) -> None:
        """Test Label with minimal fields."""
        now = datetime.now(tz=UTC)
        label = Label(
            id=uuid4(),
            project_id=uuid4(),
            name="Car",
            created_at=now,
        )
        assert label.color == "#FF0000"  # default
        assert label.sort_order == 0

    def test_color_validation_valid(self) -> None:
        """Test color format validation with valid colors."""
        now = datetime.now(tz=UTC)
        for color in ["#FF0000", "#00ff00", "#123ABC"]:
            label = Label(
                id=uuid4(),
                project_id=uuid4(),
                name="Test",
                color=color,
                created_at=now,
            )
            assert label.color == color

    def test_color_validation_invalid(self) -> None:
        """Test color format validation with invalid colors."""
        with pytest.raises(ValidationError):
            LabelCreate(project_id=uuid4(), name="Test", color="invalid")

        with pytest.raises(ValidationError):
            LabelCreate(project_id=uuid4(), name="Test", color="#FFF")  # too short

        with pytest.raises(ValidationError):
            LabelCreate(
                project_id=uuid4(), name="Test", color="#GGGGGG"
            )  # invalid chars


class TestLabelCreate:
    """Tests for LabelCreate schema."""

    def test_minimal_create(self) -> None:
        """Test minimal create."""
        create = LabelCreate(project_id=uuid4(), name="Label")
        assert create.name == "Label"
        assert create.color == "#FF0000"

    def test_full_create(self) -> None:
        """Test full create."""
        create = LabelCreate(
            project_id=uuid4(),
            name="Person",
            color="#00FF00",
            description="Human person",
            sort_order=5,
        )
        assert create.name == "Person"
        assert create.color == "#00FF00"
        assert create.sort_order == 5

    def test_name_required(self) -> None:
        """Test name is required."""
        with pytest.raises(ValidationError):
            LabelCreate(project_id=uuid4(), name=None)  # type: ignore[arg-type]

    def test_name_min_length(self) -> None:
        """Test name minimum length."""
        with pytest.raises(ValidationError):
            LabelCreate(project_id=uuid4(), name="")


class TestLabelUpdate:
    """Tests for LabelUpdate schema."""

    def test_partial_update(self) -> None:
        """Test partial update."""
        update = LabelUpdate(
            name="Updated",
            color=None,
            description=None,
            sort_order=None,
        )
        assert update.name == "Updated"
        assert update.color is None

    def test_empty_update(self) -> None:
        """Test empty update is valid."""
        update = LabelUpdate(
            name=None,
            color=None,
            description=None,
            sort_order=None,
        )
        assert update.name is None
        assert update.color is None

    def test_color_update(self) -> None:
        """Test color update."""
        update = LabelUpdate(
            name=None,
            color="#00FF00",
            description=None,
            sort_order=None,
        )
        assert update.color == "#00FF00"
