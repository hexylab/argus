"""Tests for Project models."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.project import (
    Project,
    ProjectCreate,
    ProjectSettings,
    ProjectStatus,
    ProjectUpdate,
)


class TestProjectStatus:
    """Tests for ProjectStatus enum."""

    def test_values(self) -> None:
        """Test enum values."""
        assert ProjectStatus.ACTIVE.value == "active"
        assert ProjectStatus.ARCHIVED.value == "archived"
        assert ProjectStatus.DELETED.value == "deleted"


class TestProjectSettings:
    """Tests for ProjectSettings."""

    def test_defaults(self) -> None:
        """Test default values."""
        settings = ProjectSettings()
        assert settings.default_fps == 30.0
        assert settings.auto_annotation is False

    def test_custom_values(self) -> None:
        """Test custom values."""
        settings = ProjectSettings(default_fps=60.0, auto_annotation=True)
        assert settings.default_fps == 60.0
        assert settings.auto_annotation is True

    def test_extra_allowed(self) -> None:
        """Test extra fields are allowed."""
        settings = ProjectSettings(custom_field="value")  # type: ignore[call-arg]
        assert settings.custom_field == "value"  # type: ignore[attr-defined]


class TestProject:
    """Tests for Project model."""

    def test_full_project(self) -> None:
        """Test Project with all fields."""
        now = datetime.now(tz=UTC)
        project = Project(
            id=uuid4(),
            owner_id=uuid4(),
            name="My Project",
            description="Description",
            status=ProjectStatus.ACTIVE,
            settings=ProjectSettings(),
            created_at=now,
            updated_at=now,
        )
        assert project.name == "My Project"
        assert project.status == ProjectStatus.ACTIVE

    def test_minimal_project(self) -> None:
        """Test Project with minimal required fields."""
        now = datetime.now(tz=UTC)
        project = Project(
            id=uuid4(),
            owner_id=uuid4(),
            name="Minimal",
            created_at=now,
            updated_at=now,
        )
        assert project.name == "Minimal"
        assert project.description is None
        assert project.status == ProjectStatus.ACTIVE


class TestProjectCreate:
    """Tests for ProjectCreate schema."""

    def test_minimal_create(self) -> None:
        """Test minimal create."""
        create = ProjectCreate(name="New Project")
        assert create.name == "New Project"
        assert create.description is None

    def test_full_create(self) -> None:
        """Test full create with all fields."""
        create = ProjectCreate(
            name="New Project",
            description="A new project",
            settings={"default_fps": 60.0},
        )
        assert create.name == "New Project"
        assert create.description == "A new project"
        assert create.settings == {"default_fps": 60.0}

    def test_name_required(self) -> None:
        """Test name is required."""
        with pytest.raises(ValidationError):
            ProjectCreate()  # type: ignore[call-arg]

    def test_name_min_length(self) -> None:
        """Test name minimum length."""
        with pytest.raises(ValidationError):
            ProjectCreate(name="")


class TestProjectUpdate:
    """Tests for ProjectUpdate schema."""

    def test_partial_update(self) -> None:
        """Test partial update."""
        update = ProjectUpdate(name="Updated Name")
        assert update.name == "Updated Name"
        assert update.status is None

    def test_status_update(self) -> None:
        """Test status update."""
        update = ProjectUpdate(name=None, status=ProjectStatus.ARCHIVED)
        assert update.status == ProjectStatus.ARCHIVED

    def test_empty_update(self) -> None:
        """Test empty update is valid."""
        update = ProjectUpdate(name=None)
        assert update.name is None
        assert update.description is None
