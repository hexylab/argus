"""Tests for project CRUD operations."""

from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.crud.project import (
    ProjectNotFoundError,
    create_project,
    delete_project,
    get_project,
    get_projects,
    update_project,
)
from app.models.project import ProjectCreate, ProjectStatus, ProjectUpdate


class TestCreateProject:
    """Tests for create_project."""

    def test_create_minimal(self) -> None:
        """Test creating a project with minimal data."""
        owner_id = uuid4()
        data = ProjectCreate(name="Test Project")

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "owner_id": str(owner_id),
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )

        project = create_project(mock_client, owner_id, data)

        assert project.name == "Test Project"
        assert project.owner_id == owner_id
        mock_client.table.assert_called_once_with("projects")

    def test_create_with_all_fields(self) -> None:
        """Test creating a project with all fields."""
        owner_id = uuid4()
        data = ProjectCreate(
            name="Full Project",
            description="A project with all fields",
            settings={"default_fps": 60.0},
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "owner_id": str(owner_id),
                "name": "Full Project",
                "description": "A project with all fields",
                "status": "active",
                "settings": {"default_fps": 60.0},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )

        project = create_project(mock_client, owner_id, data)

        assert project.name == "Full Project"
        assert project.description == "A project with all fields"
        assert project.settings.default_fps == 60.0


class TestGetProject:
    """Tests for get_project."""

    def test_get_existing_project(self) -> None:
        """Test getting an existing project."""
        project_id = uuid4()
        owner_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(project_id),
                "owner_id": str(owner_id),
                "name": "Existing Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        project = get_project(mock_client, project_id, owner_id)

        assert project.id == project_id
        assert project.name == "Existing Project"

    def test_get_nonexistent_project(self) -> None:
        """Test getting a project that doesn't exist."""
        project_id = uuid4()
        owner_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(ProjectNotFoundError):
            get_project(mock_client, project_id, owner_id)


class TestGetProjects:
    """Tests for get_projects."""

    def test_get_projects_empty(self) -> None:
        """Test getting projects when none exist."""
        owner_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        projects = get_projects(mock_client, owner_id)

        assert projects == []

    def test_get_projects_with_data(self) -> None:
        """Test getting projects when some exist."""
        owner_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "owner_id": str(owner_id),
                "name": "Project 1",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": str(uuid4()),
                "owner_id": str(owner_id),
                "name": "Project 2",
                "description": "Second project",
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            },
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        projects = get_projects(mock_client, owner_id)

        assert len(projects) == 2
        assert projects[0].name == "Project 1"
        assert projects[1].name == "Project 2"

    def test_get_projects_with_pagination(self) -> None:
        """Test getting projects with pagination."""
        owner_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result

        get_projects(mock_client, owner_id, skip=10, limit=5)

        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.assert_called_once_with(
            10, 14
        )


class TestUpdateProject:
    """Tests for update_project."""

    def test_update_name(self) -> None:
        """Test updating project name."""
        project_id = uuid4()
        owner_id = uuid4()
        data = ProjectUpdate(name="Updated Name")

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(project_id),
                "owner_id": str(owner_id),
                "name": "Updated Name",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        project = update_project(mock_client, project_id, owner_id, data)

        assert project.name == "Updated Name"

    def test_update_status(self) -> None:
        """Test updating project status."""
        project_id = uuid4()
        owner_id = uuid4()
        data = ProjectUpdate(
            name=None,
            description=None,
            status=ProjectStatus.ARCHIVED,
            settings=None,
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(project_id),
                "owner_id": str(owner_id),
                "name": "Project",
                "description": None,
                "status": "archived",
                "settings": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        project = update_project(mock_client, project_id, owner_id, data)

        assert project.status == ProjectStatus.ARCHIVED

    def test_update_nonexistent_project(self) -> None:
        """Test updating a project that doesn't exist."""
        project_id = uuid4()
        owner_id = uuid4()
        data = ProjectUpdate(name="Updated")

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(ProjectNotFoundError):
            update_project(mock_client, project_id, owner_id, data)

    def test_update_empty_returns_existing(self) -> None:
        """Test that empty update returns existing project."""
        project_id = uuid4()
        owner_id = uuid4()
        # All fields None
        data = ProjectUpdate(
            name=None,
            description=None,
            status=None,
            settings=None,
        )

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(project_id),
                "owner_id": str(owner_id),
                "name": "Existing",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        project = update_project(mock_client, project_id, owner_id, data)

        assert project.name == "Existing"
        # Should not call update, only select
        mock_client.table.return_value.update.assert_not_called()


class TestDeleteProject:
    """Tests for delete_project."""

    def test_delete_existing_project(self) -> None:
        """Test deleting an existing project."""
        project_id = uuid4()
        owner_id = uuid4()

        mock_client = MagicMock()
        # Mock for get_project (existence check)
        mock_select_result = MagicMock()
        mock_select_result.data = [
            {
                "id": str(project_id),
                "owner_id": str(owner_id),
                "name": "To Delete",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": datetime.now(tz=UTC).isoformat(),
                "updated_at": datetime.now(tz=UTC).isoformat(),
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_select_result

        # Mock for delete
        mock_delete_result = MagicMock()
        mock_delete_result.data = []
        mock_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = mock_delete_result

        result = delete_project(mock_client, project_id, owner_id)

        assert result is True
        mock_client.table.return_value.delete.assert_called_once()

    def test_delete_nonexistent_project(self) -> None:
        """Test deleting a project that doesn't exist."""
        project_id = uuid4()
        owner_id = uuid4()

        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

        with pytest.raises(ProjectNotFoundError):
            delete_project(mock_client, project_id, owner_id)
